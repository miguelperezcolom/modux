package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.queryservice.vo.QueryCardinality;

public record QueryOperationEntity(
        String id,
        String name,
        String description,
        String inputModelId,
        String outputModelId,
        QueryCardinality cardinality,
        /**
         * Group the rows by this field of the read model: one row per value, with how many rows it
         * stands for and the sum of every numeric field (a panel: entries sold and revenue per concert).
         */
        String groupBy,
        /** Only the rows where {@code field=value} (several joined by {@code ,}), e.g. {@code estado=CONFIRMADA}. */
        String filter
) {

    /** Backward-compatible constructor (pre-groupBy callers and stores). */
    public QueryOperationEntity(String id, String name, String description, String inputModelId,
                                String outputModelId, QueryCardinality cardinality) {
        this(id, name, description, inputModelId, outputModelId, cardinality, null, null);
    }
}
