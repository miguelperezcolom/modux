server:
  port: ${r"${SHELL_PORT:8100}"}

spring:
  application:
    name: ${shell.name?lower_case?replace("[^a-z0-9]","-",'r')}
<#if idp??>
  # The shell validates the keycloak JWT the Mateu frontend (keycloak.js) sends on
  # every sync after login, and propagates it to the services on remote-menu fetches.
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ${idp.issuer}/protocol/openid-connect/certs
          issuer-uri: ${idp.issuer}
</#if>

# A reload or a link to a screen of a remote app is resolved here, asking each remote for its menu.
# The remotes are declared relative (/_app), and those routes live in the API gateway, not in this
# server: resolved against itself, every remote answered 404 and the link showed "Page not found".
mateu:
  self-base-url: ${r"${MATEU_SELF_BASE_URL:http://localhost:8088}"}

logging:
  level:
    org.springframework.security: INFO
