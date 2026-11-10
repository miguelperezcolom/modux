package io.mateu.modux.modeldrivengenerator.application.usecases.project.save;

import io.mateu.modux.modeldrivengenerator.application.out.repositories.ProjectRepository;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.ProjectEnvironmentConfig;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.CicdProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectEnvironment;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectId;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectName;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectOutputPath;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ProjectPackageName;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ContextMapRelation;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.ContextMapRelationType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.service.vo.ServiceId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SaveProjectUseCase {

    final ProjectRepository repository;

    public void handle(SaveProjectCommand command) {
        var project = repository.findById(new ProjectId(command.id())).orElseThrow();

        var environments = command.environments() == null ? List.<ProjectEnvironmentConfig>of() :
                command.environments().stream().map(e -> new ProjectEnvironmentConfig(
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
                )).toList();

        project.update(new ProjectName(command.name()),
                new ProjectOutputPath(command.outputPath()),
                new ProjectPackageName(command.packageName()),
                command.gitRepository(),
                command.database(),
                command.dbMigrationTool(),
                command.terraformProvider(), command.terraformProviderVersion(),
                command.terraformBackendType(),
                command.iamProvider(),
                command.messageBrokerType(),
                command.tracingProvider(),
                command.metricsProvider(),
                command.loggingProvider(),
                command.llmProvider(),
                command.cacheProvider(),
                command.fileStorageProvider(),
                command.emailProvider(),
                command.secretsProvider(),
                command.cicdProvider() != null ? CicdProvider.valueOf(command.cicdProvider()) : null,
                environments,
                command.serviceIds().stream().map(ServiceId::new).toList(),
                command.contextMap() == null ? List.<ContextMapRelation>of() : command.contextMap().stream()
                        .map(r -> new ContextMapRelation(r.id(), r.name(), r.sourceBoundedContextId(), r.targetBoundedContextId(),
                                r.type() != null ? ContextMapRelationType.valueOf(r.type()) : null, r.description()))
                        .toList());
        repository.save(project);
    }

}
