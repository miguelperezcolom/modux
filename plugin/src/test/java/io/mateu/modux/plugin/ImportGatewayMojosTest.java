package io.mateu.modux.plugin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@code import-openapi} and {@code import-asyncapi} write to the project's model, like every other
 * goal — not to the {@code .dev/data/model-driven-store.yaml} store they defaulted to before.
 */
class ImportGatewayMojosTest {

    private static final String OPENAPI = """
            {
              "openapi": "3.0.0",
              "info": { "title": "Payments API", "version": "1.0.0" },
              "servers": [ { "url": "http://localhost:9090" } ],
              "paths": {
                "/payments": {
                  "post": { "operationId": "pay", "responses": { "200": { "description": "ok" } } }
                }
              }
            }
            """;

    private static void set(Object target, String field, Object value) throws Exception {
        var f = target.getClass().getDeclaredField(field);
        f.setAccessible(true);
        f.set(target, value);
    }

    /** A repository initialised from the IDE: its catalog is `.modux/`, there is no `modux/`. */
    private static Path catalog(Path tmp) throws Exception {
        var catalog = tmp.resolve(".modux");
        Files.createDirectories(catalog);
        Files.writeString(catalog.resolve("index.yaml"), "formatVersion: 1\ncounts: {}\n");
        return catalog;
    }

    @Test
    void importOpenApiWritesToTheProjectsModel(@TempDir Path tmp) throws Exception {
        var catalog = catalog(tmp);
        var contract = tmp.resolve("payments.json");
        Files.writeString(contract, OPENAPI);

        var mojo = new ImportOpenApiMojo();
        set(mojo, "modelPath", tmp.resolve(ModuxModel.DEFAULT_PATH).toString());
        set(mojo, "filePath", contract.toString());
        mojo.execute();

        var gateways = catalog.resolve("gateways");
        assertTrue(Files.isDirectory(gateways), "the gateway did not land in the model");
        try (var files = Files.list(gateways)) {
            assertTrue(files.findAny().isPresent());
        }
        assertFalse(Files.exists(tmp.resolve(".dev")), "nothing written to the old default store");
    }

    @Test
    void theDeprecatedSpecFileStillWins() {
        assertEquals(Path.of("/x/store.yaml"), ModuxModel.modelFile("/nowhere/modux", "/x/store.yaml"));
        assertEquals(Path.of("/nowhere/modux"), ModuxModel.modelFile("/nowhere/modux", null));
    }

    @Test
    void importAsyncApiWritesToTheProjectsModelToo(@TempDir Path tmp) throws Exception {
        var model = tmp.resolve(ModuxModel.DEFAULT_PATH);
        Files.createDirectories(model);
        Files.writeString(model.resolve("index.yaml"), "formatVersion: 1\ncounts: {}\n");
        var contract = tmp.resolve("orders-events.yaml");
        Files.writeString(contract, """
                asyncapi: 2.6.0
                info: {title: Orders events, version: 1.0.0}
                channels:
                  orders.placed:
                    publish:
                      message: {name: OrderPlaced}
                """);

        var mojo = new ImportAsyncApiMojo();
        set(mojo, "modelPath", model.toString());
        set(mojo, "filePath", contract.toString());
        mojo.execute();

        var events = model.resolve("domainEvents");
        assertTrue(Files.isDirectory(events), "the event did not land in the model");
        try (var files = Files.list(events)) {
            assertTrue(files.findAny().isPresent());
        }
        assertFalse(Files.exists(tmp.resolve(".dev")), "nothing written to the old default store");
    }
}
