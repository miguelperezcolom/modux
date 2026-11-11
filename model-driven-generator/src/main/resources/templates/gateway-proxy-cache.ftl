package ${project.packageName}.gateway;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * The cache of the model's API proxies: a successful GET through a proxy is kept for its TTL and
 * served from memory meanwhile, without reaching the service behind. Every answer says which it
 * was in {@code X-Cache} (HIT or MISS). In memory, per gateway instance — a shared cache (Redis,
 * a CDN) is a deployment decision, not the model's.
 */
@Component
public class ProxyCacheFilter extends OncePerRequestFilter {

    /** Public path of each cached proxy → how long its answers live. */
    static final Map<String, Duration> TTL = Map.of(
<#list proxies?filter(p -> (p.ttl > 0)) as px>
            "${px.path}/", Duration.ofSeconds(${px.ttl?c})<#sep>,</#sep>
</#list>
    );

    record Entry(byte[] body, String contentType, long expiresAt) {}

    final Map<String, Entry> cache = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"GET".equals(request.getMethod()) || ttlOf(request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // who asks is part of the key: an answer is never served to a caller it was not given to
        var key = request.getRequestURI() + (request.getQueryString() != null ? "?" + request.getQueryString() : "")
                + "|" + java.util.Objects.hashCode(request.getHeader("Authorization"));
        var hit = cache.get(key);
        if (hit != null && hit.expiresAt() > System.currentTimeMillis()) {
            response.setHeader("X-Cache", "HIT");
            if (hit.contentType() != null) response.setContentType(hit.contentType());
            response.setContentLength(hit.body().length);
            response.getOutputStream().write(hit.body());
            return;
        }
        var wrapper = new ContentCachingResponseWrapper(response);
        wrapper.setHeader("X-Cache", "MISS");
        chain.doFilter(request, wrapper);
        if (wrapper.getStatus() == 200) {
            cache.put(key, new Entry(wrapper.getContentAsByteArray(), wrapper.getContentType(),
                    System.currentTimeMillis() + ttlOf(request.getRequestURI()).toMillis()));
        }
        wrapper.copyBodyToResponse();
    }

    private static Duration ttlOf(String uri) {
        return TTL.entrySet().stream()
                .filter(e -> (uri + "/").startsWith(e.getKey()))
                .map(Map.Entry::getValue)
                .findFirst().orElse(null);
    }
}
