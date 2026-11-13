services:
<#list project.services as svc>
  ${svc.name?lower_case?replace("[^a-z0-9]","-",'r')}:
    build:
      context: ./${svc.name?lower_case?replace("[^a-z0-9]","-",'r')}
<#if !(composeShells![])?has_content>
    ports:
      - "${(svc.port!8080)?c}:${(svc.port!8080)?c}"
</#if>
    # until postgres and kafka answer, a service fails to start: compose starts it again
    restart: on-failure
    environment:
      SPRING_PROFILES_ACTIVE: docker
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${svc.name?lower_case?replace("[^a-z0-9]","_",'r')}
      SPRING_DATASOURCE_USERNAME: user_app
      SPRING_DATASOURCE_PASSWORD: user_password
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
<#if mail!false>
      MAIL_HOST: mailpit
      MAIL_PORT: "1025"
<#list notifyRoles![] as r>
      # who the notifications to ${r} go to (comma-separated); locally, a mailbox in Mailpit
      NOTIFY_${r}: ${r"${"}NOTIFY_${r}:-${r?lower_case}@${project.name?lower_case?replace("[^a-z0-9]","",'r')}.local}
</#list>
</#if>
<#if procesos??>
      # the workflow engine calls the use cases as user «sistema» (role SISTEMA) with this password
      MODUX_SYSTEM_PASSWORD: ${r"${"}MODUX_SYSTEM_PASSWORD:-sistema-local${r"}"}
</#if>
<#list (gatewayEnvs[svc.name]![]) as ge>
      ${ge.envName}: ${ge.url}
</#list>
<#-- where its siblings answer: a use case may call another service's over REST -->
<#list project.services?filter(o -> o.name != svc.name) as o>
      ${o.name?upper_case?replace("[^A-Z0-9]","_",'r')}_URL: http://${o.name?lower_case?replace("[^a-z0-9]","-",'r')}:${(o.port!8080)?c}
</#list>
<#if localIdp??>
      # the browser meets keycloak at localhost:8080 (the tokens' issuer); the service, inside the network
      MODUX_IDP_BACKCHANNEL: http://keycloak:8080/realms/${localIdp.realm}
</#if>
<#-- where the external systems it calls answer: override with the variable of the same name -->
<#list (externalUrls![]) as x>
      ${x.envName}: ${r"${"}${x.envName}:-${x.url}${r"}"}
</#list>
<#-- a legacy table a projection polls: where it is and who reads it, from the environment -->
<#list (externalJdbcEnvs![]) as j>
      ${j}: ${r"${"}${j}:-${r"}"}
</#list>
<#if (externalUrls![])?has_content || (externalJdbcEnvs![])?has_content>
    extra_hosts:
      - "host.docker.internal:host-gateway"
</#if>
    depends_on:
      postgres-databases:
        condition: service_completed_successfully
      kafka:
        condition: service_started

</#list>
<#if (composeShells![])?has_content>
  # the front door: shell and remote apps, entered at http://localhost:8088
  gateway:
    build:
      context: ./gateway
    ports:
      - "8088:8088"
    environment:
<#list project.services as svc>
      ${svc.name?upper_case?replace("[^A-Z0-9]","_",'r')}_URL: http://${svc.name?lower_case?replace("[^a-z0-9]","-",'r')}:${(svc.port!8080)?c}
</#list>
<#list composeShells as sh>
      SHELL_URL: http://${sh}:8100
</#list>
<#if procesos?? && procesos.formsImage??>
      FORMS_URL: http://formularios:8106
</#if>
<#list composeShells as sh>

  ${sh}:
    build:
      context: ./${sh}
    environment:
      MATEU_SELF_BASE_URL: http://gateway:8088
<#if localIdp??>
      MODUX_IDP_BACKCHANNEL: http://keycloak:8080/realms/${localIdp.realm}
</#if>
</#list>

