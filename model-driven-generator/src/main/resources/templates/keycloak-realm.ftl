{
  "realm": "${idp.realm?json_string}",
  "enabled": true,
  "displayName": "${project.name?json_string}",
  "roles": {
    "realm": [
<#list roles as r>
      { "name": "${r?json_string}" }<#sep>,</#sep>
</#list>
    ]
  },
  "users": [
<#list roles as r>
    {
      "username": "${r?lower_case?replace("[^a-z0-9]","",'r')}",
      "enabled": true,
      "emailVerified": true,
      "firstName": "${r?lower_case?cap_first?json_string}",
      "lastName": "${project.name?json_string}",
      "email": "${r?lower_case?replace("[^a-z0-9]","",'r')}@example.com",
      "credentials": [{ "type": "password", "value": "${r?lower_case?replace("[^a-z0-9]","",'r')}", "temporary": false }],
      "realmRoles": ["${r?json_string}"]
    }<#sep>,</#sep>
</#list>
  ],
  "clients": [
<#if hasShell>
    {
      "clientId": "shell",
      "publicClient": true,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "rootUrl": "http://localhost:8088",
      "redirectUris": ["http://localhost:8088/*", "http://localhost:8100/*"],
      "webOrigins": ["+"],
      "attributes": { "pkce.code.challenge.method": "S256", "post.logout.redirect.uris": "+" }
    }<#if appClients?has_content>,</#if>
</#if>
<#list appClients as a>
    {
      "clientId": "${a.clientId?json_string}",
      "publicClient": true,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "rootUrl": "http://localhost:${a.port?c}",
      "redirectUris": ["http://localhost:${a.port?c}/*", "http://localhost:8088/_${a.clientId?json_string}/*", "http://localhost:8088/*"],
      "webOrigins": ["+"],
      "attributes": { "pkce.code.challenge.method": "S256", "post.logout.redirect.uris": "+" }
    }<#sep>,</#sep>
</#list>
  ]
}
