package io.mateu.modux.modeldrivengenerator.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.infra.in.rest.EditorApiController;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Code boundedContexts through the editor API: a bounded context DISTRIBUTES its elements
 * into boundedContexts, an element lives in one boundedContext of its BC (assigning moves it), and
 * the service says where a boundedContext DEPLOYS — authored with commands and read back
 * from the /model snapshot.
 */
@SpringBootTest
class ModuleCommandsTest {

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
    void a_bounded_context_distributes_its_elements_into_boundedContexts_and_services_deploy_them() throws Exception {
        var dir = Files.createTempDirectory("module-commands");
        repository.loadFrom(dir.resolve("model-driven-store.yaml").toAbsolutePath().toString());

        apply("""
                {"kind":"add-boundedContext","id":"test-mod","name":"Reservas"}""");
        apply("""
                {"kind":"add-aggregate","id":"test-agg","name":"Reserva","boundedContextId":"test-mod"}""");
        apply("""
                {"kind":"add-use-case","id":"test-uc","name":"Reservar","boundedContextId":"test-mod"}""");
        repository.save(ServiceEntity.builder().id("test-svc").name("reservas-svc").build());

        // ── two boundedContexts distribute the BC's elements ─────────────────────────
        apply("""
                {"kind":"add-module","id":"test-cm-core","name":"core","boundedContextId":"test-mod"}""");
        apply("""
                {"kind":"add-module","id":"test-cm-api","name":"api","boundedContextId":"test-mod"}""");
        apply("""
                {"kind":"add-module-element","id":"test-cm-core","elementId":"test-agg"}""");
        apply("""
                {"kind":"add-module-element","id":"test-cm-core","elementId":"test-uc"}""");
        apply("""
                {"kind":"add-service-module","serviceId":"test-svc","id":"test-cm-core"}""");

        var model = controller.model();
        var core = model.modules().stream().filter(c -> "test-cm-core".equals(c.id())).findFirst().orElseThrow();
        assertThat(core.boundedContextId()).isEqualTo("test-mod");
        assertThat(core.elementIds()).containsExactly("test-agg", "test-uc");
        var svc = model.services().stream().filter(s -> "test-svc".equals(s.id())).findFirst().orElseThrow();
        assertThat(svc.moduleIds()).containsExactly("test-cm-core");

        // ── an element lives in ONE boundedContext of its BC: assigning moves it ─────
        apply("""
                {"kind":"add-module-element","id":"test-cm-api","elementId":"test-uc"}""");
        model = controller.model();
        core = model.modules().stream().filter(c -> "test-cm-core".equals(c.id())).findFirst().orElseThrow();
        var api = model.modules().stream().filter(c -> "test-cm-api".equals(c.id())).findFirst().orElseThrow();
        assertThat(core.elementIds()).containsExactly("test-agg");
        assertThat(api.elementIds()).containsExactly("test-uc");

        // ── removing a boundedContext: the service lets go, elements become undistributed ──
        apply("""
                {"kind":"remove-module-element","id":"test-cm-api","elementId":"test-uc"}""");
        apply("""
                {"kind":"remove-module","id":"test-cm-core"}""");
        model = controller.model();
        assertThat(model.modules()).noneMatch(c -> "test-cm-core".equals(c.id()));
        svc = model.services().stream().filter(s -> "test-svc".equals(s.id())).findFirst().orElseThrow();
        assertThat(svc.moduleIds()).isEmpty();
        api = model.modules().stream().filter(c -> "test-cm-api".equals(c.id())).findFirst().orElseThrow();
        assertThat(api.elementIds()).isEmpty();

        // teardown
        apply("""
                {"kind":"remove-module","id":"test-cm-api"}""");
        repository.deleteAllById(List.of("test-svc"), ServiceEntity.class);
    }

    @Test
    void renaming_an_aggregate_keeps_everything_else_it_declares() throws Exception {
        var dir = Files.createTempDirectory("rename-aggregate");
        repository.loadFrom(dir.resolve("model-driven-store.yaml").toAbsolutePath().toString());
        apply("""
                {"kind":"add-boundedContext","id":"ren-bc","name":"Contenidos"}""");
        apply("""
                {"kind":"add-aggregate","id":"ren-agg","name":"Borrador","boundedContextId":"ren-bc"}""");
        var lifecycle = new io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.LifecycleEntity(
                "estado", "BORRADOR", List.of("BORRADOR", "PUBLICADA"), List.of(), List.of("BORRADOR"));
        var agg = repository.findById("ren-agg", io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity.class).orElseThrow();
        repository.save(agg.toBuilder().title("Números").description("Lo que se publica").editable(true)
                .lifecycle(lifecycle).build());

        apply("""
                {"kind":"rename-element","type":"aggregate","id":"ren-agg","name":"Numero"}""");

        var renamed = repository.findById("ren-agg", io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity.class).orElseThrow();
        assertThat(renamed.name()).isEqualTo("Numero");
        assertThat(renamed.title()).isEqualTo("Números");
        assertThat(renamed.description()).isEqualTo("Lo que se publica");
        assertThat(renamed.editable()).isTrue();
        assertThat(renamed.lifecycle().editableStates()).containsExactly("BORRADOR");
    }

    private void apply(String commandJson) throws Exception {
        controller.apply(mapper.readValue(commandJson, EditorApiController.EditorCommand.class));
    }
}
