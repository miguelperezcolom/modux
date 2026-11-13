package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * A service no UI consumes, reached over REST — the shape the IDE plugin draws when an external system is
 * connected to an aggregate. Generation-only (no compile/boot): the generated sources are inspected.
 * Each assertion is a defect found building a system with the plugin (docs/specs/biblioteca-prestamos.md).
 */
@SpringBootTest
class ApiOnlyGenerationTest {

    static {
        System.setProperty("modux.model-file",
                new java.io.File("src/test/resources/examples/api-only-store.yaml").getAbsolutePath());
    }

    @Autowired
    GenerateCodeUseCase generateCodeUseCase;

    @Autowired
    CommonFileRepository repository;

    static Path output;

    @BeforeAll
    static void out() throws Exception {
        output = Files.createTempDirectory("modux-api-only-gen");
    }

    private Path generate() throws Exception {
        repository.loadFrom(Path.of("src/test/resources/examples/api-only-store.yaml").toAbsolutePath().toString());
        generateCodeUseCase.handle(new GenerateCodeCommand("biblioteca", output.toString(), null, true));
        return output;
    }

    @Test
    void with_no_ui_consumer_there_are_no_crud_pages_menus_or_home() throws Exception {
        var out = generate();
        assertFalse(file(out, "LibroCrudOrchestrator.java").isPresent(), "CRUD pages generated with no UI consuming them");
        assertFalse(file(out, "PrestamosMenu.java").isPresent(), "a module menu generated with nothing to list");
        assertFalse(file(out, "Home.java").isPresent(), "a Home generated with nothing to show");
        assertTrue(file(out, "LibroAPIController.java").isPresent(), "the REST contract was not generated");
    }

    @Test
    void the_derived_crud_rests_on_the_built_in_one() throws Exception {
        var out = generate();
        var create = read(out, "CrearLibroUseCase.java");
        assertTrue(create.contains("createLibro.handle(new CreateLibroCommand(command.isbn(), command.titulo()))"), create);
        assertTrue(create.contains("new LibroCreadoEvent(id)"), "the lifecycle event must carry the real id:\n" + create);
        assertFalse(create.contains("TODO"), create);
        var update = read(out, "ActualizarLibroCommand.java");
        assertTrue(update.contains("String id,") && update.contains("withId(String id)"), update);
    }

    @Test
    void the_rest_contract_reads_the_path_id_and_pages_the_listing() throws Exception {
        var controller = read(generate(), "LibroAPIController.java");
        assertTrue(controller.contains("@PathVariable String id, @RequestBody ActualizarLibroCommand command"), controller);
        assertTrue(controller.contains("eliminarLibro.handle(new EliminarLibroCommand(id))"), controller);
        assertTrue(controller.contains("new io.mateu.uidl.data.Pageable(page, size"), controller);
    }

    @Test
    void a_service_without_roles_is_open_and_starts_with_a_jackson2_mapper() throws Exception {
        var out = generate();
        var security = read(out, "SecurityConfig.java");
        assertTrue(security.contains("anyRequest().permitAll()"), security);
        var app = read(out, "BibliotecaApplication.java");
        assertTrue(app.contains("com.fasterxml.jackson.databind.ObjectMapper objectMapper()"), app);
    }

    @Test
    void a_use_case_an_external_system_calls_gets_its_rest_entry_and_rejections_say_why() throws Exception {
        var out = generate();
        assertTrue(file(out, "PrestarLibroController.java").isPresent(),
                "a use case called through the inbound ACL has no REST entry");
        assertTrue(read(out, "application.yaml").contains("include-message: always") && read(out, "application.yaml").contains("    web:\n        error:"));
    }

    @Test
    void steps_the_template_cannot_write_become_hooks_not_todos() throws Exception {
        var out = generate();
        var useCase = read(out, "ReservarLibroUseCase.java");
        assertFalse(useCase.contains("TODO"), useCase);
        assertTrue(useCase.contains("steps.callLibro(command);") && useCase.contains("steps.callPrestarLibro(command);"), useCase);
        var hook = read(out, "ReservarLibroSteps.java");
        assertTrue(hook.contains("Opera sobre Libro"), hook);
        assertTrue(file(out, "DefaultReservarLibroSteps.java").isPresent(), "no developer-owned default for the hook");
    }

    @Test
    void a_scheduled_trigger_really_runs_its_use_case_and_the_listing_searches_every_text_column() throws Exception {
        var out = generate();
        var scheduler = read(out, "DiarioRetrasosScheduler.java");
        assertTrue(scheduler.replaceAll("\\s+", "").contains("asSystem(()->useCase.handle(newReservarLibroCommand(null,null)))"),
                "a scheduled run acts as the system: " + scheduler);
        assertTrue(scheduler.contains("${DIARIO_RETRASOS_CRON:0 0 6 * * *}"), scheduler);
        assertTrue(read(out, "BibliotecaApplication.java").contains("@org.springframework.scheduling.annotation.EnableScheduling"));
        var query = read(out, "LibroDBQueryService.java");
        assertTrue(query.contains("lower(CAST(col_isbn AS varchar)) LIKE ? OR lower(CAST(col_titulo AS varchar)) LIKE ?"), query);
    }

    @Test
    void a_flow_with_no_field_list_carries_the_whole_event_payload() throws Exception {
        var out = generate();
        var event = read(out, "PrestamoRetrasado.java");
        assertTrue(event.contains("String prestamoId") && event.contains("LocalDate fechaVencimiento"), event);
        var subscription = read(out, "AvisosPrestamoRetrasadoSubscription.java");
        assertTrue(subscription.contains("import java.time.LocalDate;"), subscription);
        assertFalse(subscription.contains("TODO"), subscription);
        // nobody is signed in on a consumer: it acts as the system, and roles decide as everywhere
        var compact = subscription.replaceAll("\\s+", "");
        assertTrue(compact.contains("returnmessage->asSystem(()->{"), subscription);
        assertTrue(compact.contains("SimpleGrantedAuthority(\"ROLE_SISTEMA\")"), subscription);
        assertTrue(read(out, "BibliotecaApplication.java").contains("WRITE_DATES_AS_TIMESTAMPS"), "dates must travel as ISO");
    }

    @Test
    void a_business_rejection_has_its_exception_and_its_http_answer() throws Exception {
        var out = generate();
        assertTrue(read(out, "BusinessRuleException.java").contains("public static BusinessRuleException conflict(String message)"));
        var handler = read(out, "BusinessRuleExceptionHandler.java");
        assertTrue(handler.contains("case CONFLICT -> HttpStatus.CONFLICT"), handler);
    }

    private static Optional<Path> file(Path root, String name) throws Exception {
        try (var s = Files.walk(root)) {
            return s.filter(p -> p.getFileName().toString().equals(name)).findFirst();
        }
    }

    private static String read(Path root, String name) throws Exception {
        return Files.readString(file(root, name).orElseThrow(() -> new AssertionError(name + " not generated")));
    }
}
