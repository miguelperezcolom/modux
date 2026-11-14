package io.mateu.modux.modeldrivengenerator.infra.in.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The editor polls {@code /version} and reads a moved fingerprint as "the model changed outside
 * this editor" (it reloads and wipes the undo history). The store watcher re-reads the files after
 * our own writes whenever its events arrive late (macOS polls), so reading back what we just wrote
 * must not move the fingerprint — only a real change of content may.
 */
@SpringBootTest
class EditorVersionStabilityTest {

    static {
        System.setProperty("modux.model-file",
                new java.io.File("../sample/hla-booking/model-driven-store.yaml").getAbsolutePath());
    }

    @Autowired
    EditorApiController controller;

    @Autowired
    CommonFileRepository repository;

    final ObjectMapper mapper = new ObjectMapper();

    @Test
    void reading_back_our_own_write_keeps_the_version_and_a_real_change_moves_it() throws Exception {
        var dir = Files.createTempDirectory("version-stability").resolve("modux");
        Files.createDirectories(dir);
        repository.loadFrom(dir.toAbsolutePath().toString());

        apply("""
                {"kind":"add-boundedContext","id":"bc-sales","name":"Sales"}""");
        apply("""
                {"kind":"add-external-system","id":"ext-mailer","name":"Mailer"}""");
        var written = controller.version().get("version");

        repository.reload(); // what the store watcher does when our own write echoes back late
        assertThat(controller.version().get("version")).isEqualTo(written);

        Files.writeString(dir.resolve("externalSystems").resolve("ext-mailer.yaml"),
                "id: \"ext-mailer\"\nname: \"Mail relay\"\n");
        repository.reload();
        assertThat(controller.version().get("version")).isNotEqualTo(written);
    }

    private void apply(String commandJson) throws Exception {
        controller.apply(mapper.readValue(commandJson, EditorApiController.EditorCommand.class));
    }
}
