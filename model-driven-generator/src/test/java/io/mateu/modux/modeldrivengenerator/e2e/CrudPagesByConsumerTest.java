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

    /** With the DevOps artifacts too (deploy, compose, scripts). */
    private Path generateAll(String storeFile) throws Exception {
        repository.loadFrom(storeFile);
        var output = Files.createTempDirectory("modux-crud-consumers");
        generateCodeUseCase.handle(new GenerateCodeCommand("editorial", output.toString(), null, false));
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

    @Test
    void a_crud_route_never_collides_with_the_path_of_its_app() throws Exception {
        // a shell federating the app strips /autores and opens the app's home: the CRUD would be unreachable
        var store = Files.createTempFile("ui-crud-app-path", ".yaml");
        Files.writeString(store, Files.readString(STORE).replace("  title: \"Backoffice\"\n", "  title: \"Backoffice\"\n  path: \"/autores\"\n"));
        var home = read(generate(store.toString()), "Home.java");
        assertTrue(home.contains("AutorCrudOrchestrator autoresList;"), home);
        assertTrue(home.contains("@io.mateu.uidl.annotations.Label(\"Autores\")"), "the menu keeps the modelled label: " + home);
    }

    @Test
    void a_field_named_after_an_aggregate_with_pages_is_a_lookup() throws Exception {
        var store = Files.createTempFile("ui-crud-lookup", ".yaml");
        Files.writeString(store, Files.readString(STORE).replace("{id: \"f-t\",",
                "{id: \"f-ref\", name: \"autorId\", basicType: true, type: string}, {id: \"f-t\","));
        var viewModel = read(generate(store.toString()), "TemaViewModel.java");
        assertTrue(viewModel.contains("AutorIdOptionsSupplier.class"), viewModel);
    }

    @Test
    void a_delete_with_modelled_rules_is_the_one_the_screen_runs() throws Exception {
        var store = Files.createTempFile("ui-crud-delete", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]",
                        "aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]\n  useCaseIds: [\"uc-eliminarAgg-autor\"]")
                + """
                useCases:
                - id: "uc-eliminarAgg-autor"
                  name: "EliminarAutor"
                  steps:
                  - {id: "s1", name: "comprobar", type: "Custom", intent: "Rechaza si tiene libros"}
                  - {id: "s2", name: "deleteAutor", type: "Custom", aggregateId: "agg-autor"}
                """);
        var adapter = read(generate(store.toString()), "AutorCrudAdapter.java");
        assertTrue(adapter.contains("EliminarAutorCommand"), adapter);
    }

    @Test
    void an_event_another_service_consumes_is_sent_through_its_publisher() throws Exception {
        var store = Files.createTempFile("ui-crud-event", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]",
                        "aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]\n  useCaseIds: [\"uc-avisar\"]\n  domainEventIds: [\"ev-avisado\"]\n  integrationEventIds: [\"ie-avisado\"]")
                + """
                domainEvents:
                - {id: "ev-avisado", name: "Avisado"}
                integrationEvents:
                - {id: "ie-avisado", name: "Avisado", topicName: "editorial.catalogo.avisado"}
                useCases:
                - id: "uc-avisar"
                  name: "Avisar"
                  steps:
                  - {id: "s1", name: "publishAvisado", type: "PublishDomainEvent", domainEventId: "ev-avisado"}
                """);
        var useCase = read(generate(store.toString()), "AvisarUseCase.java");
        assertTrue(useCase.contains("avisadoPublisher.publish("), useCase);
        assertFalse(useCase.contains("streamBridge.send"), "a local channel no subscriber listens on: " + useCase);
    }

    @Test
    void with_an_outbox_the_event_is_stored_in_the_transaction_of_the_state_change() throws Exception {
        var store = Files.createTempFile("ui-crud-outbox", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("moduleIds: [\"bc-catalogo-main\"]}", "moduleIds: [\"bc-catalogo-main\"], outboxEnabled: true}")
                .replace("aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]",
                        "aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]\n  useCaseIds: [\"uc-avisar\"]\n  domainEventIds: [\"ev-avisado\"]")
                + """
                domainEvents:
                - {id: "ev-avisado", name: "Avisado"}
                useCases:
                - id: "uc-avisar"
                  name: "Avisar"
                  steps:
                  - {id: "s1", name: "publishAvisado", type: "PublishDomainEvent", domainEventId: "ev-avisado"}
                """);
        var out = generate(store.toString());
        assertTrue(read(out, "Outbox.java").contains("implements StreamOperations"), "every send goes through the outbox");
        assertTrue(read(out, "OutboxRelay.java").contains("skip locked"));
        assertTrue(read(out, "V1__baseline.sql").contains("CREATE TABLE IF NOT EXISTS modux_outbox"));
        assertTrue(read(out, "AvisarUseCase.java").contains("@Transactional"), "state and event commit together");

        var without = generate(STORE.toString());
        assertFalse(file(without, "Outbox.java").isPresent(), "the outbox is opt-in per service");
    }

    @Test
    void an_aggregate_with_operations_changes_only_through_them() throws Exception {
        var store = Files.createTempFile("ui-crud-operations", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("- {id: \"agg-autor\", name: \"Autor\", modelId: \"model-autor\"}",
                        "- {id: \"agg-autor\", name: \"Autor\", modelId: \"model-autor\", operations: [{id: \"op-ren\", name: \"renombrar\", type: \"CUSTOM\", inputModelId: \"model-ren\", intent: \"Cambia el nombre\"}]}")
                .replace("aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]",
                        "aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]\n  useCaseIds: [\"uc-ren\"]")
                .replace("models:\n", "models:\n- {id: \"model-ren\", name: \"Renombrar\", fields: [{id: \"f-n\", name: \"nombre\", basicType: true, type: string}]}\n"
                        + "- {id: \"model-uc-ren\", name: \"RenombrarInput\", fields: [{id: \"f-r1\", name: \"autorId\", basicType: true, type: string}, {id: \"f-r2\", name: \"nombre\", basicType: true, type: string}]}\n")
                + """
                useCases:
                - id: "uc-ren"
                  name: "Renombrar"
                  inputModelId: "model-uc-ren"
                  steps:
                  - {id: "s1", name: "leer", type: "ReadAggregate", aggregateId: "agg-autor"}
                  - {id: "s2", name: "renombrar", type: "CallAggregateOperation", aggregateId: "agg-autor", operationId: "op-ren"}
                  - {id: "s3", name: "guardar", type: "SaveAggregate", aggregateId: "agg-autor"}
                """);
        var out = generate(store.toString());
        var aggregate = read(out, "Autor.java");
        assertFalse(aggregate.contains("public void update("), "a generic update would skip the operations' rules: " + aggregate);
        assertTrue(aggregate.contains("RenombrarAutorOperation.Input input"), aggregate);
        assertTrue(read(out, "RenombrarAutorOperation.java").contains("record Input(String nombre)"));
        var useCase = read(out, "RenombrarUseCase.java");
        assertTrue(useCase.replaceAll("\\s+", " ").contains("autor.renombrar( renombrarAutorOperation, new"), "the use case runs the operation itself: " + useCase);
        assertTrue(useCase.contains("command.autorId()"), "an {aggregate}Id loads it (a lookup on screen): " + useCase);
        assertFalse(file(out, "RenombrarSteps.java").isPresent(), "nothing is left to a use-case hook");
        assertTrue(read(out, "UpdateAutorUseCase.java").contains("no se edita directamente"));
        assertTrue(read(out, "AutorCrudOrchestrator.java").contains("canEdit()"));
    }

    @Test
    void a_user_without_the_role_is_told_so_and_a_listing_reads_like_the_screens() throws Exception {
        var store = Files.createTempFile("ui-crud-roles", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]",
                        "aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]\n  useCaseIds: [\"uc-firmar\"]")
                .replace("{id: \"f-t\",", "{id: \"f-ref\", name: \"autorId\", basicType: true, type: string}, {id: \"f-p\", name: \"precio\", basicType: true, type: money}, {id: \"f-t\",")
                + """
                useCases:
                - id: "uc-firmar"
                  name: "Firmar"
                  allowedRoles: ["EDITOR"]
                  steps:
                  - {id: "s1", name: "firmar", type: "Custom", intent: "Firma"}
                """);
        var out = generate(store.toString());
        var useCase = read(out, "FirmarUseCase.java");
        assertTrue(useCase.replaceAll("\\s+", "").contains("HandleAuthorizationDenied(handlerClass=es.editorial.application.Forbidden.class)"), useCase);
        assertTrue(read(out, "Forbidden.java").contains("BusinessRuleException.forbidden("), "the screens show a UserFacingException as it is");
        var listing = read(out, "TemaDBQueryService.java");
        assertTrue(listing.contains("label(autorIdLabels"), "a reference reads as the label of what it names: " + listing);
        assertTrue(listing.contains("decimal(") && listing.contains(", true)"), "money with two decimals: " + listing);
    }

    @Test
    void each_environment_gets_its_manifest_and_the_hosts_that_belong_to_it() throws Exception {
        var store = Files.createTempFile("ui-crud-deploy", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("moduleIds: [\"bc-catalogo-main\"]}", "moduleIds: [\"bc-catalogo-main\"], urlIds: [\"url-pro\", \"url-otra\", \"url-dev\"]}")
                + """
                urls:
                - {id: "url-pro", name: "pro", url: "https://editorial.ec1.acme.io"}
                - {id: "url-otra", name: "otra", url: "https://editorial.otro.dominio"}
                - {id: "url-dev", name: "dev", url: "https://editorial-dev.lab.local", environment: "DEV"}
                deployments:
                - id: "deployment-editorial"
                  dockerRegistry: "docker.io/acme"
                  environments:
                  - {environment: "DEV", kubernetesContext: "kind-lab"}
                  - {environment: "PROD", kubernetesContext: "cloud", ingressDomain: "ec1.acme.io", certIssuer: "letsencrypt", dnsProvider: "NETLIFY"}
                """);
        var out = generateAll(store.toString());
        var prod = read(out, "prod.yaml");
        assertTrue(prod.contains("host: editorial.ec1.acme.io"), "a URL in the environment's domain: " + prod);
        assertFalse(prod.contains("otro.dominio") || prod.contains("lab.local"), "nor another domain, nor another environment's");
        assertTrue(prod.contains("cert-manager.io/cluster-issuer: letsencrypt"));
        assertTrue(prod.contains("image: docker.io/acme/editorial-editorial:__TAG__"), prod);
        assertTrue(prod.contains("jdbc:postgresql://postgres:5432/editorial") && prod.contains("name: kafka"));
        assertTrue(prod.contains("secretKeyRef: {name: editorial-db, key: password}"), "no password in the file");
        assertTrue(read(out, "dev.yaml").contains("host: editorial-dev.lab.local"), "a URL that names its environment");
        var targets = read(out, "targets.json");
        assertTrue(targets.contains("\"name\" : \"local\"") && targets.contains("\"context\" : \"kind-lab\""), targets);
    }

    @Test
    void a_projection_is_wired_to_its_event_and_a_query_in_the_menu_gets_a_listing() throws Exception {
        var store = Files.createTempFile("ui-crud-readmodel", ".yaml");
        Files.writeString(store, Files.readString(STORE)
                .replace("aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]",
                        "aggregateIds: [\"agg-autor\", \"agg-tema\", \"agg-factura\"]\n  domainEventIds: [\"ev-alta\"]\n  readModelIds: [\"rm-log\"]\n  projectionIds: [\"pr-log\"]")
                .replace("  - {id: \"mi-autores\",", "  - {id: \"mi-log\", label: \"Altas\", queryServiceId: \"qs-log\"}\n  - {id: \"mi-autores\",")
                .replace("models:\n", "models:\n- {id: \"model-log\", name: \"Log\", fields: [{id: \"f-l\", name: \"autor\", basicType: true, type: string}]}\n")
                + """
                domainEvents:
                - {id: "ev-alta", name: "Alta", modelId: "model-log"}
                readModels:
                - {id: "rm-log", name: "LogView", boundedContextId: "bc-catalogo", modelId: "model-log"}
                projections:
                - id: "pr-log"
                  name: "Log"
                  readModelId: "rm-log"
                  handlers:
                  - {id: "h", name: "onAlta", domainEventId: "ev-alta", type: "Create"}
                queryServices:
                - id: "qs-log"
                  name: "LogQueries"
                  boundedContextId: "bc-catalogo"
                  operations:
                  - {id: "op", name: "list", outputModelId: "model-log", cardinality: "Page"}
                """);
        var out = generate(store.toString());
        assertTrue(read(out, "application.yaml").contains("logProjectionOnAlta-in-0"), "the projection never receives its events");
        assertTrue(read(out, "LogProjection.java").contains("randomUUID"), "every event of an append-only view is its own row");
        assertTrue(file(out, "LogViewListing.java").isPresent());
        assertTrue(read(out, "Home.java").contains("LogViewListing"));
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
