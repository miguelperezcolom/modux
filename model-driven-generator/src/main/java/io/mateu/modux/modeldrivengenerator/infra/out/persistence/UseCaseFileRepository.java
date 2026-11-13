package io.mateu.modux.modeldrivengenerator.infra.out.persistence;

import io.mateu.modux.modeldrivengenerator.application.out.repositories.UseCaseRepository;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.UseCase;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.HttpMethod;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseId;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStep;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseStepEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UseCaseFileRepository implements UseCaseRepository {

    final ModelStore repository;

    @Override
    public Optional<UseCase> findById(UseCaseId id) {
        return repository.findById(id.id(), UseCaseEntity.class)
                .map(entity -> UseCase.load(
                        entity.id(),
                        entity.name(),
                        entity.exposedAsRest(),
                        entity.exposedAsGrpc(),
                        entity.exposedAsMcp(),
                        entity.exposedAsAsync(),
                        entity.exposedAsUi(),
                        entity.inputModelId(),
                        entity.outputModelId(),
                        toSteps(entity.steps()),
                        entity.allowedRoles(),
                        entity.allowedScopes(),
                        entity.apiVersion(),
                        entity.mcpDescription(),
                        entity.restHttpMethod() != null ? HttpMethod.valueOf(entity.restHttpMethod()) : null,
                        entity.restPath(),
                        entity.asyncRetryCount(),
                        entity.asyncDeadLetterQueue(),
                        entity.asyncOrderingKey(),
                        entity.asyncTopicName(),
                        entity.asyncConsumerGroup(),
                        entity.cacheable(),
                        entity.cacheTtlSeconds(),
                        entity.timeoutMs(),
                        entity.transactionBoundary(),
                        entity.idempotencyEnabled(),
                        entity.idempotencyKeyField(),
                        entity.rateLimitEnabled(),
                        entity.rateLimitRequestsPerSecond(),
                        entity.grpcServiceName(), entity.grpcMethodName()));
    }

    @Override
    public UseCase save(UseCase entity) {
        // decisionIds are not modeled in the domain UseCase yet — carry them over from the stored
        // entity so a UI save never wipes what was authored in the YAML store.
        var existing = repository.findById(entity.getId().id(), UseCaseEntity.class).orElse(null);
        var saved = new UseCaseEntity(
                entity.getId().id(),
                entity.getName().name(),
                entity.getExposedAsRest().value(),
                entity.getExposedAsGrpc().value(),
                entity.getExposedAsMcp().value(),
                entity.getExposedAsAsync().value(),
                entity.getExposedAsUi().value(),
                entity.getInputModelId() != null ? entity.getInputModelId().id() : null,
                entity.getOutputModelId() != null ? entity.getOutputModelId().id() : null,
                toStepEntities(entity.getSteps(), existing),
                entity.getAllowedRoles(),
                entity.getAllowedScopes(),
                entity.getApiVersion() != null ? entity.getApiVersion().version() : null,
                entity.getMcpDescription(),
                entity.getRestHttpMethod() != null ? entity.getRestHttpMethod().name() : null,
                entity.getRestPath(),
                entity.getAsyncRetryCount(),
                entity.getAsyncDeadLetterQueue(),
                entity.getAsyncOrderingKey(),
                entity.getAsyncTopicName(),
                entity.getAsyncConsumerGroup(),
                entity.isCacheable(),
                entity.getCacheTtlSeconds(),
                entity.getTimeoutMs(),
                entity.getTransactionBoundary() != null ? entity.getTransactionBoundary().name() : null,
                entity.isIdempotencyEnabled(),
                entity.getIdempotencyKeyField(),
                entity.isRateLimitEnabled(),
                entity.getRateLimitRequestsPerSecond(),
                entity.getGrpcServiceName(), entity.getGrpcMethodName(),
                existing != null ? existing.decisionIds() : List.of(),
                existing != null && existing.policy(), null);
        // nor are its title, row action, description and page template: carried over too
        if (existing != null) {
            saved = saved.toBuilder()
                    .title(existing.title())
                    .rowActionForAggregateId(existing.rowActionForAggregateId())
                    .description(existing.description())
                    .pageTemplate(existing.pageTemplate())
                    .templateFields(existing.templateFields())
                    .itemUseCaseId(existing.itemUseCaseId())
                    .build();
        }
        repository.save(saved);
        return entity;
    }

    @Override
    public void deleteAllById(List<UseCaseId> selectedIds) {
        repository.deleteAllById(selectedIds.stream().map(UseCaseId::id).toList(), UseCaseEntity.class);
    }

    private List<UseCaseStep> toSteps(List<UseCaseStepEntity> steps) {
        if (steps == null) return List.of();
        return steps.stream()
                .map(s -> new UseCaseStep(s.id(), s.name(), s.type(),
                        s.aggregateId(), s.operationId(),
                        s.gatewayId(), s.gatewayOperationId(),
                        s.domainEventId(), s.useCaseId(), s.modelMappingId()))
                .toList();
    }

    private List<UseCaseStepEntity> toStepEntities(List<UseCaseStep> steps, UseCaseEntity existing) {
        if (steps == null) return List.of();
        return steps.stream()
                .map(s -> {
                    // carry over per-step fields the domain does not model yet
                    // (query-service consumption, natural-language intent)
                    var previous = existing == null || existing.steps() == null ? null : existing.steps().stream()
                            .filter(e -> e.id() != null && e.id().equals(s.id()))
                            .findFirst().orElse(null);
                    return new UseCaseStepEntity(s.id(), s.name(), s.type(),
                            s.aggregateId(), s.operationId(),
                            s.gatewayId(), s.gatewayOperationId(),
                            s.domainEventId(), s.useCaseId(), s.modelMappingId(),
                            previous != null ? previous.queryServiceId() : null,
                            previous != null ? previous.queryOperationId() : null,
                            previous != null ? previous.intent() : null);
                })
                .toList();
    }
}
