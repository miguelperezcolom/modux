package io.mateu.modux.modeldrivengenerator.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * That a workflow actually generates its EventConductor definition.
 *
 * <p>The defect this closes was a silence: {@code GenerateCodeUseCase} read {@code sagas} and
 * never {@code workflows}, so once {@code migrate-sagas-to-workflows} had fused them — converting
 * each saga and DELETING it — the model generated no orchestration at all. Nothing failed;
 * the {@code .workflow.json} files simply stopped being written.
 */
@SpringBootTest
class WorkflowGenerationTest {

    @Autowired CommonFileRepository repository;
    @Autowired GenerateCodeUseCase generateCode;

    /**
     * A model whose orchestration lives in a WORKFLOW — the shape a model has after the fusion.
     * The trigger's use case is what decides where the definition lands.
     */
    private static Path model(Path tmp, String output) throws Exception {
        var model = tmp.resolve("modux");
        for (var dir : List.of("projects", "services", "modules", "boundedContexts", "useCases",
                "workflows", "roles", "pages", "models")) {
            Files.createDirectories(model.resolve(dir));
        }
        Files.writeString(model.resolve("index.yaml"), """
                formatVersion: 1
                counts:
                  projects: 1
                  services: 1
                  modules: 1
                  boundedContexts: 1
                  useCases: 2
                  workflows: 1
                  roles: 1
                """);
        Files.writeString(model.resolve("projects/booking.yaml"), """
                id: booking
                name: Booking
                packageName: com.acme.booking
                outputPath: %s
                serviceIds:
                  - svc-res
                """.formatted(output));
        Files.writeString(model.resolve("services/svc-res.yaml"), """
                id: svc-res
                name: reservas
                moduleIds:
                  - mod-res
                """);
        Files.writeString(model.resolve("modules/mod-res.yaml"), """
                id: mod-res
                name: reservas
                boundedContextId: bc-res
                main: true
                """);
        Files.writeString(model.resolve("boundedContexts/bc-res.yaml"), """
                id: bc-res
                name: Reservas
                useCaseIds:
                  - uc-arrancar
                  - uc-cobrar
                """);
        Files.writeString(model.resolve("useCases/uc-arrancar.yaml"), "id: uc-arrancar\nname: Arrancar\n");
        Files.writeString(model.resolve("useCases/uc-cobrar.yaml"), "id: uc-cobrar\nname: Cobrar\n");
        Files.writeString(model.resolve("roles/act-recep.yaml"), "id: act-recep\nname: Recepcion\n");
        Files.writeString(model.resolve("workflows/wf-checkin.yaml"), """
                id: wf-checkin
                name: Checkin
                triggerUseCaseId: uc-arrancar
                steps:
                  - id: s-revisar
                    name: Revisar
                    roleId: act-recep
                  - id: s-cobrar
                    name: Cobrar
                    targetUseCaseId: uc-cobrar
                    dependsOnStepIds:
                      - s-revisar
                """);
        return model;
    }

    private static Path generatedDefinition(Path output) throws Exception {
        try (Stream<Path> walk = Files.walk(output)) {
            return walk.filter(p -> p.getFileName().toString().endsWith(".workflow.json"))
                    .findFirst().orElse(null);
        }
    }

    @Test
    void aWorkflowGeneratesItsEventConductorDefinition(@TempDir Path tmp) throws Exception {
        var output = tmp.resolve("out");
        repository.loadFrom(model(tmp, output.toString()).toString());

        generateCode.handle(new GenerateCodeCommand("booking", output.toString(), null, true));

        var definition = generatedDefinition(output);
        assertThat(definition)
                .describedAs("no se generó ninguna definición de workflow — la orquestación"
                        + " desaparecía del output en silencio")
                .isNotNull();
        assertThat(definition.getFileName().toString()).isEqualTo("Checkin.workflow.json");
    }

