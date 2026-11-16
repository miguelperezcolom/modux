package io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi;

import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi.AsyncApiMapper.AsyncOperation;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi.AsyncApiMapper.Direction;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SubscriptionEntity;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Imports an AsyncAPI contract into a bounded context: what the application sends becomes a domain
 * event published on the channel's topic, what it receives a subscription to it, and the message
 * payloads typed models. Every element gets a deterministic id ({@code ev-}, {@code sub-},
 * {@code model-aapi-}), so re-importing an evolved contract updates in place, and the bounded context
 * lists what it owns (back-references are two-way: an element nobody lists is never generated).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportAsyncApiUseCase {

    final ModelStore repository;

    @SneakyThrows
    @SuppressWarnings("unchecked")
    public void handle(ImportAsyncApiCommand command) {
        // resolve the owner first: nothing is written when it is ambiguous
        var boundedContext = targetBoundedContext(command.boundedContextId());
        var projectId = boundedContext.projectId();

        Map<String, Object> spec = new YAMLMapper().readValue(new File(command.filePath()), Map.class);
        var result = AsyncApiMapper.map(spec);
        if (result.operations().isEmpty()) {
            log.warn("No channel operations found in AsyncAPI spec at {}", command.filePath());
            return;
        }

        for (var model : result.models()) {
            var existing = repository.findById(model.id(), ModelEntity.class);
            repository.save(new ModelEntity(model.id(), model.name(), model.fields(),
                    existing.map(ModelEntity::validations).orElse(model.validations()),
                    existing.map(ModelEntity::projectId).orElse(projectId)));
        }

        var eventIds = new LinkedHashSet<>(nn(boundedContext.domainEventIds()));
        var subscriptionIds = new LinkedHashSet<>(nn(boundedContext.subscriptionIds()));
        Set<String> claimed = new HashSet<>();
        result.operations().stream().map(this::idOf).forEach(claimed::add);

        for (var op : result.operations()) {
            if (op.parameterized()) {
                log.warn("Topic '{}' has channel parameters: kept verbatim, but a Kafka topic name cannot "
                        + "contain braces — set the real topic (or a pattern) in the model", op.topic());
            }
            if (op.direction() == Direction.SEND) {
                var event = upsertEvent(op, projectId, claimed);
                eventIds.add(event.id());
                log.info("Saved domain event '{}' ({}) for topic '{}'", event.name(), event.id(), op.topic());
            } else {
                var subscription = upsertSubscription(op, projectId, claimed);
                subscriptionIds.add(subscription.id());
                log.info("Saved subscription '{}' ({}) for topic '{}'", subscription.name(), subscription.id(), op.topic());
            }
        }

        repository.save(boundedContext.toBuilder()
                .domainEventIds(new ArrayList<>(eventIds))
                .subscriptionIds(new ArrayList<>(subscriptionIds))
                .build());
        log.info("Bounded context '{}' owns {} domain events and {} subscriptions ({} models from payloads)",
                boundedContext.id(), eventIds.size(), subscriptionIds.size(), result.models().size());
    }

    private BoundedContextEntity targetBoundedContext(String boundedContextId) {
        var all = repository.findAllOfType(BoundedContextEntity.class);
        var ids = all.stream().map(BoundedContextEntity::id).sorted().toList();
        if (boundedContextId != null && !boundedContextId.isBlank()) {
            return repository.findById(boundedContextId, BoundedContextEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("No bounded context '" + boundedContextId
                            + "' in the model (there are: " + String.join(", ", ids) + ")"));
        }
        if (all.size() == 1) return all.get(0);
        if (all.isEmpty()) {
            throw new IllegalArgumentException("The model has no bounded context to own the imported events "
                    + "and subscriptions: create one first");
        }
        throw new IllegalArgumentException("The model has " + all.size() + " bounded contexts (" + String.join(", ", ids)
                + "): say which one owns the imported events and subscriptions with -Dmodux.boundedContextId=<id>");
    }

    private String idOf(AsyncOperation op) {
        var slug = AsyncApiMapper.kebab(op.name());
        return op.direction() == Direction.SEND ? "ev-" + slug : "sub-" + slug;
    }

    /**
     * The element this operation updates: the one with its id, else (an earlier import under a random
     * id, or a hand-written element) the one on the same topic that this import does not claim.
     */
    private <T> Optional<T> existing(String id, String topic, Class<T> type, Function<T, String> idFn,
                                     Function<T, String> topicFn, Set<String> claimed) {
        var byId = repository.findById(id, type);
        if (byId.isPresent()) return byId;
        var byTopic = repository.findAllOfType(type).stream()
                .filter(e -> topic.equals(topicFn.apply(e)))
                .filter(e -> !claimed.contains(idFn.apply(e)))
                .findFirst();
        byTopic.ifPresent(e -> claimed.add(idFn.apply(e)));
        return byTopic;
    }

    private DomainEventEntity upsertEvent(AsyncOperation op, String projectId, Set<String> claimed) {
        var e = existing(idOf(op), op.topic(), DomainEventEntity.class, DomainEventEntity::id,
                DomainEventEntity::topicName, claimed).orElse(null);
        var event = e == null
                // the contract puts it on the wire: it is published as an integration event
                ? new DomainEventEntity(idOf(op), op.name(), op.payloadModelId(), true,
                        null, op.topic(), null, null, null, null, false, null, null, null, null, false,
                        projectId, op.description())
                : new DomainEventEntity(e.id(), op.name(), or(op.payloadModelId(), e.modelId()),
                        e.publishAsIntegrationEvent(), e.integrationModelId(), op.topic(), e.partitions(),
                        e.retentionMs(), e.serializationFormat(), e.compressionType(), e.deadLetterQueueEnabled(),
                        e.deadLetterQueueName(), e.maxDeliveryAttempts(), e.schemaVersion(), e.routingKeyField(),
                        e.replayable(), or(e.projectId(), projectId), or(op.description(), e.description()));
        repository.save(event);
        return event;
    }

    private SubscriptionEntity upsertSubscription(AsyncOperation op, String projectId, Set<String> claimed) {
        var s = existing(idOf(op), op.topic(), SubscriptionEntity.class, SubscriptionEntity::id,
                SubscriptionEntity::topicName, claimed).orElse(null);
        var eventName = or(op.messageName(), op.name());
        var subscription = s == null
                ? new SubscriptionEntity(idOf(op), op.name(), eventName, null, op.payloadModelId(), op.topic(),
                        null, null, null, List.of(), null, null, null, null, null, null,
                        true, null, projectId, op.description())
                // what the user wired (actions, consumer group, retries…) survives a re-import
                : new SubscriptionEntity(s.id(), op.name(), eventName, s.sourceService(),
                        or(op.payloadModelId(), s.inputModelId()), op.topic(), s.consumerGroup(), s.retryCount(),
                        s.deadLetterTopic(), s.actions(), s.scalingStrategy(), s.filterExpression(), s.batchSize(),
                        s.batchTimeout(), s.offsetResetStrategy(), s.consumerTimeout(), s.idempotencyEnabled(),
                        s.idempotencyKeyField(), or(s.projectId(), projectId), or(op.description(), s.description()));
        repository.save(subscription);
        return subscription;
    }

    private static String or(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private static List<String> nn(List<String> l) {
        return l == null ? List.of() : l;
    }
}
