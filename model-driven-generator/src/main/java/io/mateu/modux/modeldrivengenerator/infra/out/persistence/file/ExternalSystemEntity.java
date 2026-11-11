package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ExternalSystemDirection;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ExternalSystemProtocol;

import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;
import java.util.List;

/**
 * A system outside the project's bounded contexts (channel manager, payment gateway, ERP, …).
 * Enterprise systems are half integration; modelling the <em>partner</em> — not just the pipe
 * (gateway) — puts it on the context map as a node, gives NOTIFIES flows a real target, places
 * the anti-corruption layer correctly, and enables generated mocks/contract tests later.
 */
@lombok.Builder(toBuilder = true)
public record ExternalSystemEntity(
        String id,
        String name,
        String description,
        ExternalSystemProtocol protocol,
        ExternalSystemDirection direction,
        /** Gateway used to reach it (when direction includes OUTBOUND); null if not wired yet. */
        String gatewayId,
        /** Team/company owning the system — who to call when it breaks. */
        String owner,
        /** Architecture decisions (ADRs) this integration traces back to. */
        List<String> decisionIds,
        /** Use cases this external system offers (targets of CallExternalUseCase steps). */
        List<ExternalSystemUseCaseEntity> useCases,
        /** Tables/datasets it owns — pollable into read models (legacy integration). */
        List<ExternalSystemTableEntity> tables,
        /** Other external systems this one depends on (strategic context-map dependency). */
        List<String> dependsOnExternalSystemIds,
        /** Published APIs (or API proxies) this system depends on. */
        List<String> dependsOnApiIds,
        /** External systems consumed through a CQRS relation (queries over their data). */
        List<String> cqrsExternalSystemIds,
        /** MCP servers this system publishes — tool surfaces AI agents consume directly. */
        List<McpServerEntity> mcpServers,
        /** Specific API operations this system calls (at the published API, a proxy or an implementation). */
        List<ExternalApiOperationUseEntity> apiOperationUses,
        /**
         * ANOTHER modux project referenced as a system: the id of the {@code ~/.modux} repository
         * it lived in.
         *
         * <p>LEGACY. Superseded by {@link #referencedProject}, a coordinate versioned with the
         * model instead of resolved against a machine-local registry (§4.7). Kept so stores
         * written before the change migrate on load rather than losing the pointer; removable
         * once none are left.
         */
        String referencedRepositoryId,
        /** The external system this one lives INSIDE — subsystems of a bigger partner. */
        String parentExternalSystemId,
        /** ANOTHER modux project referenced as a system: where to find it, versioned (§4.7). */
        ReferencedProjectEntity referencedProject,
        /**
         * Where it answers (its use cases are POSTed under it). The local default: each environment
         * overrides it with {@code {NAME}_URL}, the way a service reaches its siblings.
         */
        String baseUrl
) implements Identifiable {

    /** Backward-compatible constructor (pre-baseUrl callers and stores). */
    @SuppressWarnings("deprecation")
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds,
                                List<String> cqrsExternalSystemIds,
                                List<McpServerEntity> mcpServers,
                                List<ExternalApiOperationUseEntity> apiOperationUses,
                                String referencedRepositoryId,
                                String parentExternalSystemId,
                                ReferencedProjectEntity referencedProject) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, cqrsExternalSystemIds,
                mcpServers, apiOperationUses, referencedRepositoryId, parentExternalSystemId, referencedProject, null);
    }

    /** Whether this system stands for another modux project rather than a third party. */
    public boolean isProjectReference() {
        return referencedProject != null || referencedRepositoryId != null;
    }

    /** Backward-compatible constructor (pre-referencedProject callers and stores). */
    @SuppressWarnings("deprecation")
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds,
                                List<String> cqrsExternalSystemIds,
                                List<McpServerEntity> mcpServers,
                                List<ExternalApiOperationUseEntity> apiOperationUses,
                                String referencedRepositoryId,
                                String parentExternalSystemId) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, cqrsExternalSystemIds,
                mcpServers, apiOperationUses, referencedRepositoryId, parentExternalSystemId, null);
    }

    /** Backward-compatible constructor (pre-parentExternalSystemId callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds,
                                List<String> cqrsExternalSystemIds,
                                List<McpServerEntity> mcpServers,
                                List<ExternalApiOperationUseEntity> apiOperationUses,
                                String referencedRepositoryId) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, cqrsExternalSystemIds,
                mcpServers, apiOperationUses, referencedRepositoryId, null);
    }

    /** Backward-compatible constructor (pre-referencedRepositoryId callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds,
                                List<String> cqrsExternalSystemIds,
                                List<McpServerEntity> mcpServers,
                                List<ExternalApiOperationUseEntity> apiOperationUses) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, cqrsExternalSystemIds,
                mcpServers, apiOperationUses, null);
    }

    /** Backward-compatible constructor (pre-apiOperationUses callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds,
                                List<String> cqrsExternalSystemIds,
                                List<McpServerEntity> mcpServers) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, cqrsExternalSystemIds,
                mcpServers, List.of());
    }

    /** Backward-compatible constructor (pre-mcpServers callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds,
                                List<String> cqrsExternalSystemIds) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, cqrsExternalSystemIds,
                List.of());
    }

    /** Backward-compatible constructor (pre-cqrsExternalSystemIds callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds,
                                List<String> dependsOnApiIds) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, dependsOnApiIds, List.of(), List.of());
    }

    /** Backward-compatible constructor (pre-dependsOnApiIds callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables,
                                List<String> dependsOnExternalSystemIds) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, dependsOnExternalSystemIds, List.of(), List.of(), List.of());
    }

    /** Backward-compatible constructor (pre-dependsOnExternalSystemIds callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases,
                                List<ExternalSystemTableEntity> tables) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                tables, List.of(), List.of(), List.of(), List.of());
    }

    /** Backward-compatible constructor (pre-tables callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds,
                                List<ExternalSystemUseCaseEntity> useCases) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, useCases,
                List.of(), List.of());
    }

    /** Backward-compatible constructor (pre-useCases callers and stores). */
    public ExternalSystemEntity(String id, String name, String description,
                                ExternalSystemProtocol protocol, ExternalSystemDirection direction,
                                String gatewayId, String owner, List<String> decisionIds) {
        this(id, name, description, protocol, direction, gatewayId, owner, decisionIds, List.of(),
                List.of(), List.of());
    }

    public List<ExternalSystemUseCaseEntity> useCases() {
        return useCases != null ? useCases : List.of();
    }

    public List<ExternalSystemTableEntity> tables() {
        return tables != null ? tables : List.of();
    }

    public List<String> dependsOnExternalSystemIds() {
        return dependsOnExternalSystemIds != null ? dependsOnExternalSystemIds : List.of();
    }

    public List<String> dependsOnApiIds() {
        return dependsOnApiIds != null ? dependsOnApiIds : List.of();
    }

    public List<String> cqrsExternalSystemIds() {
        return cqrsExternalSystemIds != null ? cqrsExternalSystemIds : List.of();
    }

    public List<McpServerEntity> mcpServers() {
        return mcpServers != null ? mcpServers : List.of();
    }

    public List<ExternalApiOperationUseEntity> apiOperationUses() {
        return apiOperationUses != null ? apiOperationUses : List.of();
    }

    // Single-field copies: unlike the positional constructor, these can never silently
    // drop a field added to the record after the calling code was written.

    // The with* helpers delegate in toBuilder(): a positional constructor here is a
    // trap — every new component (referencedRepositoryId, parentExternalSystemId…)
    // would silently vanish on the first rename.

    public ExternalSystemEntity withName(String name) {
        return toBuilder().name(name).build();
    }

    public ExternalSystemEntity withUseCases(List<ExternalSystemUseCaseEntity> useCases) {
        return toBuilder().useCases(useCases).build();
    }

    public ExternalSystemEntity withTables(List<ExternalSystemTableEntity> tables) {
        return toBuilder().tables(tables).build();
    }

    public ExternalSystemEntity withDependsOnExternalSystemIds(List<String> ids) {
        return toBuilder().dependsOnExternalSystemIds(ids).build();
    }

    public ExternalSystemEntity withDependsOnApiIds(List<String> ids) {
        return toBuilder().dependsOnApiIds(ids).build();
    }

    public ExternalSystemEntity withCqrsExternalSystemIds(List<String> ids) {
        return toBuilder().cqrsExternalSystemIds(ids).build();
    }

    public ExternalSystemEntity withMcpServers(List<McpServerEntity> mcpServers) {
        return toBuilder().mcpServers(mcpServers).build();
    }

    public ExternalSystemEntity withApiOperationUses(List<ExternalApiOperationUseEntity> apiOperationUses) {
        return toBuilder().apiOperationUses(apiOperationUses).build();
    }

    public ExternalSystemEntity withReferencedProject(ReferencedProjectEntity referencedProject) {
        return toBuilder().referencedProject(referencedProject).build();
    }
}
