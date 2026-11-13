package ${project.packageName}.${module.slug}.infra.out.remote;

import ${project.packageName}.${module.slug}.application.out.remote.${remote.className}Client;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Calls ${remote.className} on <#if remote.external!false>the external system </#if>${remote.service}: POST ${remote.path} at ${r"${"}${remote.urlProperty}${r"}"}. */
@Component
public class ${remote.className}RestClient implements ${remote.className}Client {

    final RestClient http;

    public ${remote.className}RestClient(@Value("${r"${"}${remote.urlProperty}:${remote.defaultUrl}${r"}"}") String baseUrl) {
        // buffered: the body goes with its Content-Length, not chunked — not every server takes chunks
        this.http = RestClient.builder().baseUrl(baseUrl)
                .requestFactory(new org.springframework.http.client.BufferingClientHttpRequestFactory(
                        new org.springframework.http.client.SimpleClientHttpRequestFactory()))
                // the person who asked, on the other side too: its roles decide there as well
                .requestInterceptor((request, body, execution) -> {
                    if (org.springframework.web.context.request.RequestContextHolder.getRequestAttributes()
                            instanceof org.springframework.web.context.request.ServletRequestAttributes attributes) {
                        var incoming = attributes.getRequest();
                        for (var header : java.util.List.of("Authorization", "Cookie")) {
                            var value = incoming.getHeader(header);
                            if (value != null && request.getHeaders().getFirst(header) == null) {
                                request.getHeaders().set(header, value);
                            }
                        }
                    }
                    return execution.execute(request, body);
                })
                .build();
    }

    @Override
<#if remote.hasResponse>
    public Response call(Request request) {
        return http.post().uri("${remote.path}").body(request).retrieve()
                .onStatus(status -> status.is4xxClientError(), (req, res) -> { throw rejected(res); })
                .body(Response.class);
    }
<#else>
    public void call(Request request) {
        http.post().uri("${remote.path}").body(request).retrieve()
                .onStatus(status -> status.is4xxClientError(), (req, res) -> { throw rejected(res); })
                .toBodilessEntity();
    }
</#if>

    /**
     * The other side said no (a 4xx): the same business rule, with its message, for the person who
     * asked — not an unexpected error. The message is the problem's detail when there is one.
     */
    static ${project.packageName}.application.BusinessRuleException rejected(org.springframework.http.client.ClientHttpResponse response)
            throws java.io.IOException {
        var body = new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        var detail = java.util.regex.Pattern.compile("\"detail\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"").matcher(body);
        var message = detail.find() ? unescape(detail.group(1))
                : body.isBlank() ? "${remote.service} rechazó la petición (" + response.getStatusCode().value() + ")" : body;
        return switch (response.getStatusCode().value()) {
            case 404 -> ${project.packageName}.application.BusinessRuleException.notFound(message);
            case 409 -> ${project.packageName}.application.BusinessRuleException.conflict(message);
            case 401, 403 -> ${project.packageName}.application.BusinessRuleException.forbidden(message);
            default -> ${project.packageName}.application.BusinessRuleException.invalid(message);
        };
    }

    private static String unescape(String json) {
        var out = new StringBuilder();
        for (int i = 0; i < json.length(); i++) {
            var c = json.charAt(i);
            if (c != '\\' || i + 1 == json.length()) { out.append(c); continue; }
            var n = json.charAt(++i);
            switch (n) {
                case 'n' -> out.append('\n');
                case 't' -> out.append('\t');
                case 'u' -> { out.append((char) Integer.parseInt(json.substring(i + 1, i + 5), 16)); i += 4; }
                default -> out.append(n);
            }
        }
        return out.toString();
    }
}
