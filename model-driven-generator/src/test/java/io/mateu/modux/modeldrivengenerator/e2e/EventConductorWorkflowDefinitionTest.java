package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.workflow.EventConductorSchema;
import io.mateu.modux.modeldrivengenerator.application.usecases.workflow.EventConductorWorkflowDefinition;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowGatewayEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowStepEntity;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A modux workflow as the EventConductor definition that runs it.
 *
 * <p>This is the translation that was MISSING: generation only ever read sagas, so a model whose
 * sagas had been fused into workflows generated no orchestration at all — the definitions simply
 * stopped appearing, with nothing saying so.
 *
 * <p>Every assertion here is against EventConductor's own schema, read rather than restated.
 */
class EventConductorWorkflowDefinitionTest {

    private static final String TOPIC = "booking.workflow.checkin";

    private static WorkflowStepEntity step(String id, String name) {
        return WorkflowStepEntity.builder().id(id).name(name).dependsOnStepIds(List.of()).build();
    }

    private static WorkflowEntity workflow(WorkflowStepEntity... steps) {
        return WorkflowEntity.builder()
                .id("wf-checkin").name("Checkin").steps(List.of(steps)).build();
    }

    private static Map<String, Object> definitionOf(WorkflowEntity workflow,
                                                    WorkflowGatewayEntity... gateways) {
        return EventConductorWorkflowDefinition.of(
                workflow, List.of(gateways), pageId -> "form-" + pageId, TOPIC);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> steps(Map<String, Object> definition) {
        return (List<Map<String, Object>>) definition.get("steps");
    }

    @Test
    void everyStepTypeItEmitsIsOneTheEngineUnderstands() {
        var definition = definitionOf(workflow(
                step("s1", "Cobrar").toBuilder().type("ACTION").build(),
                step("s2", "Revisar").toBuilder().type("USER_TASK").formPageId("pg-1").build()),
                new WorkflowGatewayEntity("gw-1", "Split", "SPLIT", List.of("s1"), List.of()));

        var known = EventConductorSchema.stepTypes();
        assertThat(steps(definition)).allSatisfy(s ->
                assertThat(known).contains((String) s.get("type")));
    }

    @Test
    void everyStepCarriesWhatTheSchemaRequires() {
        var definition = definitionOf(workflow(step("s1", "Cobrar")));

        var required = EventConductorSchema.requiredStepFields();
        assertThat(steps(definition)).allSatisfy(s -> assertThat(s).containsKeys(
                required.toArray(String[]::new)));
    }

    @Test
    void emitsNoFieldTheSchemaDoesNotDeclare() {
        var definition = definitionOf(workflow(
                step("s1", "Cobrar").toBuilder()
                        .type("ACTION").compensationUseCaseId("uc-anular")
                        .maxSuccessfulExecutions(3).dependsOnStepIds(List.of("s0")).build()),
                new WorkflowGatewayEntity("gw-1", "Join", "JOIN", List.of("s1"), List.of()));

        var declared = EventConductorSchema.stepFields();
        assertThat(steps(definition)).allSatisfy(s -> assertThat(declared).containsAll(s.keySet()));
    }

    /** An ACTION is dispatched to a topic, and the schema requires one. */
    @Test
    void anActionGetsItsTopic() {
        var definition = definitionOf(workflow(step("s-cobrar", "Cobrar")));

        assertThat(steps(definition).get(0))
                .containsEntry("type", "ACTION")
                .containsEntry("topic", TOPIC + ".s-cobrar");
    }

    /** A USER_TASK is rendered as a form, and the schema requires one. */
    @Test
    void aUserTaskPointsAtItsForm() {
        var definition = definitionOf(workflow(
                step("s1", "Revisar").toBuilder().type("USER_TASK").formPageId("pg-ficha").build()));

        assertThat(steps(definition).get(0))
                .containsEntry("formId", "form-pg-ficha")
                .doesNotContainKey("topic");
    }

    /** modux says «depends on»; EventConductor says «must have completed». Same edge. */
    @Test
    void dependenciesBecomePreconditions() {
        var definition = definitionOf(workflow(
                step("s1", "Uno"),
                step("s2", "Dos").toBuilder().dependsOnStepIds(List.of("s1")).build()));

        assertThat(steps(definition).get(0)).doesNotContainKey("preconditionStepIds");
        assertThat(steps(definition).get(1)).containsEntry("preconditionStepIds", List.of("s1"));
    }

    /**
     * A gateway is its own element in modux because on a canvas it is its own box. EventConductor
     * has no such thing: a JOIN and a FORK are steps. So they fold in.
     */
    @Test
    void aGatewayBecomesAStep() {
        var definition = definitionOf(workflow(step("s1", "Uno")),
                new WorkflowGatewayEntity("gw-split", "Abrir", "SPLIT", List.of("s1"), List.of()),
                new WorkflowGatewayEntity("gw-join", "Cerrar", "JOIN", List.of("s1"), List.of()));

        assertThat(steps(definition)).extracting(s -> s.get("id") + ":" + s.get("type"))
                .containsExactly("s1:ACTION", "gw-split:FORK", "gw-join:JOIN");
        assertThat(steps(definition).get(1)).containsEntry("preconditionStepIds", List.of("s1"));
    }

    /** ALL waits for every branch (AND); ANY proceeds with the first (XOR). */
    @Test
    void aJoinsSemanticsBecomeItsJoinType() {
        var all = definitionOf(workflow(step("s1", "Uno")),
                gateway("gw", "JOIN", "ALL"));
        var any = definitionOf(workflow(step("s1", "Uno")),
                gateway("gw", "JOIN", "ANY"));

        assertThat(steps(all).get(1)).containsEntry("joinType", "AND");
        assertThat(steps(any).get(1)).containsEntry("joinType", "XOR");
        assertThat(EventConductorSchema.stepFields()).contains("joinType");
    }

    /** A split has no joinType — the schema says the field is JOIN only. */
    @Test
    void aForkHasNoJoinType() {
        var definition = definitionOf(workflow(step("s1", "Uno")), gateway("gw", "SPLIT", "PARALLEL"));

        assertThat(steps(definition).get(1)).doesNotContainKey("joinType");
    }

    /** The schema requires at least one step; an empty workflow is an END, not a broken file. */
    @Test
    void anEmptyWorkflowIsStillAValidDefinition() {
        var definition = definitionOf(workflow());

        assertThat(steps(definition)).singleElement()
                .satisfies(s -> assertThat(s).containsEntry("type", "END"));
    }

    @Test
    void topicsAreNamespacedPerProjectAndWorkflow() {
        assertThat(EventConductorWorkflowDefinition.topicPrefix("Booking", "Check In"))
                .isEqualTo("booking.workflow.check-in");
    }

    /** A booking on prepayment: wait for its confirmation until its own deadline; if it does not come, expire it. */
    private static Map<String, Object> prepago() {
        var workflow = WorkflowEntity.builder().id("wf-prepago").name("Prepago")
                .triggerEvent("ReservaCreada").triggerCondition("data.confirmada == false")
                .steps(List.of(
                        step("esperar", "Esperar el cobro").toBuilder().type("ACTION")   // the store's default
                                .completionEventName("ReservaConfirmada").deadline("${fechaLimite}")
                                .timeoutStepId("caducar").build(),
                        step("caducar", "Caducar").toBuilder().targetUseCaseId("uc-caducar").build()))
                .build();
        var runtime = new EventConductorWorkflowDefinition.Runtime(
                useCaseId -> new EventConductorWorkflowDefinition.UseCaseCall("reservas", "/v1/caducar-reserva", List.of("reservaId")),
                event -> List.of("reservaId", "confirmada", "fechaLimite"));
        return EventConductorWorkflowDefinition.runnable(workflow, List.of(), pageId -> null, TOPIC, runtime);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> stepNamed(Map<String, Object> definition, String id) {
        return steps(definition).stream().filter(s -> id.equals(s.get("id"))).findFirst().orElseThrow();
    }

    @Test
    @SuppressWarnings("unchecked")
    void itStartsOnItsEventWhenItsConditionHoldsKeyedByWhatTheEventIsAbout() {
        var definition = prepago();
        assertThat(definition).containsEntry("status", "ACTIVE").containsEntry("id", "prepago")
                .containsEntry("businessKeyPolicy", "allowAfterFinished");
        var trigger = ((List<Map<String, Object>>) definition.get("triggers")).get(0);
        assertThat(trigger).containsEntry("destination", "reservacreada")
                .containsEntry("type", "*")
                .containsEntry("filter", "data.confirmada == false")
                .containsEntry("businessKey", "prepago-${data.reservaId}");
    }

    @Test
    @SuppressWarnings("unchecked")
    void aWaitListensForItsEventUntilItsDeadlineAndThenTakesItsTimeoutBranch() {
        var definition = prepago();
        var wait = stepNamed(definition, "esperar");
        assertThat(wait).containsEntry("type", "WAIT_FOR_MESSAGE")
                .containsEntry("messageName", "ReservaConfirmada")
                .containsEntry("correlationExpression", "reservaId")
                .containsEntry("deadline", "${fechaLimite}")
                .containsEntry("onTimeoutStepId", "caducar")
                .containsEntry("preconditionStepId", "start");
        assertThat((Map<String, Object>) wait.get("onEvent")).containsEntry("destination", "reservaconfirmada")
                .containsEntry("correlationKey", "${data.reservaId}");
        // the timeout branch is reached only that way, and both ways meet before the end
        assertThat(stepNamed(definition, "caducar")).containsEntry("preconditions",
                List.of(Map.of("stepId", "esperar", "expression", "false")));
        assertThat(stepNamed(definition, "finished")).containsEntry("joinType", "XOR")
                .containsEntry("preconditionStepIds", List.of("esperar", "caducar"));
        assertThat(stepNamed(definition, "end")).containsEntry("preconditionStepId", "finished");
    }

    @Test
    @SuppressWarnings("unchecked")
    void aStepWithAUseCaseCallsItOverHttpAsTheSystem() {
        var call = stepNamed(prepago(), "caducar");
        assertThat(call).containsEntry("type", "HTTP_CALL").doesNotContainKey("topic");
        assertThat((Map<String, Object>) call.get("http")).containsEntry("connection", "reservas")
                .containsEntry("method", "POST").containsEntry("path", "/v1/caducar-reserva")
                .containsEntry("body", Map.of("reservaId", "${reservaId}"));
    }

    @Test
    void anExclusiveSplitIsTheConditionOfEachBranchAfterItsSource() {
        var workflow = WorkflowEntity.builder().id("wf-rechazo").name("Rechazo").triggerEvent("PedidoRechazado")
                .steps(List.of(
                        step("decidir", "Decidir").toBuilder().roleId("role-ops").type("USER_TASK").build(),
                        step("reenviar", "Reenviar").toBuilder().targetUseCaseId("uc-reenviar").build(),
                        step("cancelar", "Cancelar").toBuilder().targetUseCaseId("uc-cancelar").build()))
                .build();
        var split = new WorkflowGatewayEntity("gw-decision", "Decisión", "SPLIT", "EXCLUSIVE", List.of("decidir"),
                List.of("reenviar", "cancelar"), List.of(
                        new io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayBranchConditionEntity("reenviar", "decision != 'CANCELAR'"),
                        new io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayBranchConditionEntity("cancelar", "decision == 'CANCELAR'")), null);
        var runtime = new EventConductorWorkflowDefinition.Runtime(
                id -> new EventConductorWorkflowDefinition.UseCaseCall("ops", "/v1/" + id, List.of("pedidoId")),
                event -> List.of("pedidoId"), role -> "OPERACIONES");
        var definition = EventConductorWorkflowDefinition.runnable(workflow, List.of(split), pageId -> null, TOPIC, runtime);

        assertThat(steps(definition)).noneMatch(st -> "FORK".equals(st.get("type")));
        assertThat(stepNamed(definition, "reenviar")).containsEntry("preconditions",
                List.of(Map.of("stepId", "decidir", "expression", "decision != 'CANCELAR'")));
        assertThat(stepNamed(definition, "cancelar")).containsEntry("preconditions",
                List.of(Map.of("stepId", "decidir", "expression", "decision == 'CANCELAR'")));
        assertThat(stepNamed(definition, "finished")).containsEntry("joinType", "XOR")
                .containsEntry("preconditionStepIds", List.of("reenviar", "cancelar"));
        assertThat(stepNamed(definition, "decidir")).containsEntry("assignment", Map.of("candidateGroups", List.of("OPERACIONES")));
    }

    @Test
    @SuppressWarnings("unchecked")
    void whatAUseCaseAnswersBecomesProcessVariables() {
        var workflow = WorkflowEntity.builder().id("wf-x").name("X").triggerEvent("PedidoEnviado")
                .steps(List.of(step("comprobar", "Comprobar").toBuilder().targetUseCaseId("uc-estado").build())).build();
        var runtime = new EventConductorWorkflowDefinition.Runtime(
                id -> new EventConductorWorkflowDefinition.UseCaseCall("ops", "/v1/estado", List.of("reservaId"), List.of("estado")),
                event -> List.of("reservaId"));
        var http = (Map<String, Object>) stepNamed(EventConductorWorkflowDefinition.runnable(workflow, List.of(), id -> null, TOPIC, runtime), "comprobar").get("http");
        assertThat(http).containsEntry("output", Map.of("estado", "body.estado"));
    }

    @Test
    void theRunnableDefinitionSpeaksOnlyTheEnginesLanguage() {
        var known = EventConductorSchema.stepTypes();
        var declared = EventConductorSchema.stepFields();
        assertThat(steps(prepago())).allSatisfy(s -> {
            assertThat(known).contains((String) s.get("type"));
            assertThat(declared).containsAll(s.keySet());
        });
    }

    private static WorkflowGatewayEntity gateway(String id, String type, String semantics) {
        return new WorkflowGatewayEntity(id, id, type, List.of("s1"), List.of())
                .toBuilder().semantics(semantics).build();
    }
}
