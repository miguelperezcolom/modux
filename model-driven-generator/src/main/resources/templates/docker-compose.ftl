version: "3.8"

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
<#list (gatewayEnvs[svc.name]![]) as ge>
      ${ge.envName}: ${ge.url}
</#list>
    depends_on:
      - postgres
      - kafka

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
<#list composeShells as sh>

  ${sh}:
    build:
      context: ./${sh}
    environment:
      MATEU_SELF_BASE_URL: http://gateway:8088
</#list>

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
