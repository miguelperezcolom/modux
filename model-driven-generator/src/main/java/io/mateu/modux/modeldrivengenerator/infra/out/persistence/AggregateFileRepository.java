package io.mateu.modux.modeldrivengenerator.infra.out.persistence;

import io.mateu.modux.modeldrivengenerator.application.out.repositories.AggregateRepository;
import io.mateu.modux.modeldrivengenerator.application.out.query.dtos.FieldValueSettingDto;
import io.mateu.modux.modeldrivengenerator.application.out.query.dtos.InvariantConditionDto;
import io.mateu.modux.modeldrivengenerator.application.out.query.dtos.InvariantDto;
import io.mateu.modux.modeldrivengenerator.application.out.query.dtos.OperationDto;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.aggregate.Aggregate;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.aggregate.vo.AggregateId;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.operation.vo.DomainEventName;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.operation.vo.OperationPrecondition;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.operation.vo.OperationType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InvariantConditionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InvariantEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static io.mateu.modux.modeldrivengenerator.domain.shared.Json.listFromJson;
import static io.mateu.modux.modeldrivengenerator.domain.shared.Json.toJson;

@Service
@RequiredArgsConstructor
public class AggregateFileRepository implements AggregateRepository {

    final ModelStore repository;

    @Override
    public Optional<Aggregate> findById(AggregateId id) {
        return repository.findById(id.id(), AggregateEntity.class)
                .map(entity -> Aggregate.load(
                        entity.id(),
                        entity.name(),
                        entity.modelId(),
                        entity.persistenceType() != null ? entity.persistenceType().name() : null,
                        entity.idType() != null ? entity.idType().name() : null,
                        entity.tableName(),
                        entity.tableSchema(),
                        entity.optimisticLockingEnabled(),
                        entity.eventSourcingEnabled(),
                        entity.snapshotFrequency(),
                        entity.operations().stream()
                                .map(operationEntity -> new OperationDto(
                                        operationEntity.id(),
                                        operationEntity.name(),
                                        operationEntity.inputModelId(),
                                        operationEntity.outputModelId(),
                                        Arrays.asList(operationEntity.preconditions().split(",")),
                                        listFromJson(operationEntity.sets(), FieldValueSettingDto.class),
                                        Arrays.asList(operationEntity.emits().split(",")),
                                        OperationType.valueOf(operationEntity.type()),
                                        operationEntity.paginated(),
                                        operationEntity.defaultPageSize()
                                ))
                                .toList(),
                        entity.invariants().stream().map(invariantEntity -> new InvariantDto(
                                invariantEntity.id(),
                                invariantEntity.name(),
                                invariantEntity.conditions() != null ? invariantEntity.conditions().stream()
                                        .map(c -> new InvariantConditionDto(c.id(), c.expression(), c.custom(), c.description(), c.errorMessage()))
                                        .toList() : List.of()
                        )).toList(),
                        entity.valueObjectIds()
                ));
    }

    @Override
    public Aggregate save(Aggregate entity) {
        // The domain Aggregate does not (yet) model lifecycle/audited — carry them over from the
        // stored entity so a UI save never wipes what was authored in the YAML store.
        var existing = repository.findById(entity.getId().id(), AggregateEntity.class).orElse(null);
        repository.save(new AggregateEntity(
                entity.getId().id(),
                entity.getName().name(),
                entity.getModelId() != null ? entity.getModelId().id() : null,
                entity.getPersistenceType(),
                entity.getIdType(),
                entity.getTableName(),
                entity.getTableSchema(),
                entity.isOptimisticLockingEnabled(),
                entity.isEventSourcingEnabled(),
                entity.getSnapshotFrequency(),
                entity.getOperations().stream()
                        .map(operation -> {
                            // carry over per-operation fields the domain does not model yet (intent)
                            var previousOp = existing == null || existing.operations() == null ? null
                                    : existing.operations().stream()
                                            .filter(o -> o.id() != null && o.id().equals(operation.getId().id()))
                                            .findFirst().orElse(null);
                            return new OperationEntity(
                                    operation.getId().id(),
                                    operation.getName().name(),
                                    operation.getInputModelId(),
                                    operation.getOutputModelId(),
                                    String.join(",", operation.getPreconditions().stream()
                                            .map(OperationPrecondition::precondition).toList()),
                                    (operation.getSets() != null && !operation.getSets().isEmpty()) ? toJson(operation.getSets()) : null,
                                    String.join(",", operation.getEmits().stream()
                                            .map(DomainEventName::eventName).toList()),
                                    operation.getType().name(),
                                    operation.isPaginated(),
                                    operation.getDefaultPageSize(),
                                    previousOp != null ? previousOp.intent() : null);
                        }).toList(),
                entity.getInvariants().stream()
                        .map(invariant -> new InvariantEntity(
                                invariant.getId().id(),
                                invariant.getName().name(),
                                invariant.getConditions() != null ? invariant.getConditions().stream()
                                        .map(c -> new InvariantConditionEntity(c.id(), c.expression(), c.custom(), c.description(), c.errorMessage()))
                                        .toList() : List.of()
                        , null)).toList(),
                entity.getValueObjectIds(),
                existing != null ? existing.lifecycle() : null,
                existing != null && existing.audited(),
                // dataAccess is not modeled in the domain Aggregate yet — carry it over so a UI
                // save never wipes the authored override (same doctrine as decisionIds above).
                existing != null ? existing.decisionIds() : List.of(), null, null,
                existing != null ? existing.dataAccess() : null)
                // nor title, description, project or editable: carried over too
                .toBuilder()
                .title(existing != null ? existing.title() : null)
                .projectId(existing != null ? existing.projectId() : null)
                .description(existing != null ? existing.description() : null)
                .editable(existing != null ? existing.editable() : null)
                .build());
        return entity;
    }

    @Override
    public void deleteAllById(List<AggregateId> selectedIds) {
        repository.deleteAllById(selectedIds.stream().map(AggregateId::id).toList(), AggregateEntity.class);
    }
}
