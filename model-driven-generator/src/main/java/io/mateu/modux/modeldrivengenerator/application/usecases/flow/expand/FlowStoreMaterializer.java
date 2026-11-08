package io.mateu.modux.modeldrivengenerator.application.usecases.flow.expand;

import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.IntegrationEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelMappingEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReadModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SagaEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SubscriptionEntity;
import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Materializes flow-derived structural pieces into the in-memory store (and the owning boundedContexts'
 * id lists) so the existing code generator picks them up exactly as if they had been declared by
 * hand — without persisting them to disk (flows stay the single source of truth). Always pair
 * {@link #materialize()} with {@link #restore()} in a finally block.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FlowStoreMaterializer {

    final ModelStore repository;
    final FlowExpander expander;
    final FlowExpansionContextResolver resolver;

    /** Per-boundedContext ids to append to the boundedContext's domain-event / projection / subscription / saga lists. */
    private record BoundedContextAdditions(List<String> domainEvents, List<String> projections,
                                   List<String> subscriptions, List<String> sagas) {
        static BoundedContextAdditions empty() {
            return new BoundedContextAdditions(new ArrayList<>(), new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
        }
    }

    public void materialize() {
        var flows = repository.findAllOfType(FlowEntity.class).stream()
                .map(e -> FlowExpansionService.withEventPayload(e, repository))
                .toList();
        if (flows.isEmpty()) {
            return;
        }

        // by id: the derived pieces reference the model by id, so a hand-written model that merely
        // shares its name must not displace it (the reference would dangle)
        var seenModelIds = keys(ModelEntity.class, ModelEntity::id);
        var seenEventNames = keys(DomainEventEntity.class, DomainEventEntity::name);
        var seenTopics = keys(IntegrationEventEntity.class, IntegrationEventEntity::topicName);
        var seenReadModels = keys(ReadModelEntity.class, rm -> rm.boundedContextId() + "/" + rm.name());
        var seenProjections = keys(ProjectionEntity.class, ProjectionEntity::name);
        var seenSubscriptions = keys(SubscriptionEntity.class, SubscriptionEntity::name);
        var seenMappings = keys(ModelMappingEntity.class, ModelMappingEntity::name);
        var seenSagas = keys(SagaEntity.class, SagaEntity::name);

        Map<String, BoundedContextAdditions> additions = new HashMap<>();

        for (var flow : flows) {
            var ctx = resolver.resolve(flow);
            var x = expander.expand(flow, ctx);
            var sourceBoundedContextId = ctx.sourceBoundedContextId();
            var targetBoundedContextId = flow.getTargetBoundedContextId();

            saveIfNew(x.payloadModel(), seenModelIds, ModelEntity::id);
            saveIfNew(x.integrationEvent(), seenTopics, IntegrationEventEntity::topicName);
            saveIfNew(x.readModel(), seenReadModels, rm -> rm.boundedContextId() + "/" + rm.name());
            saveIfNew(x.modelMapping(), seenMappings, ModelMappingEntity::name);

            if (saveIfNew(x.domainEvent(), seenEventNames, DomainEventEntity::name) && sourceBoundedContextId != null) {
                additions.computeIfAbsent(sourceBoundedContextId, k -> BoundedContextAdditions.empty())
                        .domainEvents().add(x.domainEvent().id());
            }
            if (saveIfNew(x.projection(), seenProjections, ProjectionEntity::name) && targetBoundedContextId != null) {
                additions.computeIfAbsent(targetBoundedContextId, k -> BoundedContextAdditions.empty())
                        .projections().add(x.projection().id());
            }
            if (saveIfNew(x.subscription(), seenSubscriptions, SubscriptionEntity::name) && targetBoundedContextId != null) {
                additions.computeIfAbsent(targetBoundedContextId, k -> BoundedContextAdditions.empty())
                        .subscriptions().add(x.subscription().id());
            }
            if (saveIfNew(x.saga(), seenSagas, SagaEntity::name) && targetBoundedContextId != null) {
                additions.computeIfAbsent(targetBoundedContextId, k -> BoundedContextAdditions.empty())
                        .sagas().add(x.saga().id());
            }
        }

        additions.forEach((boundedContextId, add) ->
                repository.findById(boundedContextId, BoundedContextEntity.class).ifPresent(boundedContext ->
                        repository.putTransient(withAppended(boundedContext, add))));
    }

    /** Restores the store from disk, discarding the transient flow-derived pieces. */
    public void restore() {
        repository.reload();
    }

    private <T extends Identifiable> boolean saveIfNew(T entity, Set<String> seen, Function<T, String> key) {
        if (entity == null) {
            return false;
        }
        var k = key.apply(entity);
        if (seen.contains(k)) {
            log.warn("Flow expansion: a {} matching '{}' already exists; skipping the derived one",
                    entity.getClass().getSimpleName(), k);
            return false;
        }
        seen.add(k);
        repository.putTransient(entity);
        return true;
    }

    private <T> Set<String> keys(Class<T> type, Function<T, String> key) {
        Set<String> set = new HashSet<>();
        repository.findAllOfType(type).forEach(e -> set.add(key.apply(e)));
        return set;
    }

    private static BoundedContextEntity withAppended(BoundedContextEntity m, BoundedContextAdditions add) {
        return m.toBuilder()
                .domainEventIds(concat(m.domainEventIds(), add.domainEvents()))
                .projectionIds(concat(m.projectionIds(), add.projections()))
                .subscriptionIds(concat(m.subscriptionIds(), add.subscriptions()))
                .sagaIds(concat(m.sagaIds(), add.sagas()))
                .build();
    }

    private static List<String> concat(List<String> base, List<String> extra) {
        List<String> result = new ArrayList<>(base != null ? base : List.of());
        result.addAll(extra);
        return result;
    }
}
