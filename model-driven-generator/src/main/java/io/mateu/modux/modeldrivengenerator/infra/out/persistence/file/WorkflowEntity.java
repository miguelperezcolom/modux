package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;
import lombok.Builder;

import java.util.List;

/**
 * An orchestrator that lives OUTSIDE every bounded context (it has no owner boundedContext, unlike
 * {@link ProcessEntity}): started by an event, it advances a dependency graph of steps, each of
 * which emits an event that starts a task — a use case, for now — inside a bounded context. The
 * workflow never calls anything directly; all workflow↔context communication travels as events.
 */
@Builder(toBuilder = true)
public record WorkflowEntity(
        String id,
        String name,
        String description,
        /** Trigger source: the aggregate emitting the trigger domain event. */
        String triggerAggregateId,
        /** Alternative trigger source: the domain service emitting the trigger domain event. */
        String triggerDomainServiceId,
        /** Alternative trigger source: the use case publishing the trigger APPLICATION event. */
        String triggerUseCaseId,
        /** The event that starts the workflow. */
        String triggerEvent,
        List<WorkflowStepEntity> steps,
        /** Event published when every step completes. Defaults to &lt;Name&gt;Completed. */
        String onCompletionEventName,
        /** Architecture decisions (ADRs) this workflow traces back to. */
        List<String> decisionIds
,
        /** The project this element belongs to (selection scoping; null = legacy, claimed on open). */
        String projectId
,
        /** Default cap on successful runs per step (null = unbounded); a step may override it. */
        Integer defaultMaxStepExecutions,
        /**
         * Only the trigger events this holds for start the workflow: a JEXL expression over the
         * event, its payload as {@code data} (e.g. {@code data.confirmada == false}). Null = all.
         */
        String triggerCondition
) implements Identifiable {
    /** Backward-compatible constructor (pre-triggerCondition callers and stores). */
    public WorkflowEntity(String id, String name, String description, String triggerAggregateId,
                          String triggerDomainServiceId, String triggerUseCaseId, String triggerEvent,
                          List<WorkflowStepEntity> steps, String onCompletionEventName,
                          List<String> decisionIds, String projectId, Integer defaultMaxStepExecutions) {
        this(id, name, description, triggerAggregateId, triggerDomainServiceId, triggerUseCaseId,
                triggerEvent, steps, onCompletionEventName, decisionIds, projectId, defaultMaxStepExecutions, null);
    }

    /** Backward-compatible constructor (pre-defaultMaxStepExecutions callers and stores). */
    public WorkflowEntity(String id, String name, String description, String triggerAggregateId,
                          String triggerDomainServiceId, String triggerUseCaseId, String triggerEvent,
                          List<WorkflowStepEntity> steps, String onCompletionEventName,
                          List<String> decisionIds, String projectId) {
        this(id, name, description, triggerAggregateId, triggerDomainServiceId, triggerUseCaseId,
                triggerEvent, steps, onCompletionEventName, decisionIds, projectId, null);
    }

    public WorkflowEntity {
        if (steps == null) steps = List.of();
        if (decisionIds == null) decisionIds = List.of();
    }
}
