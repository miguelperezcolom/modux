package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import java.util.List;

/**
 * One step of a {@link WorkflowEntity workflow}. The workflow emits {@code emittedEventName} to
 * start the step's task — the use case {@code targetUseCaseId} in its bounded context — and
 * considers the step done when {@code completionEventName} arrives. {@code dependsOnStepIds}
 * declares the step's predecessors in the dependency graph; a step with none starts when the
 * workflow's trigger event arrives.
 */
@lombok.Builder(toBuilder = true)
public record WorkflowStepEntity(
        String id,
        String name,
        String emittedEventName,
        String targetUseCaseId,
        String completionEventName,
        List<String> dependsOnStepIds,
        String description,
        /** TASK (default), JOIN (waits for every dependency) or SPLIT (fans out). */
        String type,
        /** The step's single outgoing link when it is ANOTHER workflow (hand-off). */
        String handoffWorkflowId,
        /** HUMAN step: the role whose worklist gets the task (a step with role is human). */
        String roleId,
        /** HUMAN step: ISO-8601 duration bound (e.g. PT48H). */
        String deadline,
        /** HUMAN step: who the task escalates to when the deadline passes. */
        String escalationRoleId,
        /** Use case run to UNDO this step when the workflow compensates. */
        String compensationUseCaseId,
        /** HUMAN step: the declared PAGE the forms engine renders as the task's form. */
        String formPageId,
        /**
         * Cap on how many times this step may SUCCESSFULLY run in one workflow instance (runtime
         * backstop against runaway loops). {@code null} inherits the workflow's default.
         */
        Integer maxSuccessfulExecutions,
        /**
         * The step the workflow goes on with when this one runs out of time (its deadline passes
         * unfinished) — a wait that is not answered in time, say. Null = running out of time fails.
         */
        String timeoutStepId
) {
    /** Backward-compatible constructor (pre-timeoutStepId callers and stores). */
    public WorkflowStepEntity(String id, String name, String emittedEventName,
                              String targetUseCaseId, String completionEventName,
                              List<String> dependsOnStepIds, String description, String type,
                              String handoffWorkflowId, String roleId, String deadline,
                              String escalationRoleId, String compensationUseCaseId,
                              String formPageId, Integer maxSuccessfulExecutions) {
        this(id, name, emittedEventName, targetUseCaseId, completionEventName, dependsOnStepIds,
                description, type, handoffWorkflowId, roleId, deadline, escalationRoleId,
                compensationUseCaseId, formPageId, maxSuccessfulExecutions, null);
    }

    /** Backward-compatible constructor (pre-maxSuccessfulExecutions callers and stores). */
    public WorkflowStepEntity(String id, String name, String emittedEventName,
                              String targetUseCaseId, String completionEventName,
                              List<String> dependsOnStepIds, String description, String type,
                              String handoffWorkflowId, String roleId, String deadline,
                              String escalationRoleId, String compensationUseCaseId,
                              String formPageId) {
        this(id, name, emittedEventName, targetUseCaseId, completionEventName, dependsOnStepIds,
                description, type, handoffWorkflowId, roleId, deadline, escalationRoleId,
                compensationUseCaseId, formPageId, null);
    }

    /** Backward-compatible constructor (pre-formPageId callers and stores). */
    public WorkflowStepEntity(String id, String name, String emittedEventName,
                              String targetUseCaseId, String completionEventName,
                              List<String> dependsOnStepIds, String description, String type,
                              String handoffWorkflowId, String roleId, String deadline,
                              String escalationRoleId, String compensationUseCaseId) {
        this(id, name, emittedEventName, targetUseCaseId, completionEventName, dependsOnStepIds,
                description, type, handoffWorkflowId, roleId, deadline, escalationRoleId,
                compensationUseCaseId, null);
    }

    /** Backward-compatible constructor (pre-human-fields callers and stores). */
    public WorkflowStepEntity(String id, String name, String emittedEventName,
                              String targetUseCaseId, String completionEventName,
                              List<String> dependsOnStepIds, String description, String type,
                              String handoffWorkflowId) {
        this(id, name, emittedEventName, targetUseCaseId, completionEventName,
                dependsOnStepIds, description, type, handoffWorkflowId, null, null, null, null);
    }

    /** Backward-compatible constructor (pre-handoffWorkflowId callers and stores). */
    public WorkflowStepEntity(String id, String name, String emittedEventName,
                              String targetUseCaseId, String completionEventName,
                              List<String> dependsOnStepIds, String description, String type) {
        this(id, name, emittedEventName, targetUseCaseId, completionEventName,
                dependsOnStepIds, description, type, null);
    }

    public WorkflowStepEntity {
        if (dependsOnStepIds == null) dependsOnStepIds = List.of();
    }

    /** Backward-compatible constructor (pre-type callers and stores). */
    public WorkflowStepEntity(String id, String name, String emittedEventName,
                              String targetUseCaseId, String completionEventName,
                              List<String> dependsOnStepIds, String description) {
        this(id, name, emittedEventName, targetUseCaseId, completionEventName,
                dependsOnStepIds, description, null);
    }
}
