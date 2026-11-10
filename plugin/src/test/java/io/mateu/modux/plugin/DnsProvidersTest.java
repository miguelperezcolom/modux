package io.mateu.modux.plugin;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Each provider against a fake of its API: the calls it makes to point a host at an address. */
class DnsProvidersTest {

    HttpServer server;
    final List<String> calls = new ArrayList<>();

    /** Answers by "METHOD path" (query included); unknown requests get a 404. */
    String start(Map<String, String> answers) throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/", exchange -> {
            var key = exchange.getRequestMethod() + " " + exchange.getRequestURI();
            var body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            calls.add(key + (body.isBlank() ? "" : " " + body));
            var answer = answers.get(key);
            var bytes = (answer == null ? "{}" : answer).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(answer == null ? 404 : 200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        return "http://localhost:" + server.getAddress().getPort();
    }

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    @Test
    void netlify_replaces_a_stale_record_in_the_zone_that_serves_the_host() throws Exception {
        var base = start(Map.of(
                "GET /dns_zones", "[{\"id\":\"z1\",\"name\":\"mateu.io\"}]",
                "GET /dns_zones/z1/dns_records", "[{\"id\":\"r1\",\"hostname\":\"tienda.ec1.mateu.io\",\"type\":\"A\",\"value\":\"1.1.1.1\"}]",
                "DELETE /dns_zones/z1/dns_records/r1", "",
                "POST /dns_zones/z1/dns_records", "{}"));
        var result = new DnsProviders.Netlify(base, "t").upsert("tienda.ec1.mateu.io", "135.181.84.98");
        assertTrue(result.contains("zona mateu.io"), result);
        assertTrue(calls.contains("DELETE /dns_zones/z1/dns_records/r1"), calls.toString());
        assertTrue(calls.stream().anyMatch(c -> c.startsWith("POST /dns_zones/z1/dns_records") && c.contains("\"value\":\"135.181.84.98\"")), calls.toString());
    }

    @Test
    void netlify_leaves_a_record_that_already_points_there() throws Exception {
        var base = start(Map.of(
                "GET /dns_zones", "[{\"id\":\"z1\",\"name\":\"mateu.io\"}]",
                "GET /dns_zones/z1/dns_records", "[{\"id\":\"r1\",\"hostname\":\"a.mateu.io\",\"type\":\"A\",\"value\":\"9.9.9.9\"}]"));
        assertTrue(new DnsProviders.Netlify(base, "t").upsert("a.mateu.io", "9.9.9.9").contains("ya apunta"));
        assertTrue(calls.stream().noneMatch(c -> c.startsWith("POST") || c.startsWith("DELETE")), calls.toString());
    }

    @Test
    void cloudflare_finds_the_zone_by_suffix_and_creates_an_unproxied_record() throws Exception {
        var base = start(Map.of(
                "GET /zones?name=ec1.acme.com", "{\"result\":[]}",
                "GET /zones?name=acme.com", "{\"result\":[{\"id\":\"cz\"}]}",
                "GET /zones/cz/dns_records?type=A&name=app.ec1.acme.com", "{\"result\":[]}",
                "POST /zones/cz/dns_records", "{\"success\":true}"));
        var result = new DnsProviders.Cloudflare(base, "t").upsert("app.ec1.acme.com", "10.0.0.1");
        assertTrue(result.contains("zona acme.com"), result);
        assertTrue(calls.stream().anyMatch(c -> c.startsWith("POST /zones/cz/dns_records") && c.contains("\"proxied\":false")), calls.toString());
    }

    @Test
    void hetzner_sets_the_records_of_an_existing_rrset() throws Exception {
        // app.acme.com is not a zone (404), acme.com is
        var base = start(Map.of(
                "GET /zones/acme.com", "{\"zone\":{\"name\":\"acme.com\"}}",
                "GET /zones/acme.com/rrsets/app/A", "{\"rrset\":{\"records\":[{\"value\":\"1.1.1.1\"}]}}",
                "POST /zones/acme.com/rrsets/app/A/actions/set_records", "{}"));
        var result = new DnsProviders.Hetzner(base, "t").upsert("app.acme.com", "2.2.2.2");
        assertTrue(result.contains("zona acme.com"), result);
        assertTrue(calls.stream().anyMatch(c -> c.startsWith("POST /zones/acme.com/rrsets/app/A/actions/set_records") && c.contains("2.2.2.2")), calls.toString());
    }

    @Test
    void godaddy_puts_the_record_of_the_relative_name() throws Exception {
        var base = start(Map.of(
                "GET /domains/acme.com", "{\"domain\":\"acme.com\"}",
                "GET /domains/acme.com/records/CNAME/shop", "[]",
                "PUT /domains/acme.com/records/CNAME/shop", ""));
        var result = new DnsProviders.GoDaddy(base, "k", "s").upsert("shop.acme.com", "lb.example.net");
        assertTrue(result.contains("CNAME"), result);
        assertTrue(calls.stream().anyMatch(c -> c.startsWith("PUT /domains/acme.com/records/CNAME/shop") && c.contains("lb.example.net")), calls.toString());
    }

    @Test
    void the_credentials_come_from_the_environment_and_their_absence_is_explained() {
        Function<String, String> none = name -> null;
        var e = assertThrows(IllegalStateException.class, () -> DnsProviders.forName("netlify", none));
        assertTrue(e.getMessage().contains("NETLIFY_AUTH_TOKEN"));
        assertThrows(IllegalArgumentException.class, () -> DnsProviders.forName("route66", none));
    }

    @Test
    void the_record_type_follows_the_address() {
        assertEquals("A", DnsProviders.recordType("135.181.84.98"));
        assertEquals("AAAA", DnsProviders.recordType("2a01:4f9::1"));
        assertEquals("CNAME", DnsProviders.recordType("lb.example.net"));
        assertEquals(List.of("a.b.acme.com", "b.acme.com", "acme.com"), DnsProviders.candidateZones("a.b.acme.com"));
        assertEquals("@", DnsProviders.relative("acme.com", "acme.com"));
        assertEquals("shop", DnsProviders.relative("shop.acme.com", "acme.com"));
    }
}
