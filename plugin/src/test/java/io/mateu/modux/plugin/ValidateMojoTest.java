package io.mateu.modux.plugin;

import org.apache.maven.plugin.MojoFailureException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The reference checker, exercised against the versioned sample rather than fixtures: a
 * validator that fails the build has to be clean on a model modux itself ships, or it is
 * worthless.
 */
class ValidateMojoTest {

    private static final Path SAMPLE =
            Path.of("..", "sample", "hla-booking", "model-driven-store.yaml");

    private static ValidateMojo mojoFor(Path model) throws Exception {
        var mojo = new ValidateMojo();
        set(mojo, "modelPath", model.toString());
        set(mojo, "ignoredReferences", new java.util.ArrayList<String>());
        set(mojo, "reportOnly", false);
        return mojo;
    }

    private static void set(Object target, String field, Object value) throws Exception {
        var f = target.getClass().getDeclaredField(field);
        f.setAccessible(true);
        f.set(target, value);
    }

    @Test
    void the_shipped_sample_has_no_dangling_references() throws Exception {
        var mojo = mojoFor(SAMPLE);

        assertDoesNotThrow(mojo::execute);
    }

    @Test
    void a_dangling_reference_fails_the_build(@TempDir Path dir) throws Exception {
        var model = dir.resolve("model.yaml");
        Files.writeString(model, """
                projects:
                  - id: proj-1
                    name: Demo
                    packageName: com.example
                boundedContexts:
                  - id: bc-1
                    name: Booking
                    aggregateIds:
                      - agg-missing
                """);

        var failure = assertThrows(MojoFailureException.class, mojoFor(model)::execute);

        assertTrue(failure.getMessage().contains("1 dangling reference"), failure.getMessage());
    }

    @Test
    void a_reference_that_resolves_is_accepted(@TempDir Path dir) throws Exception {
        var model = dir.resolve("model.yaml");
        Files.writeString(model, """
                projects:
                  - id: proj-1
                    name: Demo
                    packageName: com.example
                boundedContexts:
                  - id: bc-1
                    name: Booking
                    aggregateIds:
                      - agg-1
                aggregates:
                  - id: agg-1
                    name: Booking
                """);

        assertDoesNotThrow(mojoFor(model)::execute);
    }

    @Test
    void reportOnly_downgrades_a_failure_to_a_warning(@TempDir Path dir) throws Exception {
        var model = dir.resolve("model.yaml");
        Files.writeString(model, """
                projects:
                  - id: proj-1
                    name: Demo
                boundedContexts:
                  - id: bc-1
                    aggregateIds:
                      - agg-missing
                """);
        var mojo = mojoFor(model);
        set(mojo, "reportOnly", true);

        assertDoesNotThrow(mojo::execute);
    }

    @Test
    void an_ignored_field_is_not_checked(@TempDir Path dir) throws Exception {
        var model = dir.resolve("model.yaml");
        Files.writeString(model, """
                projects:
                  - id: proj-1
                    name: Demo
                boundedContexts:
                  - id: bc-1
                    aggregateIds:
                      - agg-missing
                """);
        var mojo = mojoFor(model);
        set(mojo, "ignoredReferences", new java.util.ArrayList<>(java.util.List.of("aggregateIds")));

        assertDoesNotThrow(mojo::execute);
    }

    @Test
    void a_model_whose_declarations_collide_fails_the_build(@TempDir Path dir) throws Exception {
        var model = dir.resolve("model.yaml");
        Files.writeString(model, """
                projects:
                  - id: proj-1
                    name: Demo
                    packageName: com.example
                services:
                  - id: svc-1
                    name: Pedidos
                    port: 8081
                  - id: svc-2
                    name: Cobros
                    port: 8081
                """);

        var failure = assertThrows(MojoFailureException.class, mojoFor(model)::execute);

        assertTrue(failure.getMessage().contains("error(s) in the model"), failure.getMessage());
    }
}
