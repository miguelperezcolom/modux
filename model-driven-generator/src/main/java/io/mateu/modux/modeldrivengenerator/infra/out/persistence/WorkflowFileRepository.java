package io.mateu.modux.modeldrivengenerator.infra.out.persistence;

import io.mateu.modux.modeldrivengenerator.application.out.repositories.WorkflowRepository;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.workflow.Workflow;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.workflow.vo.WorkflowId;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.workflow.vo.WorkflowStep;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowStepEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkflowFileRepository implements WorkflowRepository {

    final ModelStore repository;
    final WorkflowLoopValidator loopValidator;

    @Override
    public Optional<Workflow> findById(WorkflowId id) {
        return repository.findById(id.id(), WorkflowEntity.class)
                .map(entity -> Workflow.load(entity.id(), entity.name(), entity.description(),
                        entity.triggerAggregateId(), entity.triggerDomainServiceId(),
                        entity.triggerUseCaseId(), entity.triggerEvent(),
                        toSteps(entity.steps()), entity.onCompletionEventName(),
                        entity.defaultMaxStepExecutions()));
    }

    @Override
    public Workflow save(Workflow entity) {
        // decisionIds are not modeled in the domain Workflow yet — carry them over from the stored
        // entity so a UI save never wipes what was authored in the YAML store.
        var existing = repository.findById(entity.getId().id(), WorkflowEntity.class).orElse(null);
        // triggerCondition and each step's timeoutStepId are not in the domain either: carried over too
        var stepEntities = carryTimeouts(toStepEntities(entity.getSteps()), existing);
        loopValidator.assertWorkflowBounded(entity.getId().id(), stepEntities);
        repository.save(new WorkflowEntity(
                entity.getId().id(),
                entity.getName().name(),
                entity.getDescription(),
                entity.getTriggerAggregateId(),
                entity.getTriggerDomainServiceId(),
                entity.getTriggerUseCaseId(),
                entity.getTriggerEvent(),
                stepEntities,
                entity.getOnCompletionEventName(),
                existing != null ? existing.decisionIds() : List.of(), null,
                entity.getDefaultMaxStepExecutions(),
                existing != null ? existing.triggerCondition() : null));
        return entity;
    }

    @Override
    public void deleteAllById(List<WorkflowId> selectedIds) {
        repository.deleteAllById(selectedIds.stream().map(WorkflowId::id).toList(), WorkflowEntity.class);
    }

    private static List<WorkflowStep> toSteps(List<WorkflowStepEntity> steps) {
        if (steps == null) return List.of();
        return steps.stream()
                .map(s -> new WorkflowStep(s.id(), s.name(), s.emittedEventName(),
                        s.targetUseCaseId(), s.completionEventName(), s.dependsOnStepIds(),
                        s.description(), s.type(), s.handoffWorkflowId(), s.roleId(),
                        s.deadline(), s.escalationRoleId(), s.compensationUseCaseId(),
                        s.formPageId(), s.maxSuccessfulExecutions()))
                .toList();
    }

    private static List<WorkflowStepEntity> carryTimeouts(List<WorkflowStepEntity> steps, WorkflowEntity existing) {
        if (existing == null || existing.steps() == null) return steps;
        var timeouts = new java.util.HashMap<String, String>();
        existing.steps().forEach(s -> { if (s.timeoutStepId() != null) timeouts.put(s.id(), s.timeoutStepId()); });
        return steps.stream()
                .map(s -> timeouts.containsKey(s.id()) ? s.toBuilder().timeoutStepId(timeouts.get(s.id())).build() : s)
                .toList();
    }

    private static List<WorkflowStepEntity> toStepEntities(List<WorkflowStep> steps) {
        if (steps == null) return List.of();
        return steps.stream()
                .map(s -> new WorkflowStepEntity(s.id(), s.name(), s.emittedEventName(),
                        s.targetUseCaseId(), s.completionEventName(), s.dependsOnStepIds(),
                        s.description(), s.type(), s.handoffWorkflowId(), s.roleId(),
                        s.deadline(), s.escalationRoleId(), s.compensationUseCaseId(),
                        s.formPageId(), s.maxSuccessfulExecutions()))
                .toList();
    }
}
