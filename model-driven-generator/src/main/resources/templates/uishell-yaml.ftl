server:
  port: ${r"${SHELL_PORT:8100}"}
  # behind the gateway: a redirect (the login) must not name this container's host
  tomcat:
    use-relative-redirects: true

spring:
  application:
    name: ${shell.name?lower_case?replace("[^a-z0-9]","-",'r')}
<#if idp??>
<#assign backchannel = r"${MODUX_IDP_BACKCHANNEL:" + idp.issuer + "}">
  # People sign in at the model's identity provider (${idp.name}): OIDC login, a public client
  # with PKCE. The shell then issues the system's own cookie (ModuxAuthCookie) — every app behind
  # the gateway accepts it. The browser reaches the IdP at its issuer; the shell, at
  # MODUX_IDP_BACKCHANNEL when it sees it under another name (keycloak:8080 inside compose).
  security:
    oauth2:
      client:
        registration:
          modux:
            client-id: shell
            client-authentication-method: none
            authorization-grant-type: authorization_code
            scope: openid,profile,email
            redirect-uri: ${r"${MODUX_PUBLIC_URL:http://localhost:8088}"}/login/oauth2/code/modux
        provider:
          modux:
            authorization-uri: ${idp.issuer}/protocol/openid-connect/auth
            token-uri: ${backchannel}/protocol/openid-connect/token
            jwk-set-uri: ${backchannel}/protocol/openid-connect/certs
            user-info-uri: ${backchannel}/protocol/openid-connect/userinfo
            user-name-attribute: preferred_username
</#if>

# A reload or a link to a screen of a remote app is resolved here, asking each remote for its menu.
# The remotes are declared relative (/_app), and those routes live in the API gateway, not in this
# server: resolved against itself, every remote answered 404 and the link showed "Page not found".
mateu:
  self-base-url: ${r"${MATEU_SELF_BASE_URL:http://localhost:8088}"}

logging:
  level:
    org.springframework.security: INFO
