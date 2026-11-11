<#-- The local keycloak container (and its client provisioning) only makes sense when
     the model's IdP IS a local keycloak; an external IdP is assumed to exist already. -->
<#assign localIdp = idp?? && idp.url?contains("localhost")>
#!/bin/sh
# ${project.name} — up.sh (GENERADO por modux; se regenera con el modelo)
# Levanta el sistema completo en local: infra (postgres + kafka<#if localIdp> + keycloak</#if>),
# una base de datos por servicio, los servicios en sus puertos declarados<#if shells?has_content> y la shell</#if>.
# Idempotente: los contenedores se recrean y las bases solo se crean si faltan.
# Todo arranca con los defaults del código generado — sin overrides.
set -e

PRE="${project.name?lower_case?replace("[^a-z0-9]","-",'r')}"

echo "==> infra: postgres + kafka<#if localIdp> + keycloak</#if>"
docker rm -f $PRE-postgres $PRE-kafka <#if localIdp>$PRE-keycloak </#if>>/dev/null 2>&1 || true
docker run -d --name $PRE-postgres \
  -e POSTGRES_USER=user_app -e POSTGRES_PASSWORD=user_password \
  -p 5432:5432 postgres:16-alpine > /dev/null
docker run -d --name $PRE-kafka -p 29092:9092 \
  -e KAFKA_NODE_ID=1 -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:29092 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  apache/kafka:3.8.0 > /dev/null
<#if localIdp>
docker run -d --name $PRE-keycloak -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v "$PWD/keycloak:/opt/keycloak/data/import:ro" \
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm > /dev/null
</#if>

echo "==> esperando a postgres"
until docker exec $PRE-postgres pg_isready -U user_app > /dev/null 2>&1; do sleep 1; done
<#if localIdp>

echo "==> keycloak: el realm ${idp.realm} (roles, un usuario por rol y los clientes) se importa al arrancar"
until curl -sf ${idp.issuer}/.well-known/openid-configuration > /dev/null 2>&1; do sleep 2; done
</#if>

<#list services as s>
docker exec $PRE-postgres psql -U user_app -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${s.db}'" | grep -q 1 \
  || docker exec $PRE-postgres psql -U user_app -d postgres -c "CREATE DATABASE \"${s.db}\""
</#list>

<#list services as s>
echo "==> ${s.name} (:${s.port?c})"
if [ ! -f ${s.name}/${s.name}-app/target/${s.name}-app-0.0.1-SNAPSHOT.jar ]; then
  (cd ${s.name} && mvn -q -DskipTests package > /dev/null)
fi
java -jar ${s.name}/${s.name}-app/target/${s.name}-app-0.0.1-SNAPSHOT.jar > .up-${s.name}.log 2>&1 &

</#list>
<#list shells as sh>
echo "==> ${sh.slug} (shell, :8100)"
if [ ! -f ${sh.slug}/target/${sh.slug}-0.0.1-SNAPSHOT.jar ]; then
  (cd ${sh.slug} && mvn -q -DskipTests package > /dev/null)
fi
java -jar ${sh.slug}/target/${sh.slug}-0.0.1-SNAPSHOT.jar > .up-${sh.slug}.log 2>&1 &

</#list>
<#if shells?has_content>
echo "==> api gateway (:8088)"
if [ ! -f gateway/target/${r"${PRE}"}-api-gateway-1.0.0.jar ]; then
  (cd gateway && mvn -q -DskipTests package > /dev/null)
fi
java -jar gateway/target/${r"${PRE}"}-api-gateway-1.0.0.jar > .up-gateway.log 2>&1 &

</#if>

echo "==> esperando a que arranquen los servicios"
wait_started() {
  i=0
  while [ $i -lt 90 ]; do
    grep -q "Started .*Application" ".up-$1.log" 2>/dev/null && return 0
    i=$((i + 1))
    sleep 2
  done
  echo "!! $1 no arrancó — mira .up-$1.log"
  return 1
}
<#list services as s>
wait_started ${s.name}
</#list>
<#list shells as sh>
wait_started ${sh.slug}
</#list>
<#if shells?has_content>
wait_started gateway
</#if>

cat <<EOF

Sistema arriba:
<#list services as s>
  ${s.name} → http://localhost:${s.port?c}
</#list>
<#list shells as sh>
  ${sh.slug} (shell) → http://localhost:8100
</#list>
<#if shells?has_content>
  api gateway → http://localhost:8088 (la shell y los menús remotos se usan desde aquí)
</#if>
<#if localIdp>
  keycloak → ${idp.url} (admin/admin); un usuario por rol, con su nombre como contraseña
  Nota: los menús remotos de la shell se resuelven a través del api gateway o del ingress —
  cada app también se abre directa en su puerto.
</#if>

Para pararlo todo: ./down.sh
EOF
