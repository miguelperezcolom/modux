package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * CRUD pages are the surface of a UI consumer: an aggregate gets them when an app has it in its
 * menu, a page is bound to it or a UI shell federates its service — and not otherwise. Generation
 * only (no compile/boot), runs in the normal suite.
 */
@SpringBootTest
class CrudPagesByConsumerTest {

    static final Path STORE = Path.of("src/test/resources/examples/ui-crud-store.yaml").toAbsolutePath();

    static {
        System.setProperty("modux.model-file", STORE.toString());
    }

    @Autowired
    GenerateCodeUseCase generateCodeUseCase;

    @Autowired
    CommonFileRepository repository;

    private Path generate(String storeFile) throws Exception {
        repository.loadFrom(storeFile);
        var output = Files.createTempDirectory("modux-crud-consumers");
        generateCodeUseCase.handle(new GenerateCodeCommand("editorial", output.toString(), null, true));
        return output;
    }

    @Test
    void only_the_aggregates_a_ui_consumes_get_pages() throws Exception {
        var out = generate(STORE.toString());
        assertTrue(file(out, "AutorCrudOrchestrator.java").isPresent(), "in an app's menu: it needs its pages");
        assertTrue(file(out, "TemaViewModel.java").isPresent(), "a page bound to it needs its view model");
        assertFalse(file(out, "FacturaCrudOrchestrator.java").isPresent(), "nothing consumes it");
        assertFalse(file(out, "FacturaIdOptionsSupplier.java").isPresent(), "nothing consumes it");
        assertFalse(file(out, "FacturaE2ETest.java").isPresent(), "there is no page to drive");
        // its core stays: the CRUD is agnostic of who consumes it
        assertTrue(file(out, "CreateFacturaUseCase.java").isPresent());
    }

    @Test
    void the_menus_list_only_what_has_pages() throws Exception {
        var menu = read(generate(STORE.toString()), "CatalogoMenu.java");
        assertTrue(menu.contains("AutorCrudOrchestrator"), menu);
        assertFalse(menu.contains("FacturaCrudOrchestrator"), menu);
    }

    @Test
    void an_app_with_no_service_opens_its_aggregate_in_the_service_that_deploys_it() throws Exception {
        var home = read(generate(STORE.toString()), "Home.java");
        assertTrue(home.contains("import es.editorial.catalogo.infra.in.ui.pages.autor.AutorCrudOrchestrator;"), home);
        assertTrue(home.contains("AutorCrudOrchestrator autores;"), home);
    }

    @Test
    void a_shell_federating_the_service_consumes_all_its_aggregates() throws Exception {
        var store = Files.createTempFile("modux-shell", ".yaml");
        Files.writeString(store, Files.readString(STORE) + """

                uiShells:
                - {id: "sh-portal", name: "Portal", title: "Portal", serviceIds: ["svc-editorial"]}
                """);
        assertTrue(file(generate(store.toString()), "FacturaCrudOrchestrator.java").isPresent());
    }

    @Test
    void a_crud_route_never_collides_with_its_rest_listing() throws Exception {
        // labelled like the aggregate, the route would be /autor: the REST listing's path, so a
        // reload of the screen would show its JSON
        var store = Files.createTempFile("ui-crud-collision", ".yaml");
        Files.writeString(store, Files.readString(STORE).replace("label: \"Autores\"", "label: \"Autor\""));
        var home = read(generate(store.toString()), "Home.java");
        assertTrue(home.contains("AutorCrudOrchestrator autors;"), home);
        assertTrue(home.contains("@io.mateu.uidl.annotations.Label(\"Autor\")"), "the menu keeps the modelled label: " + home);
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
