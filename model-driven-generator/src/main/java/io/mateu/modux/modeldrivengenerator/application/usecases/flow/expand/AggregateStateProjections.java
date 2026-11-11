package io.mateu.modux.modeldrivengenerator.application.usecases.flow.expand;

import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.projection.vo.ProjectionEventHandlerType;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEventHandlerEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReadModelEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * A projection whose source is an AGGREGATE (one line from the aggregate to a read model, in any
 * context) is a copy of that aggregate's state: event-carried state transfer. This desugars it into
 * the pieces the generator already knows, in memory only, like the flows:
 *
 * <ul>
 *   <li>two derived events, {@code {Aggregate}Estado} (the whole state plus its id) and
 *       {@code {Aggregate}Borrado} (the id), which the aggregate's repository publishes on every save
 *       and delete — whatever saved it: the CRUD screen, a use case, an operation;</li>
 *   <li>the projection's handlers: upsert on the first, delete on the second;</li>
 *   <li>when the read model takes its shape from the aggregate's own model (or has none), a derived
 *       copy of it with enums as text, which is how the state travels.</li>
 * </ul>
 *
 * A projection that already declares handlers is the author's and is left alone.
 */
@Service
@RequiredArgsConstructor
public class AggregateStateProjections {

    final ModelStore repository;

    /** The aggregates the last {@link #materialize()} turned into state sources. */
    private final Set<String> sources = new java.util.HashSet<>();

    public static String stateEventName(String aggregateName) {
        return aggregateName + "Estado";
    }

    public static String deletedEventName(String aggregateName) {
        return aggregateName + "Borrado";
    }

    /** The topic a projection handler of that event listens on (mirrors the consumer bindings). */
    public static String topicOf(String eventName) {
        return eventName.toLowerCase().replaceAll("[^a-z0-9]", "-");
    }

    /** The projections to desugar: an aggregate as source, no handlers of their own. */
    public List<ProjectionEntity> stateProjections() {
        return repository.findAllOfType(ProjectionEntity.class).stream()
                .filter(p -> p.sourceAggregateId() != null && !p.sourceAggregateId().isBlank())
                .filter(p -> p.handlers() == null || p.handlers().isEmpty())
                .toList();
    }

    /** The aggregates whose repository has to publish its state (after {@link #materialize()}). */
    public boolean isStateSource(String aggregateId) {
        return sources.contains(aggregateId);
    }

    public void materialize() {
        sources.clear();
        for (var projection : stateProjections()) {
            var aggregate = repository.findById(projection.sourceAggregateId(), AggregateEntity.class).orElse(null);
            if (aggregate == null || aggregate.modelId() == null) continue;
            var model = repository.findById(aggregate.modelId(), ModelEntity.class).orElse(null);
            if (model == null) continue;
            sources.add(aggregate.id());

            var stateFields = stateFields(model);
            var payloadId = "model-state-" + aggregate.id();
            var deletedId = "model-deleted-" + aggregate.id();
            var withId = new ArrayList<ModelFieldEntity>();
            withId.add(field(payloadId, "id", FieldDataType.string));
            stateFields.forEach(f -> withId.add(field(payloadId, f.name(), f.type(), f.label())));
            repository.putTransient(new ModelEntity(payloadId, stateEventName(aggregate.name()) + "Payload", withId, List.of(), null));
            repository.putTransient(new ModelEntity(deletedId, deletedEventName(aggregate.name()) + "Payload",
                    List.of(field(deletedId, "id", FieldDataType.string)), List.of(), null));

            var stateEvent = event("ev-state-" + aggregate.id(), stateEventName(aggregate.name()), payloadId);
            var deletedEvent = event("ev-deleted-" + aggregate.id(), deletedEventName(aggregate.name()), deletedId);
            repository.putTransient(stateEvent);
            repository.putTransient(deletedEvent);

            // the read model holds the state: shaped like the aggregate unless it declares its own shape
            var readModel = projection.readModelId() == null ? null
                    : repository.findById(projection.readModelId(), ReadModelEntity.class).orElse(null);
            if (readModel != null && (readModel.modelId() == null || readModel.modelId().equals(aggregate.modelId()))) {
                var shapeId = "model-view-" + readModel.id();
                repository.putTransient(new ModelEntity(shapeId, readModel.name() + "Fields",
                        stateFields.stream().map(f -> field(shapeId, f.name(), f.type(), f.label())).toList(), List.of(), null));
                repository.putTransient(new ReadModelEntity(readModel.id(), readModel.name(), readModel.boundedContextId(),
                        readModel.description(), shapeId, readModel.storageType(), readModel.consistency(),
                        readModel.aggregateId(), readModel.projectId()));
            }

            repository.putTransient(new ProjectionEntity(projection.id(), projection.name(), projection.readModelId(),
                    List.of(new ProjectionEventHandlerEntity("peh-state-" + projection.id(), "on" + stateEvent.name(),
                                    stateEvent.id(), ProjectionEventHandlerType.Upsert, null),
                            new ProjectionEventHandlerEntity("peh-deleted-" + projection.id(), "on" + deletedEvent.name(),
                                    deletedEvent.id(), ProjectionEventHandlerType.Delete, null)),
                    projection.rebuildStrategy(), projection.errorHandlingStrategy(), projection.maxRetries(),
                    projection.snapshotEnabled(), projection.snapshotFrequency(), projection.sourceAggregateId(),
                    projection.sourceExternalUseCaseId(), projection.sourceExternalTableId(), projection.projectId()));
        }
    }

    /** The aggregate's fields as they travel: basic ones as they are, enums and references as text. */
    static List<ModelFieldEntity> stateFields(ModelEntity model) {
        return (model.fields() == null ? List.<ModelFieldEntity>of() : model.fields()).stream()
                .filter(Objects::nonNull)
                .filter(f -> !"id".equals(f.name()))
                .filter(f -> f.basicType() || f.isEnum() || f.enumId() != null)
                .map(f -> field(model.id(), f.name(), f.basicType() && f.type() != null ? f.type() : FieldDataType.string, f.label()))
                .toList();
    }

    private static ModelFieldEntity field(String modelId, String name, FieldDataType type) {
        return field(modelId, name, type, null);
    }

    /** With the label of the field it copies: the read model's screens show what the model calls it. */
    private static ModelFieldEntity field(String modelId, String name, FieldDataType type, String label) {
        return new ModelFieldEntity(modelId + "-" + name, name, true, type, null, false, null, List.of(),
                null, null, label, null, null, null);
    }

    private static DomainEventEntity event(String id, String name, String modelId) {
        return new DomainEventEntity(id, name, modelId, false, null, topicOf(name), null, null,
                null, null, false, null, null, null, null, false, null);
    }
}
