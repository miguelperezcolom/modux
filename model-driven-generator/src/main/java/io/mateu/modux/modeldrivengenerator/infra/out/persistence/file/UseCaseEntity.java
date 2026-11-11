package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;

import java.util.List;

@lombok.Builder(toBuilder = true)
public record UseCaseEntity(
        String id,
        String name,
        boolean exposedAsRest,
        boolean exposedAsGrpc,
        boolean exposedAsMcp,
        boolean exposedAsAsync,
        boolean exposedAsUi,
        String inputModelId,
        String outputModelId,
        List<UseCaseStepEntity> steps,
        List<String> allowedRoles,
        List<String> allowedScopes,
        String apiVersion,
        String mcpDescription,
        String restHttpMethod,
        String restPath,
        Integer asyncRetryCount,
        String asyncDeadLetterQueue,
        String asyncOrderingKey,
        String asyncTopicName,
        String asyncConsumerGroup,
        boolean cacheable,
        Integer cacheTtlSeconds,
        Long timeoutMs,
        String transactionBoundary,
        boolean idempotencyEnabled,
        String idempotencyKeyField,
        boolean rateLimitEnabled,
        Integer rateLimitRequestsPerSecond,
        String grpcServiceName,
        String grpcMethodName,
        /** Architecture decisions (ADRs) this use case traces back to. */
        List<String> decisionIds,
        /**
         * A policy: reaction/automation logic with the SHAPE of a use case but that does
         * not express a business case — it exists to react to events (the lilac sticky in
         * an EventStorming). Policies stay out of business catalogs and UI derivations.
         */
        boolean policy,
        /** Optional human title for UIs and catalogs; falls back to the name. */
        String title,
        /**
         * When set, the use case surfaces as a per-row action on that aggregate's generated
         * CRUD listing (its command takes the row id). E.g. RelanzarCompra on CompraHotel.
         */
        String rowActionForAggregateId
,
        /** The project this element belongs to (selection scoping; null = legacy, claimed on open). */
        String projectId,
        /** Free-text description — shown on hover in the editor, edited in the ficha. */
        String description
) implements Identifiable {

    /** Backward-compatible constructor (pre-title/rowAction callers). */
    public UseCaseEntity(String id, String name, boolean exposedAsRest, boolean exposedAsGrpc,
                         boolean exposedAsMcp, boolean exposedAsAsync, boolean exposedAsUi,
                         String inputModelId, String outputModelId, List<UseCaseStepEntity> steps,
                         List<String> allowedRoles, List<String> allowedScopes, String apiVersion,
                         String mcpDescription, String restHttpMethod, String restPath,
                         Integer asyncRetryCount, String asyncDeadLetterQueue, String asyncOrderingKey,
                         String asyncTopicName, String asyncConsumerGroup, boolean cacheable,
                         Integer cacheTtlSeconds, Long timeoutMs, String transactionBoundary,
                         boolean idempotencyEnabled, String idempotencyKeyField,
                         boolean rateLimitEnabled, Integer rateLimitRequestsPerSecond,
                         String grpcServiceName, String grpcMethodName, List<String> decisionIds,
                         boolean policy, String projectId) {
        this(id, name, exposedAsRest, exposedAsGrpc, exposedAsMcp, exposedAsAsync, exposedAsUi,
                inputModelId, outputModelId, steps, allowedRoles, allowedScopes, apiVersion,
                mcpDescription, restHttpMethod, restPath, asyncRetryCount, asyncDeadLetterQueue,
                asyncOrderingKey, asyncTopicName, asyncConsumerGroup, cacheable, cacheTtlSeconds,
                timeoutMs, transactionBoundary, idempotencyEnabled, idempotencyKeyField,
                rateLimitEnabled, rateLimitRequestsPerSecond, grpcServiceName, grpcMethodName,
                decisionIds, policy, null, null, projectId, null);
    }

    /** Backward-compatible constructor (pre-policy callers). */
    public UseCaseEntity(String id, String name, boolean exposedAsRest, boolean exposedAsGrpc,
                         boolean exposedAsMcp, boolean exposedAsAsync, boolean exposedAsUi,
                         String inputModelId, String outputModelId, List<UseCaseStepEntity> steps,
                         List<String> allowedRoles, List<String> allowedScopes, String apiVersion,
                         String mcpDescription, String restHttpMethod, String restPath,
                         Integer asyncRetryCount, String asyncDeadLetterQueue, String asyncOrderingKey,
                         String asyncTopicName, String asyncConsumerGroup, boolean cacheable,
                         Integer cacheTtlSeconds, Long timeoutMs, String transactionBoundary,
                         boolean idempotencyEnabled, String idempotencyKeyField,
                         boolean rateLimitEnabled, Integer rateLimitRequestsPerSecond,
                         String grpcServiceName, String grpcMethodName, List<String> decisionIds) {
        this(id, name, exposedAsRest, exposedAsGrpc, exposedAsMcp, exposedAsAsync, exposedAsUi,
                inputModelId, outputModelId, steps, allowedRoles, allowedScopes, apiVersion,
                mcpDescription, restHttpMethod, restPath, asyncRetryCount, asyncDeadLetterQueue,
                asyncOrderingKey, asyncTopicName, asyncConsumerGroup, cacheable, cacheTtlSeconds,
                timeoutMs, transactionBoundary, idempotencyEnabled, idempotencyKeyField,
                rateLimitEnabled, rateLimitRequestsPerSecond, grpcServiceName, grpcMethodName,
                decisionIds, false, null, null, null, null);
    }

    /** Backward-compatible constructor (pre-decisionIds callers). */
    public UseCaseEntity(String id, String name, boolean exposedAsRest, boolean exposedAsGrpc,
                         boolean exposedAsMcp, boolean exposedAsAsync, boolean exposedAsUi,
                         String inputModelId, String outputModelId, List<UseCaseStepEntity> steps,
                         List<String> allowedRoles, List<String> allowedScopes, String apiVersion,
                         String mcpDescription, String restHttpMethod, String restPath,
                         Integer asyncRetryCount, String asyncDeadLetterQueue, String asyncOrderingKey,
                         String asyncTopicName, String asyncConsumerGroup, boolean cacheable,
                         Integer cacheTtlSeconds, Long timeoutMs, String transactionBoundary,
                         boolean idempotencyEnabled, String idempotencyKeyField,
                         boolean rateLimitEnabled, Integer rateLimitRequestsPerSecond,
                         String grpcServiceName, String grpcMethodName) {
        this(id, name, exposedAsRest, exposedAsGrpc, exposedAsMcp, exposedAsAsync, exposedAsUi,
                inputModelId, outputModelId, steps, allowedRoles, allowedScopes, apiVersion,
                mcpDescription, restHttpMethod, restPath, asyncRetryCount, asyncDeadLetterQueue,
                asyncOrderingKey, asyncTopicName, asyncConsumerGroup, cacheable, cacheTtlSeconds,
                timeoutMs, transactionBoundary, idempotencyEnabled, idempotencyKeyField,
                rateLimitEnabled, rateLimitRequestsPerSecond, grpcServiceName, grpcMethodName,
                List.of(), false, null, null, null, null);
    }
}
