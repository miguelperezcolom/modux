# API gateway — las rutas salen del modelo (servicios + uiAdapters); GENERADO por modux.
server:
    port: ${gatewayPort?c}

spring:
    application:
        name: ${project.name?lower_case?replace("[^a-z0-9]","-",'r')}-api-gateway
    cloud:
        gateway:
            server:
                webmvc:
                    # each target comes from {SERVICE}_URL / SHELL_URL (containers, Kubernetes);
                    # the default is the host-run one up.sh starts
                    routes:
<#list services as s>
                    # ${s.name}: frontera de máquinas (REST de los gateways ACL)
                    - id: api-${s.slug}
                      uri: ${r"${"}${s.slug?upper_case?replace("-","_")}_URL:http://localhost:${s.port?c}}
                      predicates: [ "Path=/api/${s.slug}/**" ]
                      filters: [ "StripPrefix=2" ]
</#list>
<#list apps as a>
                    # ${a.slug}: micro-frontend (rutas /_app de la shell) y caminos de máquina
                    # en ruta natural (los sync del micro-frontend van a /<app>/mateu y /<app>/assets);
                    # la UI en /<app> la sirve la shell, que monta la app dentro (misma sesión)
                    - id: mateu-${a.slug}
                      uri: ${r"${"}${a.svc?upper_case?replace("-","_")}_URL:http://localhost:${a.port?c}}
                      predicates: [ "Path=/_${a.slug}/mateu/**" ]
                      filters: [ "RewritePath=/_${a.slug}/mateu(?<segment>/?.*), /${a.slug}/mateu${r"${segment}"}" ]
                    - id: ui-${a.slug}
                      uri: ${r"${"}${a.svc?upper_case?replace("-","_")}_URL:http://localhost:${a.port?c}}
                      predicates: [ "Path=/_${a.slug}/**" ]
                      filters: [ "RewritePath=/_${a.slug}(?<segment>/?.*), /${a.slug}${r"${segment}"}" ]
                    - id: app-${a.slug}
                      uri: ${r"${"}${a.svc?upper_case?replace("-","_")}_URL:http://localhost:${a.port?c}}
                      predicates: [ "Path=/${a.slug}/mateu/**, /${a.slug}/assets/**" ]
</#list>
<#list proxies![] as px>
                    # proxy ${px.name}: la API que publica ${px.svc}, para fuera<#if (px.ttl > 0)>, con caché de ${px.ttl?c} s (ProxyCacheFilter)</#if>
                    - id: proxy-${px.slug}
                      uri: ${r"${"}${px.svc?upper_case?replace("-","_")}_URL:http://localhost:${px.port?c}}
                      predicates: [ "Path=${px.path}/**" ]
                      filters: [ "StripPrefix=${px.segments?c}" ]
</#list>
                    # la shell (todo lo demás)
                    - id: shell
                      uri: ${r"${"}SHELL_URL:http://localhost:${shellPort?c}}
                      predicates: [ "Path=/**" ]