    /** EventConductor loads from classpath:/workflows/*.json, so it must live inside a module. */
    @Test
    void theDefinitionLandsWhereTheEngineWillFindIt(@TempDir Path tmp) throws Exception {
        var output = tmp.resolve("out");
        repository.loadFrom(model(tmp, output.toString()).toString());

        generateCode.handle(new GenerateCodeCommand("booking", output.toString(), null, true));

        assertThat(output.relativize(generatedDefinition(output)).toString().replace('\\', '/'))
                .isEqualTo("reservas/reservas/src/main/resources/workflows/Checkin.workflow.json");
    }

    /**
     * The workflows RUN: on EventConductor's orchestrator, as is, with the generated definitions and
     * configuration mounted; it reaches the use cases over REST as the system identity.
     */
    @Test
    void theWorkflowsRunOnEventConductorsOrchestrator(@TempDir Path tmp) throws Exception {
        var output = tmp.resolve("out");
        repository.loadFrom(model(tmp, output.toString()).toString());

        generateCode.handle(new GenerateCodeCommand("booking", output.toString(), null, false));

        var definition = Files.readString(output.resolve("procesos/workflows/Checkin.workflow.json"));
        assertThat(definition).contains("\"type\" : \"HTTP_CALL\"", "\"path\" : \"/v1/cobrar\"", "\"status\" : \"ACTIVE\"");
        var config = Files.readString(output.resolve("procesos/config/application.yaml"));
        assertThat(config).contains("base-url: ${RESERVAS_URL:http://reservas:8080}", "auth: sistema",
                "username: sistema", "password: ${MODUX_SYSTEM_PASSWORD}");
        var compose = Files.readString(output.resolve("docker-compose.yml"));
        assertThat(compose).contains("image: ${EC_ORCHESTRATOR_IMAGE:-miguelperezcolom/orchestrator-standalone-app:2.38.1}",
                "WORKFLOW_DEFINITIONS_DIRS: /workflows", "./procesos/config:/config:ro",
                "MODUX_SYSTEM_PASSWORD: ${MODUX_SYSTEM_PASSWORD:-sistema-local}", "CREATE DATABASE procesos");
        // the use case a step runs answers over REST, and the system identity may sign in
        try (Stream<Path> walk = Files.walk(output)) {
            assertThat(walk.anyMatch(p -> p.getFileName().toString().equals("CobrarController.java"))).isTrue();
        }
        try (Stream<Path> walk = Files.walk(output)) {
            var security = walk.filter(p -> p.getFileName().toString().equals("SecurityConfig.java"))
                    .filter(p -> p.toString().contains("reservas")).findFirst().orElseThrow();
            assertThat(Files.readString(security)).contains("withUsername(\"sistema\")", "roles(\"SISTEMA\")");
        }
    }

    /** The whole point: a human step reaches the engine AS a human step. */
    @Test
    void theHumanStepIsAUserTaskAndNotAnAction(@TempDir Path tmp) throws Exception {
        var output = tmp.resolve("out");
        repository.loadFrom(model(tmp, output.toString()).toString());

        generateCode.handle(new GenerateCodeCommand("booking", output.toString(), null, true));

        var json = new ObjectMapper().readTree(Files.readString(generatedDefinition(output)));
        var steps = json.get("steps");
        assertThat(steps.get(0).get("type").asText()).isEqualTo("USER_TASK");
        assertThat(steps.get(1).get("type").asText()).isEqualTo("ACTION");
        assertThat(steps.get(1).get("preconditionStepIds").get(0).asText()).isEqualTo("s-revisar");
    }

    @Test
    void theGeneratedDefinitionSatisfiesEventConductorsSchema(@TempDir Path tmp) throws Exception {
        var output = tmp.resolve("out");
        repository.loadFrom(model(tmp, output.toString()).toString());

        generateCode.handle(new GenerateCodeCommand("booking", output.toString(), null, true));

        var json = new ObjectMapper().readTree(Files.readString(generatedDefinition(output)));
        var known = io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                .EventConductorSchema.stepTypes();
        var declared = io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                .EventConductorSchema.stepFields();
        assertThat(json.hasNonNull("name")).isTrue();
        for (var step : json.get("steps")) {
            assertThat(known).contains(step.get("type").asText());
            step.fieldNames().forEachRemaining(field -> assertThat(declared).contains(field));
        }
    }
}
