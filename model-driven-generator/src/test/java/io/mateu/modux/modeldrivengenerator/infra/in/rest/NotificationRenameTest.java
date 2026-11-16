package io.mateu.modux.modeldrivengenerator.infra.in.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.NotificationEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

/** F2 on a notification renames it, and keeps what it was wired to. */
@SpringBootTest
class NotificationRenameTest {

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
    void a_notification_takes_its_new_name_and_keeps_its_wiring() throws Exception {
        var dir = Files.createTempDirectory("notification-rename").resolve("modux");
        Files.createDirectories(dir);
        repository.loadFrom(dir.toAbsolutePath().toString());

        apply("""
                {"kind":"add-boundedContext","id":"bc-pay","name":"Payments"}""");
        apply("""
                {"kind":"add-notification","id":"ntf-1","name":"Notification","boundedContextId":"bc-pay"}""");
        repository.save(new NotificationEntity("ntf-1", "Notification", "bc-pay", "ev-declined",
                java.util.List.of("EMAIL"), java.util.List.of("role-customer"), null, null, null, null, null));

        apply("""
                {"kind":"rename-element","type":"notification","id":"ntf-1","name":"CardDeclined"}""");

        var renamed = repository.findById("ntf-1", NotificationEntity.class).orElseThrow();
        assertThat(renamed.name()).isEqualTo("CardDeclined");
        assertThat(renamed.eventId()).isEqualTo("ev-declined");
        assertThat(renamed.recipientRoleIds()).containsExactly("role-customer");
        assertThat(renamed.ownerBoundedContextId()).isEqualTo("bc-pay");
    }

    private void apply(String commandJson) throws Exception {
        controller.apply(mapper.readValue(commandJson, EditorApiController.EditorCommand.class));
    }
}
