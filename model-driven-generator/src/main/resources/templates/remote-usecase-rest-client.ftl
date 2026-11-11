package ${project.packageName}.${module.slug}.infra.out.remote;

import ${project.packageName}.${module.slug}.application.out.remote.${remote.className}Client;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Calls ${remote.className} on ${remote.service}: POST ${remote.path} at ${r"${"}${remote.urlProperty}${r"}"}. */
@Component
public class ${remote.className}RestClient implements ${remote.className}Client {

    final RestClient http;

    public ${remote.className}RestClient(@Value("${r"${"}${remote.urlProperty}:http://localhost:${remote.port?c}${r"}"}") String baseUrl) {
        this.http = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
<#if remote.hasResponse>
    public Response call(Request request) {
        return http.post().uri("${remote.path}").body(request).retrieve().body(Response.class);
    }
<#else>
    public void call(Request request) {
        http.post().uri("${remote.path}").body(request).retrieve().toBodilessEntity();
    }
</#if>
}
