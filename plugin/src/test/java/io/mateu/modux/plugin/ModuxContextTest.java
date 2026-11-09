package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatehla.GenerateHlaUseCase;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi.ImportAsyncApiUseCase;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.ImportOpenApiUseCase;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Guards the mojo bootstrap against bean-graph growth in the generator: every use case a mojo
 * pulls must be resolvable, with its full transitive constructor graph, from the scanned
 * context. This is exactly the regression that broke `modux:generate` when
 * CommonFileRepository grew its storage-format collaborators.
 */
class ModuxContextTest {

    @Test
    void every_mojo_root_use_case_is_resolvable() throws Exception {
        var store = Files.createTempFile("modux-plugin-test-store", ".yaml");
        System.setProperty("modux.model-file", store.toString());
        try (var ctx = ModuxContext.create()) {
            assertNotNull(ctx.getBean(GenerateCodeUseCase.class));
            assertNotNull(ctx.getBean(ImportOpenApiUseCase.class));
            assertNotNull(ctx.getBean(ImportAsyncApiUseCase.class));
            assertNotNull(ctx.getBean(GenerateHlaUseCase.class));
        } finally {
            Files.deleteIfExists(store);
        }
    }
}
