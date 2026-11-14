package io.mateu.modux.modeldrivengenerator.application.usecases.model.lint;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowStepEntity;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * That `modux:validate` catches a workflow nothing can start.
 *
 * <p>Such a workflow generates no EventConductor definition, because there is nowhere to put the
 * file: a workflow lives outside every context, so its home is the context its trigger comes
 * from, and without one there is no service whose classpath it belongs on. Generation warns, but
 * the lint is where it should be caught — before anyone runs a build and wonders where the
 * orchestration went.
 */
class WorkflowHomeLintTest {

    private static final LintRule RULE = LintRules.all().stream()
            .filter(r -> r.id().equals("workflow-home"))
            .findFirst().orElseThrow();

    private static ModelSnapshot snapshot(BoundedContextEntity context, WorkflowEntity workflow) {
        return new ModelSnapshot(
                null, null, context == null ? null : List.of(context), null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null,
                List.of(workflow), null, null, null, null, null, null, null, null, null, null,
                null, null, null);
    }

    private static BoundedContextEntity context() {
        return BoundedContextEntity.builder()
                .id("bc-res").name("Reservas")
                .useCaseIds(List.of("uc-arrancar", "uc-cobrar"))
                .aggregateIds(List.of("agg-reserva"))
                .build();
    }

    private static WorkflowEntity workflow(WorkflowEntity.WorkflowEntityBuilder builder) {
        return builder.id("wf-1").name("Checkin").build();
    }

    @Test
    void aWorkflowStartedByAKnownUseCaseIsFine() {
        var findings = RULE.apply(snapshot(context(),
                workflow(WorkflowEntity.builder().triggerUseCaseId("uc-arrancar"))));

        assertThat(findings).isEmpty();
    }

    @Test
    void aWorkflowStartedByAKnownAggregateIsFine() {
        var findings = RULE.apply(snapshot(context(),
                workflow(WorkflowEntity.builder().triggerAggregateId("agg-reserva"))));

        assertThat(findings).isEmpty();
    }

    /** No trigger, but a step that runs a use case: that context can host it. */
    @Test
    void aWorkflowWhoseStepRunsAKnownUseCaseIsFine() {
        var step = WorkflowStepEntity.builder().id("s1").targetUseCaseId("uc-cobrar").build();
        var findings = RULE.apply(snapshot(context(),
                workflow(WorkflowEntity.builder().steps(List.of(step)))));

        assertThat(findings).isEmpty();
    }

    /**
     * A trigger EVENT is not a trigger SOURCE. This is the case the older `workflow-trigger` rule
     * passes and this one has to catch: the workflow declares what starts it, but not from where.
     */
    @Test
    void aWorkflowWithAnEventButNoSourceIsFlagged() {
        var findings = RULE.apply(snapshot(context(),
                workflow(WorkflowEntity.builder().triggerEvent("Llegada"))));

        assertThat(findings).singleElement().satisfies(f -> {
            assertThat(f.severity()).isEqualTo(LintSeverity.ERROR);
            assertThat(f.message()).contains("no definition is generated");
        });
    }

    @Test
    void aWorkflowPointingAtSomethingNoContextOwnsIsFlagged() {
        var findings = RULE.apply(snapshot(context(),
                workflow(WorkflowEntity.builder().triggerUseCaseId("uc-de-otro-sitio"))));

        assertThat(findings).hasSize(1);
    }
}
