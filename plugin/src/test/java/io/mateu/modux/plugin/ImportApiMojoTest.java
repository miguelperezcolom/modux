package io.mateu.modux.plugin;

import org.apache.maven.plugin.MojoExecutionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The goal that gives {@code ImportApiEntityUseCase} a door.
 *
 * <p>The capability had none: it used to be reachable through the editor's {@code /import-api}
 * endpoint, and when that endpoint went the use case stayed behind with nothing able to call it.
 * Importing a contract is a build step anyway — it reads a file and writes model elements — so
 * this is where it belonged all along.
 */
class ImportApiMojoTest {

    private static final String OPENAPI = """
            {
              "openapi": "3.0.0",
              "info": { "title": "Booking API", "version": "1.0.0" },
              "paths": {
                "/bookings": {
                  "post": { "operationId": "createBooking", "responses": { "200": { "description": "ok" } } }
                }
              }
            }
            """;

    private static ImportApiMojo mojoFor(Path model, Path contract) throws Exception {
        var mojo = new ImportApiMojo();
        set(mojo, "modelPath", model.toString());
        set(mojo, "filePath", contract.toString());
        return mojo;
    }

    private static void set(Object target, String field, Object value) throws Exception {
        var f = target.getClass().getDeclaredField(field);
        f.setAccessible(true);
        f.set(target, value);
    }

    private static Path model(Path tmp) throws Exception {
        var model = tmp.resolve("modux");
        Files.createDirectories(model);
        Files.writeString(model.resolve("index.yaml"), "formatVersion: 1\ncounts: {}\n");
        return model;
    }

    @Test
    void importsTheContractAsAFirstClassApi(@TempDir Path tmp) throws Exception {
        var contract = tmp.resolve("booking.json");
        Files.writeString(contract, OPENAPI);

        mojoFor(model(tmp), contract).execute();

        var apis = tmp.resolve("modux").resolve("apis");
        assertTrue(Files.isDirectory(apis), "no se escribió ninguna API en el modelo");
        try (var files = Files.list(apis)) {
            assertTrue(files.findAny().isPresent(), "el directorio de APIs quedó vacío");
        }
    }

    /** Deterministic ids: re-running must update in place, which is what makes it safe in CI. */
    @Test
    void reimportingDoesNotDuplicate(@TempDir Path tmp) throws Exception {
        var contract = tmp.resolve("booking.json");
        Files.writeString(contract, OPENAPI);
        var model = model(tmp);

        mojoFor(model, contract).execute();
        var after = names(model.resolve("apis"));
        mojoFor(model, contract).execute();

        assertEquals(after, names(model.resolve("apis")));
    }

    @Test
    void saysSoWhenTheContractIsNotThere(@TempDir Path tmp) throws Exception {
        var mojo = mojoFor(model(tmp), tmp.resolve("no-existe.json"));

        var failure = assertThrows(MojoExecutionException.class, mojo::execute);

        assertTrue(failure.getMessage().contains("Contract not found"), failure.getMessage());
    }

    /** The extension decides when it says so; otherwise the content does. */
    @Test
    void worksOutWhetherAContractIsAWsdl() {
        assertTrue(ImportApiMojo.isWsdl(Path.of("acme.wsdl"), ""));
        assertFalse(ImportApiMojo.isWsdl(Path.of("acme.json"), "{\"definitions\":{}}"));
        assertFalse(ImportApiMojo.isWsdl(Path.of("acme.yaml"), "openapi: 3.0.0"));
        // no extension to go on: a contract naming neither openapi nor swagger, but declaring
        // definitions, is a WSDL
        assertTrue(ImportApiMojo.isWsdl(Path.of("contract"), "<definitions xmlns=\"…\">"));
        assertFalse(ImportApiMojo.isWsdl(Path.of("contract"), "swagger: '2.0'"));
    }

    private static java.util.List<String> names(Path dir) throws Exception {
        if (!Files.isDirectory(dir)) return java.util.List.of();
        try (var files = Files.list(dir)) {
            return files.map(p -> p.getFileName().toString()).sorted().toList();
        }
    }
}