</#if>
<#if procesos??>
  # The model's workflows run on EventConductor's orchestrator, as is: the definitions and its
  # configuration (topics, connections to the services) are generated into ./procesos. Its console
  # answers at http://localhost:8105 (user admin). EC_ORCHESTRATOR_IMAGE runs another build.
  procesos:
    image: ${r"${"}EC_ORCHESTRATOR_IMAGE:-${procesos.image}${r"}"}
    restart: on-failure
    labels:
      # the generated definitions it mounts: a new hash recreates it on the next deploy
      modux.definitions: "${procesos.definitionsHash}"
    environment:
      SERVER_PORT: "8105"
      WORKFLOW_MODE: kafka
      WORKFLOW_PERSISTENCE: jpa
      KAFKA_BROKERS: kafka:9092
      DB_URL: jdbc:postgresql://postgres:5432/procesos
      DB_USERNAME: user_app
      DB_PASSWORD: user_password
      DDL_AUTO: update
      WORKFLOW_DEFINITIONS_DIRS: /workflows
      SPRING_CONFIG_ADDITIONAL_LOCATION: optional:file:/config/
      SECURITY_USER: admin
      SECURITY_PASSWORD: ${r"${"}EC_ADMIN_PASSWORD:-admin${r"}"}
      MODUX_SYSTEM_PASSWORD: ${r"${"}MODUX_SYSTEM_PASSWORD:-sistema-local${r"}"}
<#list procesos.connections as c>
      ${c.envName}: ${c.url}
</#list>
    volumes:
      - ./procesos/workflows:/workflows:ro
      - ./procesos/config:/config:ro
    ports:
      - "8105:8105"
    depends_on:
      postgres-databases:
        condition: service_completed_successfully
      kafka:
        condition: service_started

<#if procesos.formsImage??>
  # The people's tasks: EventConductor's forms app, with the forms of the human steps generated
  # into ./procesos/forms. Only behind the gateway (/_forms, the shell's «Tareas»), which tells it
  # who is signed in; that is why its own login is off and the forwarded identity is trusted.
  formularios:
    image: ${r"${"}EC_FORMS_IMAGE:-${procesos.formsImage}${r"}"}
    restart: on-failure
    labels:
      modux.definitions: "${procesos.definitionsHash}"
    environment:
      SERVER_PORT: "8106"
      WORKFLOW_MODE: kafka
      WORKFLOW_PERSISTENCE: jpa
      FORMS_PERSISTENCE: jpa
      KAFKA_BROKERS: kafka:9092
      DB_URL: jdbc:postgresql://postgres:5432/procesos
      DB_USERNAME: user_app
      DB_PASSWORD: user_password
      DDL_AUTO: update
      FORMS_DEFINITIONS_DIRS: /forms
      SECURITY_ENABLED: "false"
      WORKFLOW_SECURITY_TRUST_FORWARDED_TOKEN: "true"
    volumes:
      - ./procesos/forms:/forms:ro
    depends_on:
      postgres-databases:
        condition: service_completed_successfully
      kafka:
        condition: service_started

</#if>
</#if>
<#if localIdp??>
  # the model's identity provider, on this machine: its realm (roles, one user per role, the
  # clients of the shell and the apps) is imported from ./keycloak on start
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: start-dev --import-realm
    ports:
      - "8080:8080"
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
      # one issuer whoever asks: the browser at localhost, the services at keycloak:8080
      KC_HOSTNAME: http://localhost:8080
      KC_HOSTNAME_BACKCHANNEL_DYNAMIC: "true"
    volumes:
      - ./keycloak:/opt/keycloak/data/import:ro

</#if>
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user_app
      POSTGRES_PASSWORD: user_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # One database per service, created on first boot by the generated init script.
      - ./postgres-init:/docker-entrypoint-initdb.d:ro

  # The init script runs on the volume's first boot only: a service added later would find no
  # database. This one-shot creates whichever is missing on every start.
  postgres-databases:
    image: postgres:16-alpine
    depends_on:
      - postgres
    environment:
      PGHOST: postgres
      PGUSER: user_app
      PGPASSWORD: user_password
      PGDATABASE: postgres
    entrypoint: ["sh", "-c"]
    command:
      - |
        until pg_isready -q; do sleep 1; done
<#assign dbs = project.services?map(s -> s.name?lower_case?replace("[^a-z0-9]","_",'r'))>
<#if procesos??><#assign dbs = dbs + ["procesos"]></#if>
<#list dbs as db>
        psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1 || psql -c "CREATE DATABASE ${db}"
</#list>

<#if mail!false>
  # Local email: every email the system sends lands here — http://localhost:8025
  mailpit:
    image: axllent/mailpit:v1.21
    ports:
      - "8025:8025"
      - "1025:1025"

</#if>
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.1
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.6.1
    depends_on:
      - zookeeper
    # Dual listener: services inside the compose network reach the broker at kafka:9092;
    # apps running on the host (local profile) use localhost:29092 — the advertised
    # address of each listener must be resolvable by ITS clients or they hang after the
    # first metadata response.
    ports:
      - "29092:29092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:29092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

volumes:
  postgres_data:
