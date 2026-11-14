package io.mateu.modux.plugin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * Points a host at an address with the DNS provider that serves its zone. The credentials come
 * from the environment, never from the model: NETLIFY_AUTH_TOKEN, CLOUDFLARE_API_TOKEN,
 * HCLOUD_TOKEN (Hetzner, the Cloud API that now hosts its DNS), GODADDY_API_KEY + GODADDY_API_SECRET.
 * An IP address becomes an A record (AAAA for IPv6); a host name, a CNAME.
 */
public final class DnsProviders {

    private DnsProviders() {}

    /** What every provider does: make {@code host} resolve to {@code address}, idempotently. */
    public interface DnsProvider {
        /** @return what it did, in a line for the log */
        String upsert(String host, String address) throws IOException, InterruptedException;
    }

    /** The provider named in the model, or empty with the reason when it cannot work here. */
    public static DnsProvider forName(String name, Function<String, String> env) {
        return switch (name.trim().toUpperCase()) {
            case "NETLIFY" -> new Netlify("https://api.netlify.com/api/v1", required(env, "NETLIFY_AUTH_TOKEN"));
            case "CLOUDFLARE" -> new Cloudflare("https://api.cloudflare.com/client/v4", required(env, "CLOUDFLARE_API_TOKEN"));
            case "HETZNER" -> new Hetzner("https://api.hetzner.cloud/v1", required(env, "HCLOUD_TOKEN"));
            case "GODADDY" -> new GoDaddy("https://api.godaddy.com/v1",
                    required(env, "GODADDY_API_KEY"), required(env, "GODADDY_API_SECRET"));
            default -> throw new IllegalArgumentException("Unknown DNS provider: " + name
                    + " (NETLIFY, CLOUDFLARE, HETZNER or GODADDY)");
        };
    }

    private static String required(Function<String, String> env, String variable) {
        var value = env.apply(variable);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing environment variable " + variable + " to update the DNS");
        }
        return value;
    }

    static String recordType(String address) {
        if (address.matches("\\d{1,3}(\\.\\d{1,3}){3}")) return "A";
        if (address.contains(":")) return "AAAA";
        return "CNAME";
    }

    /** The zones a host may live in, longest first: a.b.example.com → b.example.com, example.com. */
    static List<String> candidateZones(String host) {
        var labels = host.split("\\.");
        var zones = new ArrayList<String>();
        for (int i = 0; i + 1 < labels.length; i++) {
            zones.add(String.join(".", java.util.Arrays.copyOfRange(labels, i, labels.length)));
        }
        return zones;
    }

    static String relative(String host, String zone) {
        return host.equals(zone) ? "@" : host.substring(0, host.length() - zone.length() - 1);
    }

    /** A small JSON-over-HTTP client shared by the providers. */
    abstract static class Api implements DnsProvider {
        static final ObjectMapper JSON = new ObjectMapper();
        final HttpClient http = HttpClient.newHttpClient();
        final String base;

        Api(String base) {
            this.base = base.replaceAll("/+$", "");
        }

        abstract Map<String, String> auth();

        JsonNode call(String method, String path, Object body) throws IOException, InterruptedException {
            var request = HttpRequest.newBuilder(URI.create(base + path))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json");
            auth().forEach(request::header);
            request.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body)));
            var response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404) return null;
            if (response.statusCode() >= 300) {
                throw new IOException(method + " " + path + " → " + response.statusCode() + ": "
                        + response.body().substring(0, Math.min(300, response.body().length())));
            }
            return response.body().isBlank() ? JSON.nullNode() : JSON.readTree(response.body());
        }

        static String enc(String value) {
            return URLEncoder.encode(value, StandardCharsets.UTF_8);
        }
    }

    /** Netlify DNS (the zones of netlify.com sites and domains). */
    static final class Netlify extends Api {
        private final String token;

        Netlify(String base, String token) {
            super(base);
            this.token = token;
        }

        @Override
        Map<String, String> auth() {
            return Map.of("Authorization", "Bearer " + token);
        }

        @Override
        public String upsert(String host, String address) throws IOException, InterruptedException {
            var type = recordType(address);
            var zones = call("GET", "/dns_zones", null);
            JsonNode zone = null;
            for (var candidate : candidateZones(host)) {
                for (var z : zones) {
                    if (candidate.equals(z.path("name").asText())) { zone = z; break; }
                }
                if (zone != null) break;
            }
            if (zone == null) throw new IOException("No Netlify zone serves " + host);
            var zoneId = zone.path("id").asText();
            for (var r : call("GET", "/dns_zones/" + zoneId + "/dns_records", null)) {
                if (!host.equals(r.path("hostname").asText()) || !type.equals(r.path("type").asText())) continue;
                if (address.equals(r.path("value").asText())) return host + " already points to " + address + " (Netlify)";
                // Netlify has no update: the old record goes, the new one comes
                call("DELETE", "/dns_zones/" + zoneId + "/dns_records/" + r.path("id").asText(), null);
            }
            call("POST", "/dns_zones/" + zoneId + "/dns_records",
                    Map.of("type", type, "hostname", host, "value", address, "ttl", 300));
            return host + " → " + address + " (" + type + ", Netlify, zone " + zone.path("name").asText() + ")";
        }
    }

    /** Cloudflare, never proxied: the ingress terminates TLS with its own certificate. */
    static final class Cloudflare extends Api {
        private final String token;

        Cloudflare(String base, String token) {
            super(base);
            this.token = token;
        }

        @Override
        Map<String, String> auth() {
            return Map.of("Authorization", "Bearer " + token);
        }

        @Override
        public String upsert(String host, String address) throws IOException, InterruptedException {
            var type = recordType(address);
            String zoneId = null;
            String zoneName = null;
            for (var candidate : candidateZones(host)) {
                var found = call("GET", "/zones?name=" + enc(candidate), null);
                if (found != null && found.path("result").size() > 0) {
                    zoneId = found.path("result").get(0).path("id").asText();
                    zoneName = candidate;
                    break;
                }
            }
            if (zoneId == null) throw new IOException("No Cloudflare zone serves " + host);
            var body = Map.of("type", type, "name", host, "content", address, "ttl", 300, "proxied", false);
            var existing = call("GET", "/zones/" + zoneId + "/dns_records?type=" + type + "&name=" + enc(host), null);
            if (existing != null && existing.path("result").size() > 0) {
                var record = existing.path("result").get(0);
                if (address.equals(record.path("content").asText())) return host + " already points to " + address + " (Cloudflare)";
                call("PUT", "/zones/" + zoneId + "/dns_records/" + record.path("id").asText(), body);
            } else {
                call("POST", "/zones/" + zoneId + "/dns_records", body);
            }
            return host + " → " + address + " (" + type + ", Cloudflare, zone " + zoneName + ")";
        }
    }

    /** Hetzner DNS through the Cloud API (zones and their RRSets). */
    static final class Hetzner extends Api {
        private final String token;

        Hetzner(String base, String token) {
            super(base);
            this.token = token;
        }

        @Override
        Map<String, String> auth() {
            return Map.of("Authorization", "Bearer " + token);
        }

        @Override
        public String upsert(String host, String address) throws IOException, InterruptedException {
            var type = recordType(address);
            String zone = null;
            for (var candidate : candidateZones(host)) {
                if (call("GET", "/zones/" + enc(candidate), null) != null) { zone = candidate; break; }
            }
            if (zone == null) throw new IOException("No Hetzner zone serves " + host);
            var name = relative(host, zone);
            var value = "CNAME".equals(type) ? address.replaceAll("\\.?$", ".") : address;
            var records = List.of(Map.of("value", value));
            var rrset = call("GET", "/zones/" + enc(zone) + "/rrsets/" + enc(name) + "/" + type, null);
            if (rrset == null) {
                call("POST", "/zones/" + enc(zone) + "/rrsets", Map.of("name", name, "type", type, "ttl", 300, "records", records));
            } else {
                var current = rrset.path("rrset").path("records");
                if (current.size() == 1 && value.equals(current.get(0).path("value").asText())) {
                    return host + " already points to " + address + " (Hetzner)";
                }
                call("POST", "/zones/" + enc(zone) + "/rrsets/" + enc(name) + "/" + type + "/actions/set_records",
                        Map.of("records", records));
            }
            return host + " → " + address + " (" + type + ", Hetzner, zone " + zone + ")";
        }
    }

    /** GoDaddy: a PUT on the name and type replaces its records. */
    static final class GoDaddy extends Api {
        private final String key;
        private final String secret;

        GoDaddy(String base, String key, String secret) {
            super(base);
            this.key = key;
            this.secret = secret;
        }

        @Override
        Map<String, String> auth() {
            return Map.of("Authorization", "sso-key " + key + ":" + secret);
        }

        @Override
        public String upsert(String host, String address) throws IOException, InterruptedException {
            var type = recordType(address);
            Optional<String> domain = Optional.empty();
            for (var candidate : candidateZones(host)) {
                if (call("GET", "/domains/" + enc(candidate), null) != null) { domain = Optional.of(candidate); break; }
            }
            var zone = domain.orElseThrow(() -> new IOException("No GoDaddy domain serves " + host));
            var name = relative(host, zone);
            var current = call("GET", "/domains/" + enc(zone) + "/records/" + type + "/" + enc(name), null);
            if (current != null && current.size() == 1 && address.equals(current.get(0).path("data").asText())) {
                return host + " already points to " + address + " (GoDaddy)";
            }
            call("PUT", "/domains/" + enc(zone) + "/records/" + type + "/" + enc(name),
                    List.of(Map.of("data", address, "ttl", 600)));
            return host + " → " + address + " (" + type + ", GoDaddy, domain " + zone + ")";
        }
    }
}
