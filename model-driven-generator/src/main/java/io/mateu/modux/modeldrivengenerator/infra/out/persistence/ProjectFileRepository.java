package io.mateu.modux.modeldrivengenerator.infra.out.persistence;

import io.mateu.modux.modeldrivengenerator.application.out.repositories.ProjectRepository;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.Project;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.ProjectEnvironmentConfig;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ContextMapRelation;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ContextMapRelationType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectEnvironment;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectId;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ContextMapRelationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DeploymentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEnvironmentConfigEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProjectFileRepository implements ProjectRepository {

    final ModelStore repository;

    @Override
    public Optional<Project> findById(ProjectId id) {
        return repository.findById(id.id(), ProjectEntity.class)
                .map(entity -> loadWith(entity, deploymentOf(entity)));
    }

    /** The project's deployment element, or an empty one when the store has none yet. */
    private DeploymentEntity deploymentOf(ProjectEntity project) {
        return repository.findById(DeploymentEntity.idFor(project.id()), DeploymentEntity.class)
                .orElseGet(() -> DeploymentEntity.isCarriedBy(project)
                        ? DeploymentEntity.fromLegacy(project)
                        : DeploymentEntity.emptyFor(project.id()));
    }

    private Project loadWith(ProjectEntity entity, DeploymentEntity deployment) {
        return Project.load(
                        entity.id(),
                        entity.name(),
                        entity.outputPath(),
                        entity.packageName(),
                        entity.gitRepository(),
                        deployment.database(),
                        deployment.dbMigrationTool(),
                        deployment.terraformProvider(), deployment.terraformProviderVersion(),
                        deployment.terraformBackendType(),
                        deployment.iamProvider(),
                        deployment.messageBrokerType(),
                        deployment.tracingProvider(),
                        deployment.metricsProvider(),
                        deployment.loggingProvider(),
                        deployment.llmProvider(),
                        deployment.cacheProvider(),
                        deployment.fileStorageProvider(),
                        deployment.emailProvider(),
                        deployment.secretsProvider(),
                        deployment.cicdProvider(),
                        deployment.environments() == null ? List.<ProjectEnvironmentConfig>of() :
                                deployment.environments().stream().map(e -> new ProjectEnvironmentConfig(
                                        e.environment() != null ? ProjectEnvironment.valueOf(e.environment()) : null,
                                        e.kubernetesClusterUrl(),
                                        e.kubernetesNamespace(),
                                        e.kubernetesContext(),
                                        e.kubernetesToken(),
                                        e.kubernetesCertificateAuthorityData(),
                                        e.terraformBackendBucket(),
                                        e.terraformBackendRegion(),
                                        e.terraformBackendKey(),
                                        e.terraformWorkspace(),
                                        e.iamServerUrl(),
                                        e.iamRealm(),
                                        e.iamClientId(),
                                        e.iamClientSecret(),
                                        e.iamAudience(),
                                        e.messageBrokerUrl(),
                                        e.messageBrokerUsername(),
                                        e.messageBrokerPassword(),
                                        e.tracingEndpoint(),
                                        e.metricsEndpoint(),
                                        e.loggingEndpoint(),
                                        e.llmApiUrl(),
                                        e.llmApiKey(),
                                        e.llmModel(),
                                        e.cacheUrl(),
                                        e.cacheUsername(),
                                        e.cachePassword(),
                                        e.fileStorageBucket(),
                                        e.fileStorageRegion(),
                                        e.fileStorageAccessKey(),
                                        e.fileStorageSecretKey(),
                                        e.fileStorageEndpoint(),
                                        e.emailHost(),
                                        e.emailPort(),
                                        e.emailUsername(),
                                        e.emailPassword(),
                                        e.emailFrom(),
                                        e.secretsEndpoint(),
                                        e.secretsToken(),
                                        e.ingressDomain(),
                                        e.ingressTlsEnabled(),
                                        e.ingressClassName(), e.deployTarget(), e.imageRegistry(), e.dnsProvider(), e.certIssuer()
                                )).toList(),
                        entity.serviceIds(),
                        repository.findAllOfType(ContextMapRelationEntity.class).stream()
                                .map(r -> new ContextMapRelation(r.id(), r.name(), r.sourceBoundedContextId(), r.targetBoundedContextId(),
                                        r.type() != null ? ContextMapRelationType.valueOf(r.type()) : null, r.description()))
                                .toList());
    }

    @Override
    public Project save(Project entity) {
        // Carry over fields the domain Project does not (yet) model, so a UI save never wipes
        // what was authored in the YAML store.
        var existing = repository.findById(entity.getId().id(), ProjectEntity.class).orElse(null);
        // Start from the STORED entity: whatever the domain Project does not model
        // (tenancy, external systems, objective, locales, dockerRegistry…) survives.
        var builder = existing != null ? existing.toBuilder() : ProjectEntity.builder();
        repository.save(builder
                .id(entity.getId().id())
                .name(entity.getName().name())
                .outputPath(entity.getOutputPath().path())
                .packageName(entity.getPackageName().packageName())
                .gitRepository(entity.getGitRepository())
                .serviceIds(entity.getServices().stream()
                        .map(s -> s.id())
                        .toList())
                .build());
        saveDeployment(entity);
        saveContextMap(entity);
        return entity;
    }

    /**
     * Persist the deployment settings as their own element.
     *
     * <p>Starts from what is stored so a save through the form never wipes a field the domain
     * {@code Project} does not model.
     */
    private void saveDeployment(Project entity) {
        var id = entity.getId().id();
        // start from what is stored — including a not-yet-migrated project's inline settings —
        // so the fields the domain does not model (dockerRegistry, tenancy) are not wiped
        var stored = repository.findById(id, ProjectEntity.class)
                .map(this::deploymentOf)
                .orElseGet(() -> DeploymentEntity.emptyFor(id));
        var builder = stored.toBuilder().id(DeploymentEntity.idFor(id));
        repository.save(builder
                .database(entity.getDatabase())
                .dbMigrationTool(entity.getDbMigrationTool())
                .terraformProvider(entity.getTerraformProvider())
                .terraformProviderVersion(entity.getTerraformProviderVersion())
                .terraformBackendType(entity.getTerraformBackendType())
                .iamProvider(entity.getIamProvider())
                .messageBrokerType(entity.getMessageBrokerType())
                .tracingProvider(entity.getTracingProvider())
                .metricsProvider(entity.getMetricsProvider())
                .loggingProvider(entity.getLoggingProvider())
                .llmProvider(entity.getLlmProvider())
                .cacheProvider(entity.getCacheProvider())
                .fileStorageProvider(entity.getFileStorageProvider())
                .emailProvider(entity.getEmailProvider())
                .secretsProvider(entity.getSecretsProvider())
                .cicdProvider(entity.getCicdProvider() != null ? entity.getCicdProvider().name() : null)
                .environments(entity.getEnvironments() == null ? List.<ProjectEnvironmentConfigEntity>of() :
                        entity.getEnvironments().stream().map(e -> new ProjectEnvironmentConfigEntity(
                                e.environment() != null ? e.environment().name() : null,
                                e.kubernetesClusterUrl(),
                                e.kubernetesNamespace(),
                                e.kubernetesContext(),
                                e.kubernetesToken(),
                                e.kubernetesCertificateAuthorityData(),
                                e.terraformBackendBucket(),
                                e.terraformBackendRegion(),
                                e.terraformBackendKey(),
                                e.terraformWorkspace(),
                                e.iamServerUrl(),
                                e.iamRealm(),
                                e.iamClientId(),
                                e.iamClientSecret(),
                                e.iamAudience(),
                                e.messageBrokerUrl(),
                                e.messageBrokerUsername(),
                                e.messageBrokerPassword(),
                                e.tracingEndpoint(),
                                e.metricsEndpoint(),
                                e.loggingEndpoint(),
                                e.llmApiUrl(),
                                e.llmApiKey(),
                                e.llmModel(),
                                e.cacheUrl(),
                                e.cacheUsername(),
                                e.cachePassword(),
                                e.fileStorageBucket(),
                                e.fileStorageRegion(),
                                e.fileStorageAccessKey(),
                                e.fileStorageSecretKey(),
                                e.fileStorageEndpoint(),
                                e.emailHost(),
                                e.emailPort(),
                                e.emailUsername(),
                                e.emailPassword(),
                                e.emailFrom(),
                                e.secretsEndpoint(),
                                e.secretsToken(),
                                e.ingressDomain(),
                                e.ingressTlsEnabled(),
                                e.ingressClassName(), e.deployTarget(), e.imageRegistry(), e.dnsProvider(), e.certIssuer()
                        )).toList())
                .build());
    }

    /**
     * Persist the strategic relations as top-level elements.
     *
     * <p>They used to be a field of the project, so saving the project saved them. Now each is its
     * own element and its own file — see {@code docs/design/ide-plugin.md} §4.3 — so the ones the
     * form dropped have to be deleted explicitly.
     */
    private void saveContextMap(Project entity) {
        var incoming = entity.getContextMap() == null ? List.<ContextMapRelation>of() : entity.getContextMap();
        var byId = repository.findAllOfType(ContextMapRelationEntity.class).stream()
                .collect(java.util.stream.Collectors.toMap(ContextMapRelationEntity::id, r -> r, (a, b) -> a));
        var keep = incoming.stream().map(ContextMapRelation::id).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        var gone = byId.keySet().stream().filter(id -> !keep.contains(id)).toList();
        if (!gone.isEmpty()) repository.deleteAllById(gone, ContextMapRelationEntity.class);
        for (var r : incoming) {
            repository.save(new ContextMapRelationEntity(
                    r.id(), r.name(), r.sourceBoundedContextId(), r.targetBoundedContextId(),
                    r.type() != null ? r.type().name() : null, r.description(),
                    // per-relation decisionIds carry-over (not modeled in the domain yet)
                    byId.containsKey(r.id()) ? byId.get(r.id()).decisionIds() : List.of()));
        }
    }

    @Override
    public void deleteAllById(List<ProjectId> selectedIds) {
        repository.deleteAllById(selectedIds.stream().map(ProjectId::id).toList(), ProjectEntity.class);
    }
}
