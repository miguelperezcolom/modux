package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The patterns a model gets from one line drawn in the editor, on the model of the «Entradas» spec
 * (docs/specs/entradas-conciertos.md), exactly as the editor's commands wrote it:
 * an aggregate drawn into another context's read model is a projection fed by the aggregate's
 * state; a use case drawn to another service's use case is a REST call through a generated client;
 * a proxy in front of an API is a gateway route, cached when it says so. Generation only.
 */
@SpringBootTest
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class HighLevelPatternsTest {

    static final Path STORE = Path.of("src/test/resources/examples/entradas").toAbsolutePath();

    static {
        System.setProperty("modux.model-file", STORE.toString());
    }

    @Autowired
    GenerateCodeUseCase generateCodeUseCase;

    @Autowired
    CommonFileRepository repository;

    Path out;

    @BeforeAll
    void generate() throws Exception {
        repository.loadFrom(STORE.toString());
        out = Files.createTempDirectory("modux-patterns");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", out.toString(), null, true));
    }

    @Test
    void an_aggregate_feeding_a_read_model_publishes_its_state_on_every_save_and_delete() throws Exception {
        var repo = read("ConciertoDBRepository.java");
        assertTrue(repo.contains("publishState(saved);"), repo);
        assertTrue(repo.contains("stateStream.send(\"conciertoestado\""), repo);
        assertTrue(repo.contains("publishDeleted(selected.value())"), repo);
        // event-sourced too: after the events are appended
        var es = read("CompraEventSourcedRepository.java");
        assertTrue(es.contains("stateStream.send(\"compraestado\""), es);
        // an aggregate nobody projects publishes nothing
        assertFalse(read("PagoDBRepository.java").contains("stateStream"));
    }

    @Test
    void the_projection_upserts_the_state_and_deletes_on_removal() throws Exception {
        var projection = read("ConciertosProjection.java");
        assertTrue(projection.contains("conciertosProjectionOnConciertoEstado()"), projection);
        assertTrue(projection.contains("conciertosProjectionOnConciertoBorrado()"), projection);
        assertTrue(projection.contains("repository.deleteById(id)"), projection);
        assertTrue(projection.contains("entity.setAforo("), "the read model takes the aggregate's fields: " + projection);
        assertFalse(projection.contains("TODO"), projection);
        var yaml = Files.readString(file("application.yaml", "ventas-app").orElseThrow());
        assertTrue(yaml.contains("conciertosProjectionOnConciertoEstado-in-0:"), yaml);
        assertTrue(yaml.contains("destination: conciertoestado"), yaml);
    }

    @Test
    void a_use_case_of_another_service_is_called_over_rest_through_a_client() throws Exception {
        var useCase = read("ComprarUseCase.java");
        assertTrue(useCase.contains("var consultarPrecio = consultarPrecioClient.call("), useCase);
        assertTrue(useCase.contains("steps.comprar(command, consultarPrecio)"), "its answer reaches the logic: " + useCase);
        var client = read("ConsultarPrecioRestClient.java");
        assertTrue(client.contains("${CATALOGO_URL:http://localhost:8091}"), client);
        assertTrue(client.contains(".uri(\"/v1/consultarprecio\")"), client);
        // a rule the other side applies reaches the person as that rule, not as an unexpected error
        assertTrue(client.contains("onStatus(status -> status.is4xxClientError(), (req, res) -> { throw rejected(res); })"), client);
        // the callee answers over REST, though nobody flagged it exposedAsRest
        assertTrue(file("ConsultarPrecioController.java", "catalogo").isPresent());
    }

    @Test
    void a_proxy_is_a_gateway_route_with_its_cache() throws Exception {
        var all = Files.createTempDirectory("modux-patterns-all");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", all.toString(), null, false));
        var yaml = Files.readString(all.resolve("gateway/src/main/resources/application.yaml"));
        assertTrue(yaml.contains("- id: proxy-agenda"), yaml);
        assertTrue(yaml.contains("Path=/public/agenda/**"), yaml);
        assertTrue(yaml.contains("${CATALOGO_URL:http://localhost:8091}"), yaml);
        try (var s = Files.walk(all.resolve("gateway"))) {
            var filter = s.filter(p -> p.getFileName().toString().equals("ProxyCacheFilter.java")).findFirst().orElseThrow();
            assertTrue(Files.readString(filter).contains("\"/public/agenda/\", Duration.ofSeconds(60)"));
        }
    }

    @Test
    void with_roles_and_no_identity_provider_one_login_serves_every_service() throws Exception {
        var all = Files.createTempDirectory("modux-patterns-sso");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", all.toString(), null, false));
        try (var s = Files.walk(all)) {
            var cookies = s.filter(p -> p.getFileName().toString().equals("ModuxAuthCookie.java")).toList();
            // the four services and the shell
            assertTrue(cookies.size() == 5, cookies.toString());
        }
        var shell = Files.readString(all.resolve("entradas/src/main/java/es/entradas/entradas/infra/config/SecurityConfig.java"));
        assertTrue(shell.contains(".formLogin(login -> login.successHandler(authCookie.loginSuccess(\"/\")))"), shell);
        var compose = Files.readString(all.resolve("docker-compose.yml"));
        assertTrue(compose.contains("CATALOGO_URL: http://catalogo:8091"), "a service reaches its siblings: " + compose);
        assertFalse(compose.startsWith("version:"), "compose ignores the obsolete version attribute");
        var yaml = Files.readString(all.resolve("ventas/ventas-app/src/main/resources/application.yaml"));
        assertTrue(yaml.contains("use-relative-redirects: true"), "behind the gateway, redirects stay relative: " + yaml);
    }

    @Test
    void an_event_sourced_aggregate_with_screens_shows_its_history() throws Exception {
        var history = read("CompraHistoryListing.java");
        assertTrue(history.contains("events.findAll()"), history);
        // one Home per service: the one of Ventas, which deploys the aggregate
        var home = Files.readString(file("Home.java", "ventas-app").orElseThrow());
        assertTrue(home.contains("Historial de compras"), "in the app's menu: " + home);
        // with no domain events of its own, the repository records each saved state
        assertTrue(read("CompraEventSourcedRepository.java").contains("\"CompraGuardado\""));
    }

    @Test
    void a_read_model_listing_shows_the_models_labels_and_money_with_two_decimals() throws Exception {
        var listing = read("CompraViewListing.java");
        assertTrue(listing.contains("@io.mateu.uidl.annotations.Label(\"Concierto\") String conciertoId"), listing);
        assertTrue(listing.contains("setScale(2, java.math.RoundingMode.HALF_UP)"), listing);
    }

    @Test
    void a_use_case_of_an_external_system_is_a_real_http_call_to_where_it_answers() throws Exception {
        var useCase = read("CobrarUseCase.java");
        assertTrue(useCase.contains("var pasarelaCobrar = pasarelaCobrarClient.call("), useCase);
        assertTrue(useCase.contains("steps.cobrar(command, pasarelaCobrar)"), "its answer reaches the logic: " + useCase);
        var client = read("PasarelaCobrarRestClient.java");
        assertTrue(client.contains("${PASARELA_URL:http://localhost:9099}"), client);
        assertTrue(client.contains(".uri(\"/cobrar\")"), client);
        assertTrue(client.contains("BufferingClientHttpRequestFactory"), "with its Content-Length: " + client);
        assertTrue(read("PasarelaCobrarClient.java").contains("record Response(Boolean aceptado, String motivo)"));
        var all = Files.createTempDirectory("modux-patterns-ext");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", all.toString(), null, false));
        var compose = Files.readString(all.resolve("docker-compose.yml"));
        assertTrue(compose.contains("PASARELA_URL: ${PASARELA_URL:-http://host.docker.internal:9099}"),
                "the partner answers outside the compose network: " + compose);
    }

    @Test
    void a_projection_fed_from_outside_polls_its_source_and_mirrors_it() throws Exception {
        // an external system's operation: GET at where it answers
        var api = read("MovimientosProjection.java");
        assertTrue(api.contains("@Scheduled("), api);
        assertTrue(api.contains("${PASARELA_URL:http://localhost:9099}"), api);
        assertTrue(api.contains(".uri(\"/movimientos\")"), api);
        assertTrue(api.contains("entity.setImporte("), api);
        assertTrue(api.contains("repository.deleteAll(gone)"), "what the source no longer has goes: " + api);
        // a legacy table: over JDBC, from the environment
        var table = read("RecintosProjection.java");
        assertTrue(table.contains("${LEGADO_JDBC_URL:}"), table);
        assertTrue(table.contains("SELECT * FROM recintos"), table);
        assertTrue(table.contains("entity.setAforoMaximo("), table);
        var all = Files.createTempDirectory("modux-patterns-poll");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", all.toString(), null, false));
        var compose = Files.readString(all.resolve("docker-compose.yml"));
        assertTrue(compose.contains("LEGADO_JDBC_URL: ${LEGADO_JDBC_URL:-}"), compose);
    }

    @Test
    void a_grouped_query_is_a_panel_one_row_per_key_with_its_totals() throws Exception {
        var panel = read("CompraViewListing.java");
        assertTrue(panel.contains("\"CONFIRMADA\".equals(String.valueOf(rm.estado()))"), "only the confirmed ones: " + panel);
        assertTrue(panel.contains("groupingBy(rm -> String.valueOf(rm.conciertoId())"), panel);
        assertTrue(panel.contains("@io.mateu.uidl.annotations.Label(\"Compras\") String count"), panel);
        assertTrue(panel.contains("mapToLong(Number::longValue).sum()"), "entries add up: " + panel);
        assertTrue(panel.contains("reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)"), "revenue adds up: " + panel);
        // Analítica holds a view of Concierto too (one more line): the row names the concert
        assertTrue(panel.contains("names.getById(key).map(v -> String.valueOf(v.artista()))"), panel);
    }

    private Optional<Path> file(String name, String under) throws Exception {
        try (var s = Files.walk(out)) {
            return s.filter(p -> p.getFileName().toString().equals(name))
                    .filter(p -> under == null || p.toString().contains("/" + under + "/"))
                    .findFirst();
        }
    }

    private String read(String name) throws Exception {
        // google-java-format wraps where it likes: compare on single spaces
        return Files.readString(file(name, null).orElseThrow(() -> new AssertionError(name + " not generated")))
                .replaceAll("\\s+", " ").replace("( ", "(").replace(" )", ")").replace(". ", ".").replace(" .", ".");
    }
}
