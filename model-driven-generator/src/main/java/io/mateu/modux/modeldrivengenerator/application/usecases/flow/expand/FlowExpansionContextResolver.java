package io.mateu.modux.modeldrivengenerator.application.usecases.flow.expand;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.flow.Flow;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves the {@link FlowExpansionContext} a flow needs from the rest of the model:
 * triggerAggregate → name + owning boundedContext → service → project, the target boundedContext name, and the
 * types of the materialized fields (read from the aggregate's model). Lenient: missing
 * references fall back to ids / string so expansion never hard-fails on an incomplete model.
 */
@Service
@RequiredArgsConstructor
public class FlowExpansionContextResolver {

    final ModelStore repository;

    public FlowExpansionContext resolve(Flow flow) {
        // The domain Flow does not (yet) model the alternative domain-service trigger;
        // read it from the stored entity.
        var stored = repository.findById(flow.getId().id(),
                io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity.class);
        var triggerDomainServiceId = stored.map(
                io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity::triggerDomainServiceId)
                .orElse(null);
        var triggerUseCaseId = stored.map(
                io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity::triggerUseCaseId)
                .orElse(null);
        var ctx = resolve(flow, triggerDomainServiceId, triggerUseCaseId,
                repository.findAllOfType(AggregateEntity.class),
                repository.findAllOfType(BoundedContextEntity.class),
                repository.findAllOfType(ServiceEntity.class),
                repository.findAllOfType(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity.class),
                repository.findAllOfType(ProjectEntity.class),
                repository.findAllOfType(ModelEntity.class),
                repository.findAllOfType(UseCaseEntity.class));
        // A field of the event's own payload is typed by it (the aggregate may not even have it).
        var declared = flow.getMaterializedFields() != null ? flow.getMaterializedFields() : List.<String>of();
        var eventFields = repository.findAllOfType(
                        io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity.class).stream()
                .filter(ev -> ev.name() != null && ev.name().equals(flow.getTriggerEvent()) && ev.modelId() != null)
                .findFirst()
                .flatMap(ev -> repository.findById(ev.modelId(), ModelEntity.class))
                .map(ModelEntity::fields)
                .orElse(List.of());
        if (eventFields != null && ctx.fieldTypes() != null) {
            eventFields.stream()
                    .filter(f -> declared.contains(f.name()) && f.type() != null)
                    .forEach(f -> ctx.fieldTypes().put(f.name(), f.type()));
        }
        return ctx;
    }

    /** Pre-domain-service-trigger overload, kept for existing tests. */
    static FlowExpansionContext resolve(Flow flow,
                                        List<AggregateEntity> aggregates,
                                        List<BoundedContextEntity> boundedContexts,
                                        List<ServiceEntity> services,
                                        List<io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity> modules,
                                        List<ProjectEntity> projects,
                                        List<ModelEntity> models,
                                        List<UseCaseEntity> useCases) {
        return resolve(flow, null, null, aggregates, boundedContexts, services, modules, projects, models, useCases);
    }

    /** Pure resolution over the given model slices — unit-testable without Spring or files. */
    static FlowExpansionContext resolve(Flow flow,
                                        String triggerDomainServiceId,
                                        String triggerUseCaseId,
                                        List<AggregateEntity> aggregates,
                                        List<BoundedContextEntity> boundedContexts,
                                        List<ServiceEntity> services,
                                        List<io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity> modules,
                                        List<ProjectEntity> projects,
                                        List<ModelEntity> models,
                                        List<UseCaseEntity> useCases) {
        var aggregateId = flow.getTriggerAggregateId();

        var aggregate = aggregates.stream().filter(a -> a.id().equals(aggregateId)).findFirst().orElse(null);
        var aggregateName = aggregate != null ? aggregate.name() : aggregateId;

        var sourceBoundedContext = boundedContexts.stream()
                .filter(m -> m.aggregateIds() != null && m.aggregateIds().contains(aggregateId))
                .findFirst()
                // Alternative triggers: the boundedContext owning the emitting domain service,
                // or the one owning the publishing use case (application events).
                .orElseGet(() -> triggerDomainServiceId != null
                        ? boundedContexts.stream()
                                .filter(m -> m.domainServiceIds().contains(triggerDomainServiceId))
                                .findFirst().orElse(null)
                        : triggerUseCaseId == null ? null : boundedContexts.stream()
                                .filter(m -> m.useCaseIds() != null && m.useCaseIds().contains(triggerUseCaseId))
                                .findFirst().orElse(null));

        var sourceService = sourceBoundedContext == null ? null
                : io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology
                        .serviceOfElement(services, modules, sourceBoundedContext.id(), aggregateId);
        var sourceServiceName = sourceService != null ? sourceService.name()
                : (sourceBoundedContext != null ? sourceBoundedContext.name() : aggregateId);

        var projectName = sourceService == null ? "app" : projects.stream()
                .filter(p -> p.serviceIds().contains(sourceService.id()))
                .map(ProjectEntity::name)
                .findFirst().orElse("app");

        var targetBoundedContext = boundedContexts.stream()
                .filter(m -> m.id().equals(flow.getTargetBoundedContextId()))
                .findFirst().orElse(null);
        var targetBoundedContextName = targetBoundedContext != null ? targetBoundedContext.name() : flow.getTargetBoundedContextId();

        Map<String, FieldDataType> fieldTypes = new HashMap<>();
        if (aggregate != null && aggregate.modelId() != null) {
            models.stream()
                    .filter(m -> m.id().equals(aggregate.modelId()))
                    .findFirst()
                    .ifPresent(model -> {
                        var fields = model.fields() != null ? model.fields() : List.<ModelFieldEntity>of();
                        var byName = new HashMap<String, FieldDataType>();
                        fields.forEach(f -> byName.put(f.name(), f.type()));
                        var declared = flow.getMaterializedFields() != null ? flow.getMaterializedFields() : List.<String>of();
                        declared.forEach(name -> fieldTypes.put(name,
                                byName.getOrDefault(name, FieldDataType.string)));
                    });
        }

        var targetUseCase = flow.getTargetUseCaseId() == null ? null : useCases.stream()
                .filter(u -> u.id().equals(flow.getTargetUseCaseId()))
                .findFirst().orElse(null);
        var targetUseCaseName = targetUseCase != null ? targetUseCase.name() : flow.getTargetUseCaseId();
        var targetUseCaseInputModelId = targetUseCase != null ? targetUseCase.inputModelId() : null;

        var sourceBoundedContextId = sourceBoundedContext != null ? sourceBoundedContext.id() : null;

        return new FlowExpansionContext(projectName, sourceServiceName, aggregateName, targetBoundedContextName, fieldTypes,
                targetUseCaseName, targetUseCaseInputModelId, sourceBoundedContextId);
    }
}
