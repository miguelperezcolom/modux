package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.CacheProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.DbMigrationTool;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.EmailProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.FileStorageProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.SecretsProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.TenancyStrategy;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.IamProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.LlmProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.LoggingProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.MessageBrokerType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.MetricsProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.TracingProvider;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.TerraformBackendType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.TerraformProvider;
import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;

import java.util.List;

@lombok.Builder(toBuilder = true)
public record ProjectEntity(
        String id,
        String name,
        String outputPath,
        String packageName,
        String gitRepository,
        List<String> serviceIds,
        /** Context and objective of the system, in prose (the §1 of a design document). */
        String objective,
        /** i18n: the locales the system speaks (e.g. es-ES, en, de); labels become keys at generation. */
        List<String> locales,
        String defaultLocale,
        /**
         * Data-access strategy for the generated code: JPA (legacy), JDBC (reads via
         * JdbcTemplate) or STORED_PROCEDURE (aggregate retrieval via a generated stored
         * procedure, falling back to JDBC — the default when unset). Overridable per aggregate.
         */
        String dataAccess,

        // ---- LEGACY: read by the migration on load, never by anything else -----------------
        // Each of these became its own element type so it stops sharing a file — and a git
        // conflict — with everything else. They survive here only so a store written before
        // that migrates instead of silently losing its content, because Jackson drops unknown
        // properties. CommonFileRepository.hoistLegacyProjectElements empties them on load, and
        // they can go once no store in the wild predates the split.

        /** @see ContextMapRelationEntity */
        List<ContextMapRelationEntity> contextMap,
        /** @see ExternalSystemEntity */
        List<ExternalSystemEntity> externalSystems,
        /** @see DeploymentEntity */
        String database,
        /** @see DeploymentEntity */
        DbMigrationTool dbMigrationTool,
        /** @see DeploymentEntity */
        TerraformProvider terraformProvider,
        /** @see DeploymentEntity */
        String terraformProviderVersion,
        /** @see DeploymentEntity */
        TerraformBackendType terraformBackendType,
        /** @see DeploymentEntity */
        IamProvider iamProvider,
        /** @see DeploymentEntity */
        MessageBrokerType messageBrokerType,
        /** @see DeploymentEntity */
        TracingProvider tracingProvider,
        /** @see DeploymentEntity */
        MetricsProvider metricsProvider,
        /** @see DeploymentEntity */
        LoggingProvider loggingProvider,
        /** @see DeploymentEntity */
        LlmProvider llmProvider,
        /** @see DeploymentEntity */
        CacheProvider cacheProvider,
        /** @see DeploymentEntity */
        FileStorageProvider fileStorageProvider,
        /** @see DeploymentEntity */
        EmailProvider emailProvider,
        /** @see DeploymentEntity */
        SecretsProvider secretsProvider,
        /** @see DeploymentEntity */
        String cicdProvider,
        /** @see DeploymentEntity */
        String dockerRegistry,
        /** @see DeploymentEntity */
        List<ProjectEnvironmentConfigEntity> environments,
        /** @see DeploymentEntity */
        TenancyStrategy tenancyStrategy) implements Identifiable {

    public ProjectEntity {
        if (serviceIds == null) serviceIds = List.of();
        if (locales == null) locales = List.of();
        if (contextMap == null) contextMap = List.of();
        if (externalSystems == null) externalSystems = List.of();
        if (environments == null) environments = List.of();
    }
}
