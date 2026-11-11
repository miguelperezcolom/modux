<#assign useFlyway = (project.dbMigrationTool!'Flyway') != 'None'>
server:
    port: ${(service.port!8080)?c}
    # behind the gateway: a redirect (the login) must not name this container's host
    tomcat:
        use-relative-redirects: true

spring:
    application:
        name: ${service.name?lower_case?replace(" ","-")}
    # A rejected request says why (a business rule's message), not just its status. (Boot 4 reads
    # it here; server.error.* no longer reaches the MVC error controller.)
    web:
        error:
            include-message: always
<#if idp??>

    # The JWT resource server (machine paths: /mateu/**, /mcp): tokens from the model's
    # identity provider (${idp.name}) validate — the same keycloak the shell and every
    # app log into, so remote menus and cross-service calls authenticate. jwk-set-uri
    # (not issuer discovery) keeps startup independent of the IdP being reachable.
    security:
        oauth2:
            resourceserver:
                jwt:
                    issuer-uri: ${idp.issuer}
                    jwk-set-uri: ${idp.issuer}/protocol/openid-connect/certs
</#if>

    datasource:
        url: jdbc:postgresql://127.0.0.1:5432/${service.name?lower_case?replace(" ","_")}
        username: user_app
        password: user_password
        driver-class-name: org.postgresql.Driver

    hikari:
        connection-timeout: 20000
        maximum-pool-size: 10

<#if useFlyway>
    # Schema is owned by Flyway migrations (src/main/resources/db/migration). Hibernate only
    # validates that the entities match the migrated schema — it never mutates it.
    # db/migration-pg holds Postgres-only artifacts (stored procedures); the local profile
    # does not load that location (H2 would not parse them — the JDBC fallback covers it).
    flyway:
        enabled: true
        baseline-on-migrate: true
        locations: classpath:db/migration,classpath:db/migration-pg

</#if>
    jpa:
        database-platform: org.hibernate.dialect.PostgreSQLDialect
        hibernate:
            ddl-auto: ${useFlyway?then('validate', 'update')}
        show-sql: true
        properties:
            hibernate:
                format_sql: true

    cloud:
<#if consumers?has_content>
        function:
            definition: <#list consumers as c>${c.function}<#sep>;</#sep></#list>
</#if>
        stream:
<#if consumers?has_content>
            bindings:
<#list consumers as c>
                ${c.function}-in-0:
                    destination: ${c.topic}
                    group: ${c.group}
</#list>
</#if>
            kafka:
                binder:
                    # One source of truth for the broker address: the docker profile overrides
                    # spring.kafka.bootstrap-servers via env and the binder follows it.
                    brokers: ${r"${spring.kafka.bootstrap-servers}"}
                    auto-create-topics: true

    kafka:
        # Host-run default: the compose kafka publishes its host listener on 29092.
        bootstrap-servers: localhost:29092
        consumer:
            group-id: ${service.name?lower_case?replace(" ","-")}-group
            auto-offset-reset: earliest
            key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
            value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
        producer:
            key-serializer: org.apache.kafka.common.serialization.StringSerializer
            value-serializer: org.apache.kafka.common.serialization.ByteArraySerializer

logging:
    level:
        org.hibernate.SQL: DEBUG
        org.springframework.kafka: INFO

---
# Local profile: H2 in-memory database. Kafka/stream stays auto-configured (so beans like
# StreamBridge are available), but with no broker reachable the consumers must not start and
# the broker-metadata calls must fail fast — otherwise startup blocks on endless admin retries
# before ever reaching «Started».
spring:
    config:
        activate:
            on-profile: local
    datasource:
        url: jdbc:h2:mem:${service.name?lower_case?replace(" ","_")?replace("-","_")};DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE<#if useFlyway>;MODE=PostgreSQL</#if>
        username: sa
        password:
        driver-class-name: org.h2.Driver
<#if useFlyway>
    # Run the same Flyway migrations against the in-memory H2 (PostgreSQL compatibility mode), so a
    # local boot exercises the real schema. Hibernate does not touch DDL here.
    flyway:
        enabled: true
        locations: classpath:db/migration
</#if>
    jpa:
        database-platform: org.hibernate.dialect.H2Dialect
        hibernate:
            ddl-auto: ${useFlyway?then('validate', 'create-drop')}
        open-in-view: false
    h2:
        console:
            enabled: true
    cloud:
        function:
            # No broker in local: no consumer functions are created, so no binding ever blocks
            # startup on broker-metadata retries. StreamBridge still produces on demand.
            definition: ""
        stream:
            kafka:
                binder:
                    auto-create-topics: false
                    configuration:
                        # Fail fast when no broker is reachable: the default retries (effectively
                        # infinite) froze startup for minutes on the admin metadata calls.
                        default.api.timeout.ms: 5000
                        request.timeout.ms: 3000
                        retries: 1
                        retry.backoff.ms: 500
