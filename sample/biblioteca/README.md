# Biblioteca

Sistema de ejemplo construido de principio a fin con el plugin de IntelliJ, siguiendo la spec
[`docs/specs/biblioteca-prestamos.md`](../../docs/specs/biblioteca-prestamos.md): catálogo y socios,
préstamos, devoluciones, retrasos con un disparador diario y avisos en un servicio aparte.

| Qué | Dónde |
|---|---|
| El modelo | `.modux/` (un fichero por elemento) |
| La vista, para abrirla en el plugin | `biblioteca.modux-view.yaml` |
| Las reglas de negocio (zona custom, nunca se regenera) | `generated/*/*-custom/src/` |

## Generar y desplegar

```bash
mvn modux:validate
mvn modux:generate
(cd generated/biblioteca && mvn -q install -DskipTests)
(cd generated/avisos && mvn -q install -DskipTests)
(cd generated && sh up.sh)     # Postgres y Kafka en Docker; servicios en :8080 y :8081
```

Sin Docker, un servicio arranca solo con H2 y los eventos van al log:
`java -jar generated/biblioteca/biblioteca-app/target/biblioteca-app-0.0.1-SNAPSHOT.jar --spring.profiles.active=local`.

## Probarlo

**En el navegador:** abre http://localhost:8080. El Mostrador tiene Prestar, Devolver, Libros, Socios
y Préstamos. Los tests de esas pantallas se lanzan con el sistema arrancado:
`(cd generated/biblioteca/prestamos && mvn test -Dgroups=e2e)`.

**Por API:**

```bash
B=http://localhost:8080; J='Content-Type: application/json'
curl -X POST $B/libro -H "$J" -d '{"isbn":"i1","titulo":"Niebla","autor":"Unamuno","estado":"DISPONIBLE"}'
curl -X POST $B/socio -H "$J" -d '{"carnet":"S-1","nombre":"Ana","email":"ana@example.com","estado":"ACTIVO"}'
curl -X POST $B/v1/prestarlibro -H "$J" -d '{"libroId":"1","socioId":"1"}'
curl -X POST $B/v1/devolverlibro -H "$J" -d '{"libroId":"1"}'
curl "$B/prestamo?search=retrasado"
```

El disparador de retrasos corre a las 06:00; para verlo actuar, arranca con
`DIARIORETRASOS_CRON="*/5 * * * * *" sh up.sh` y da de alta por `POST /prestamo` un préstamo ya vencido:
aparece como `RETRASADO` y el servicio Avisos registra el aviso en su propia base de datos.
