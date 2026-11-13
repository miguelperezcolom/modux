package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.aggregate.vo.AggregateIdType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.aggregate.vo.AggregatePersistenceType;
import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;

import java.util.List;

@lombok.Builder(toBuilder = true)
public record AggregateEntity(
        String id,
        String name,
        String modelId,
        AggregatePersistenceType persistenceType,
        AggregateIdType idType,
        String tableName,
        String tableSchema,
        boolean optimisticLockingEnabled,
        boolean eventSourcingEnabled,
        Integer snapshotFrequency,
        List<OperationEntity> operations,
        List<InvariantEntity> invariants,
        List<String> valueObjectIds,
        /** Explicit state machine of the aggregate; null when the aggregate has no modeled lifecycle. */
        LifecycleEntity lifecycle,
        /** When true, every change to the aggregate is recorded with who/what/when (audit trail). */
        boolean audited,
        /** Architecture decisions (ADRs) this aggregate traces back to. */
        List<String> decisionIds,
        /** Optional human title for UIs and catalogs; falls back to the name. */
        String title
        ,
        /** The project this element belongs to (selection scoping; null = legacy, claimed on open). */
        String projectId,
        /**
         * Data-access override for this aggregate: JPA, JDBC or STORED_PROCEDURE;
         * null inherits the project's {@code dataAccess} strategy.
         */
        String dataAccess,
        /** Free-text description — shown on hover in the editor, edited in the ficha. */
        String description,
        /**
         * With operations, whether it can ALSO be edited field by field (its invariants decide in
         * which states): a draft that is written freely and moves on through operations. By default
         * an aggregate with operations changes only through them.
         */
        Boolean editable
) implements Identifiable {

    /** Backward-compatible constructor (pre-editable callers). */
    public AggregateEntity(String id, String name, String modelId,
            AggregatePersistenceType persistenceType, AggregateIdType idType,
            String tableName, String tableSchema, boolean optimisticLockingEnabled,
            boolean eventSourcingEnabled, Integer snapshotFrequency, List<OperationEntity> operations,
            List<InvariantEntity> invariants, List<String> valueObjectIds, LifecycleEntity lifecycle,
            boolean audited, List<String> decisionIds, String title, String projectId, String dataAccess,
            String description) {
        this(id, name, modelId, persistenceType, idType, tableName, tableSchema,
                optimisticLockingEnabled, eventSourcingEnabled, snapshotFrequency, operations,
                invariants, valueObjectIds, lifecycle, audited, decisionIds, title, projectId,
                dataAccess, description, null);
    }

    /** Backward-compatible constructor (pre-description callers). */
    public AggregateEntity(String id, String name, String modelId,
            AggregatePersistenceType persistenceType, AggregateIdType idType,
            String tableName, String tableSchema, boolean optimisticLockingEnabled,
            boolean eventSourcingEnabled, Integer snapshotFrequency, List<OperationEntity> operations,
            List<InvariantEntity> invariants, List<String> valueObjectIds, LifecycleEntity lifecycle,
            boolean audited, List<String> decisionIds, String title, String projectId, String dataAccess) {
        this(id, name, modelId, persistenceType, idType, tableName, tableSchema,
                optimisticLockingEnabled, eventSourcingEnabled, snapshotFrequency, operations,
                invariants, valueObjectIds, lifecycle, audited, decisionIds, title, projectId,
                dataAccess, null);
    }

    /** Backward-compatible constructor (pre-lifecycle/audited callers and stores). */
    public AggregateEntity(String id, String name, String modelId,
                           AggregatePersistenceType persistenceType, AggregateIdType idType,
                           String tableName, String tableSchema,
                           boolean optimisticLockingEnabled, boolean eventSourcingEnabled,
                           Integer snapshotFrequency, List<OperationEntity> operations,
                           List<InvariantEntity> invariants, List<String> valueObjectIds) {
        this(id, name, modelId, persistenceType, idType, tableName, tableSchema,
                optimisticLockingEnabled, eventSourcingEnabled, snapshotFrequency,
                operations, invariants, valueObjectIds, null, false, List.of(), null, null, null);
    }

    /** Backward-compatible constructor (pre-title callers). */
    public AggregateEntity(String id, String name, String modelId,
                           AggregatePersistenceType persistenceType, AggregateIdType idType,
                           String tableName, String tableSchema,
                           boolean optimisticLockingEnabled, boolean eventSourcingEnabled,
                           Integer snapshotFrequency, List<OperationEntity> operations,
                           List<InvariantEntity> invariants, List<String> valueObjectIds,
                           LifecycleEntity lifecycle, boolean audited, List<String> decisionIds,
                           String projectId) {
        this(id, name, modelId, persistenceType, idType, tableName, tableSchema,
                optimisticLockingEnabled, eventSourcingEnabled, snapshotFrequency,
                operations, invariants, valueObjectIds, lifecycle, audited, decisionIds,
                null, projectId, null);
    }

    /** Backward-compatible constructor (pre-decisionIds callers). */
    public AggregateEntity(String id, String name, String modelId,
                           AggregatePersistenceType persistenceType, AggregateIdType idType,
                           String tableName, String tableSchema,
                           boolean optimisticLockingEnabled, boolean eventSourcingEnabled,
                           Integer snapshotFrequency, List<OperationEntity> operations,
                           List<InvariantEntity> invariants, List<String> valueObjectIds,
                           LifecycleEntity lifecycle, boolean audited) {
        this(id, name, modelId, persistenceType, idType, tableName, tableSchema,
                optimisticLockingEnabled, eventSourcingEnabled, snapshotFrequency,
                operations, invariants, valueObjectIds, lifecycle, audited, List.of(), null, null,
                null);
    }

    @Override
    public List<OperationEntity> operations() {
        return operations != null ? operations : List.of();
    }

    @Override
    public List<InvariantEntity> invariants() {
        return invariants != null ? invariants : List.of();
    }

    @Override
    public List<String> valueObjectIds() {
        return valueObjectIds != null ? valueObjectIds : List.of();
    }
}
