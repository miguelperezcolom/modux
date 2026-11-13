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
        // it reads through a stored procedure (JDBC): a write is flushed, so reading it back in the
        // same transaction finds it
        assertTrue(repo.contains("var saved = repository.saveAndFlush(toEntity(domain));"), repo);
        assertTrue(repo.contains("publishState(saved);"), repo);
        assertTrue(repo.contains("stateStream.send(\"conciertoestado\""), repo);
        assertTrue(repo.contains("publishDeleted(selected.value())"), repo);
        // rebuild: the whole state again on startup, so a read model added later catches up
        assertTrue(repo.contains("repository.findAll().forEach(this::publishState);"), repo);
        assertTrue(repo.contains("\"modux.state.republish-on-startup\", Boolean.class, true"), repo);
        // event-sourced too: after the events are appended
        var es = read("CompraEventSourcedRepository.java");
        // an enum with no value yet (a reason not given) reads back as no value, not a crash
        assertTrue(es.contains("entity.getEstado() != null ? Estado.valueOf(entity.getEstado()) : null"), es);
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
        // whoever asked travels along: the callee checks its roles too
        assertTrue(client.contains("List.of(\"Authorization\", \"Cookie\")"), client);
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
        // a service added after the first boot still finds its database
        assertTrue(compose.contains("postgres-databases:"), compose);
        assertTrue(compose.contains("datname = 'catalogo'\" | grep -q 1 || psql -c \"CREATE DATABASE catalogo\""), compose);
        assertTrue(compose.contains("condition: service_completed_successfully"), compose);
    }

    @Test
    void a_service_with_two_apps_gets_a_home_for_each_and_the_shell_links_both() throws Exception {
        var all = Files.createTempDirectory("modux-patterns-apps");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", all.toString(), null, false));
        var ui = all.resolve("catalogo/catalogo-app/src/main/java/es/entradas/infra/in/ui");
        assertTrue(Files.readString(ui.resolve("Home.java")).contains("@UI(\"/catalogo\")"), "the first app keeps Home");
        var second = Files.readString(ui.resolve("CatalogoInformesHome.java"));
        assertTrue(second.contains("@UI(\"/catalogo-informes\")"), second);
        assertTrue(second.contains("public class CatalogoInformesHome"), second);
        // google-java-format wraps the second entry: compare without whitespace
        var shell = Files.readString(all.resolve("entradas/src/main/java/es/entradas/entradas/infra/in/ui/EntradasHome.java"))
                .replaceAll("\\s+", "");
        assertTrue(shell.contains(".withLabel(\"Catalogo\").withPath(\"/catalogo\")"), shell);
        assertTrue(shell.contains(".withLabel(\"Informesdelcatálogo\").withPath(\"/catalogo-informes\")"), shell);
        // each app through its own gateway route
        assertTrue(shell.contains("newRemoteMenu(\"/_catalogo-informes\")"), shell);
    }

    @Test
    void a_list_of_value_objects_is_an_inline_grid_in_the_crud_form() throws Exception {
        var vm = read("ConciertoViewModel.java");
        assertTrue(vm.contains("@InlineEditing @Stereotype(FieldStereotype.grid) List<ZonaFila> zonas = new ArrayList<>();"), vm);
        assertTrue(vm.contains("toJson(zonas)"), "the command carries the rows as JSON: " + vm);
        assertTrue(vm.contains("zonas = fromJson(dto.zonas(), ZonaFila.class);"), vm);
        var row = read("ZonaFila.java");
        assertTrue(row.contains("public class ZonaFila"), row);
        assertTrue(row.contains("JsonIgnoreProperties(ignoreUnknown = true)"), "tolerant to what a hook adds: " + row);
        assertTrue(row.contains("BigDecimal precio;"), row);
        var baseline = Files.readString(file("V1__baseline.sql", "catalogo").orElseThrow());
        assertTrue(baseline.contains("col_zonas text"), "JSON needs unbounded text: " + baseline);
    }

    @Test
    void a_list_in_a_use_case_result_is_a_read_only_grid() throws Exception {
        var page = read("ComprarPage.java");
        assertTrue(page.contains("@Stereotype(FieldStereotype.grid) List<ZonaFila> zonasResultado = new ArrayList<>();"), page);
        assertTrue(page.contains("objectMapper.readValue(result.zonas()"), page);
        assertTrue(!page.contains("\"Zonas del recinto: \" + result.zonas()"), "no JSON in the notice: " + page);
        assertTrue(file("ZonaFila.java", "comprar").isPresent(), "its row class next to the page");
    }

    @Test
    void a_row_action_reads_the_row_runs_the_operation_and_saves() throws Exception {
        // no input model: the command is the row's id, and the steps are real calls, not hooks
        var useCase = read("ConfirmarAManoUseCase.java");
        assertTrue(useCase.contains("compraRepository.findById(new CompraId(Long.valueOf(String.valueOf(command.id()))))"), useCase);
        assertTrue(useCase.contains("compraRepository.save(compra)"), useCase);
        assertTrue(read("CompraCrudOrchestrator.java").contains("confirmarAManoUseCase.handle(new ConfirmarAManoCommand(Long.valueOf(row.id())))"));
    }

    @Test
    void a_formatted_text_is_edited_with_an_editor_shown_rendered_and_stored_whole() throws Exception {
        // a model field with Mateu's stereotype: the form edits it so, the table has no length limit
        assertTrue(read("ConciertoViewModel.java").contains("@io.mateu.uidl.annotations.Stereotype(io.mateu.uidl.data.FieldStereotype.richText)"));
        var baseline = Files.readString(file("V1__baseline.sql", "catalogo").orElseThrow());
        assertTrue(baseline.contains("col_descripcion text"), baseline);
        // a use case that answers HTML shows it rendered, not inside the notice
        var page = read("ComprarPage.java");
        assertTrue(page.contains("@Stereotype(FieldStereotype.html) String justificanteResultado"), page);
        assertTrue(page.contains("justificanteResultado = result.justificante() != null"), page);
        assertTrue(!page.contains("\"Justificante: \" + result.justificante()"), page);
    }

    @Test
    void a_query_use_case_is_drawn_with_the_mateu_page_template_its_model_names() throws Exception {
        // dashboard: the numbers as KPIs, the html as a tile, the list as a table and a chart
        var panel = read("PanelVentasPage.java");
        assertTrue(panel.contains("extends Dashboard"), panel);
        assertTrue(panel.contains("MetricCard entradasVendidas;"), panel);
        assertTrue(panel.contains("Chart conciertosChart;"), panel);
        assertTrue(panel.contains(".html(true)"), "the html content rendered: " + panel);
        // calendar: each item an event on its date; clicking opens the item's page
        var agenda = read("AgendaPage.java");
        assertTrue(agenda.contains("extends CalendarPage"), agenda);
        assertTrue(agenda.contains("return itemPage.load(event.id());"), agenda);
        // to-do list: buckets by the group field
        var todo = read("PorRevisarPage.java");
        assertTrue(todo.contains("extends TodoList<"), todo);
        assertTrue(todo.contains("protected String groupOf("), todo);
        // smart search: the input as facets, a row opens the item
        var search = read("BuscarConciertosPage.java");
        assertTrue(search.contains("extends SmartSearchPage<BuscarConciertosPage.Filtros"), search);
        assertTrue(search.contains("implements Navigable<"), search);
        // item overview: loaded by id from the URL or from the page that opens it
        var ficha = read("FichaConciertoPage.java");
        assertTrue(ficha.contains("extends ItemOverview"), ficha);
        assertTrue(ficha.contains("public FichaConciertoPage load(String id)"), ficha);
        assertTrue(ficha.contains("@Panel(title = \"Zonas\") Markdown zonasPanel;"), ficha);
    }

    @Test
    void a_lifecycle_sets_the_initial_state_guards_each_operation_and_moves_the_state() throws Exception {
        // the aggregate, not another context's record of the same name
        var compra = read("Compra.java", "aggregates/compra");
        // born in its initial state
        assertTrue(compra.contains("p.estado = Estado.PENDIENTE;"), compra);
        // an operation only from the states its transitions leave, and to where they go
        assertTrue(compra.contains("if (!java.util.Set.of(\"PENDIENTE\").contains(stateBefore))"), compra);
        assertTrue(compra.contains("\"No se puede confirmar en estado \" + stateBefore"), compra);
        assertTrue(compra.contains("case \"PENDIENTE\" -> this.estado = Estado.CONFIRMADA;"), compra);
        // editable with operations, but only in its editable states
        assertTrue(compra.contains("public void update("), "editable: the generic edit stays: " + compra);
        assertTrue(compra.contains("Compra no se puede modificar en estado "), compra);
        assertFalse(read("CompraCrudOrchestrator.java").contains("public boolean canEdit()"));
    }

    @Test
    void a_read_only_field_is_shown_read_only_and_the_generic_edit_keeps_it() throws Exception {
        var viewModel = read("CompraViewModel.java");
        assertTrue(viewModel.contains("@ReadOnly @io.mateu.uidl.annotations.Label(\"Estado\")"), viewModel);
        var update = read("UpdateCompraUseCase.java");
        assertTrue(update.contains("entity.getEstado()"), "the stored state, not the command's: " + update);
        assertTrue(update.contains("entity.getLocalizador()"), update);
        assertTrue(update.contains("command.cliente()"), update);
    }

    @Test
    void a_system_value_is_filled_by_the_use_case_not_the_caller() throws Exception {
        var useCase = read("ConfirmarAManoUseCase.java");
        assertTrue(useCase.contains("Input(currentUser.username(), Math.toIntExact(sequences.next(\"Compra.localizador\")), java.time.LocalDateTime.now())"), useCase);
        assertTrue(useCase.contains("CurrentUser currentUser;"), useCase);
        assertTrue(useCase.contains("Sequences sequences;"), useCase);
        // its invariants hold after the operation, before saving
        assertTrue(useCase.contains("compraInvariants.check(new "), useCase);
        // who is running it, over Spring Security; numbers without gaps, in the use case's transaction
        assertTrue(read("SpringSecurityCurrentUser.java").contains("SecurityContextHolder.getContext().getAuthentication()"));
        assertTrue(read("VentasJpaSequences.java").contains("@Transactional(propagation = Propagation.MANDATORY)"));
        assertTrue(read("VentasSequenceRepository.java").contains("@Lock(LockModeType.PESSIMISTIC_WRITE)"));
        // the event store records who did each thing
        var appender = read("CompraEventAppender.java");
        assertTrue(appender.contains("currentUser.username()"), appender);
        assertTrue(read("CompraEventEntity.java").contains("@Column(name = \"payload\", columnDefinition = \"text\")"));
    }

    @Test
    void what_running_a_generated_system_showed() throws Exception {
        // a notification's configuration is named apart from its function bean (same name, else)
        assertTrue(read("AvisoDeCompraNotification.java").contains("@Configuration(\"avisoDeCompraNotificationConfiguration\")"));
        // JPA columns are the migration's snake_case, not left to Spring's naming (corrigeA)
        assertTrue(read("CompraEntity.java").contains("@Column(name = \"col_concierto_id\")"));
        assertTrue(read("CompraEntity.java").contains("@Column(name = \"col_confirmada_por\")"));
        // a read model's rows carry their id: a link to one, a reference, needs it
        assertTrue(read("MovimientoViewReadModel.java").contains("String id, String compraId"));
        // an aggregate's lists travel with its state into another context's read model, as JSON text
        assertTrue(read("ConciertosProjection.java", "ventas").contains("entity.setZonas("));
        // the event store's columns and the correlative series are in the migrations
        var ventas = Files.readString(file("V1__baseline.sql", "ventas").orElseThrow());
        assertTrue(ventas.contains("recorded_by varchar(255)"), ventas);
        assertTrue(ventas.contains("CREATE TABLE IF NOT EXISTS ventas_sequence"), ventas);
        // only where numbers are taken
        assertFalse(Files.readString(file("V1__baseline.sql", "catalogo").orElseThrow()).contains("catalogo_sequence"));
        assertFalse(file("CatalogoJpaSequences.java", null).isPresent());
        // a list that crosses services says what its rows carry
        assertTrue(Files.readString(file("ConsultarPrecioClient.java", null).orElseThrow()).contains("What it answers."));
    }

    @Test
    void with_an_email_provider_the_services_can_send_email() throws Exception {
        assertTrue(read("MailSender.java").contains("void send(String to, String subject, String html);"));
        assertTrue(read("SmtpMailSender.java").contains("helper.setText(html, true);"));
        var all = Files.createTempDirectory("modux-patterns-mail");
        generateCodeUseCase.handle(new GenerateCodeCommand("entradas", all.toString(), null, false));
        assertTrue(Files.readString(all.resolve("catalogo/catalogo/pom.xml")).contains("spring-boot-starter-mail"));
        assertTrue(Files.readString(all.resolve("catalogo/catalogo-app/src/main/resources/application.yaml"))
                .contains("host: ${MAIL_HOST:localhost}"));
        var compose = Files.readString(all.resolve("docker-compose.yml"));
        assertTrue(compose.contains("image: axllent/mailpit"), compose);
        assertTrue(compose.contains("MAIL_HOST: mailpit"), compose);
        // a notification of the model: its event in, an email out
        var notification = read("AvisoDeCompraNotification.java");
        assertTrue(notification.contains("event.get(\"cliente\")"), "to the event's recipient: " + notification);
        assertTrue(notification.contains("NOTIFY_PROMOTORA"), "and to the role's people: " + notification);
        assertTrue(notification.contains("mail.send(address, fill(SUBJECT, event, false), fill(BODY, event, true))"), notification);
        var ventasYaml = Files.readString(all.resolve("ventas/ventas-app/src/main/resources/application.yaml"));
        assertTrue(ventasYaml.contains("avisoDeCompraNotification"), "bound to its topic: " + ventasYaml);
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
        return read(name, null);
    }

    private String read(String name, String under) throws Exception {
        // google-java-format wraps where it likes: compare on single spaces
        return Files.readString(file(name, under).orElseThrow(() -> new AssertionError(name + " not generated")))
                .replaceAll("\\s+", " ").replace("( ", "(").replace(" )", ")").replace(". ", ".").replace(" .", ".");
    }
}
