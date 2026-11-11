package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

/**
 * A use case OFFERED by an external system — the surface our use cases call. Persisted intent
 * only: the gateway/API to reach it derives at generation time from CallExternalUseCase steps.
 */
public record ExternalSystemUseCaseEntity(
        String id,
        String name,
        String description,
        /** What it receives; when absent, the calling use case's input travels as it is. */
        String inputModelId,
        /** What it answers, handed to the steps after the call; absent = nothing. */
        String outputModelId,
        /** Where it answers, relative to the system's base URL; default {@code /{name}} (POST). */
        String path
) {

    /** Backward-compatible constructor (pre-models callers and stores). */
    public ExternalSystemUseCaseEntity(String id, String name, String description) {
        this(id, name, description, null, null, null);
    }
}
