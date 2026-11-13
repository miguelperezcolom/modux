package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode;

import com.google.googlejavaformat.java.Formatter;
import io.mateu.modux.modeldrivengenerator.application.out.query.dtos.FieldValueSettingDto;
import io.mateu.modux.modeldrivengenerator.application.out.query.dtos.OperationDto;
import io.mateu.modux.modeldrivengenerator.application.usecases.flow.expand.AggregateStateProjections;
import io.mateu.modux.modeldrivengenerator.application.usecases.flow.expand.FlowStoreMaterializer;
import io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProxyApiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DeploymentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.LifecycleTransitionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.operation.vo.OperationType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.project.vo.DbMigrationTool;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationBodyDesugar;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BusinessRuleEntity;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ComponentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.EntityEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemUseCaseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.IntegrationEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryOperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReadModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.EnumEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelMappingEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.RoleEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SagaEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowGatewayEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SagaStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ScheduledTriggerEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SubscriptionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.IdentityProviderEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiAdapterEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UrlEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEnvironmentConfigEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiMenuItemEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiShellEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ValueObjectEntity;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static io.mateu.modux.modeldrivengenerator.domain.shared.Json.*;

@Service
@Repository
@RequiredArgsConstructor
@Slf4j
public class GenerateCodeUseCase {

    final ModelStore repository;
    final io.mateu.modux.modeldrivengenerator.application.usecases.project.registry.ImageRegistryResolver imageRegistryResolver;
    final FlowStoreMaterializer flowStoreMaterializer;
    final io.mateu.modux.modeldrivengenerator.application.usecases.model.view.ResolveViewClosureUseCase resolveViewClosureUseCase;
    /** Which workflow a loose gateway belongs to — a gateway becomes a step of that definition. */
    final io.mateu.modux.modeldrivengenerator.infra.out.persistence.WorkflowGatewayGraph workflowGraph;

    // when generating a view slice, only element ids in this set are emitted (null = full project)
    private java.util.Set<String> generationScope;

    // generated-zone integrity: hashes of files generated this run vs. the previous run's manifest
    private Path generationRoot;
    private Map<String, String> previousManifest = Map.of();
    private final Map<String, String> currentManifest = new HashMap<>();

    public void handle(GenerateCodeCommand command) {
        // Desugar high-level flow intents into structural pieces in the store so the rest of the
        // generator picks them up like hand-declared ones; rolled back afterwards (flows stay the
        // single source of truth on disk).
        flowStoreMaterializer.materialize();
        try {
            materializeWorkflowEvents();
            generate(command);
        } finally {
            flowStoreMaterializer.restore();
        }
    }

    /** Whether an element should be generated: always when not scoped, else only if in the view closure. */
    private boolean inScope(String id) {
        return generationScope == null || generationScope.contains(id);
    }

    private void generate(GenerateCodeCommand command) {

        var stored = repository.findById(command.projectId(), ProjectEntity.class).orElseThrow();
        // honor an explicit output path from the command (e.g. CLI), overriding the stored one;
        // a leading ~ is the user's home (Path.of would create a LITERAL «~» directory)
        var rawOutput = command.outputPath() != null && !command.outputPath().isBlank()
                ? command.outputPath()
                : stored.outputPath();
        var project = withOutputPath(stored, expandTilde(rawOutput));

        // view scope: when a view id is given, restrict generation to its dependency closure
        generationScope = (command.viewId() != null && !command.viewId().isBlank())
                ? new java.util.HashSet<>(resolveViewClosureUseCase.resolve(command.viewId()).closureIds())
                : null;
        if (generationScope != null) {
            log.info("Generating view '{}' — scoped to {} element(s)", command.viewId(), generationScope.size());
        }
        warnAboutHomelessWorkflows();

        // integrity: load the previous run's manifest, start a fresh one for this run
        generationRoot = Path.of(project.outputPath()).toAbsolutePath().normalize();
        previousManifest = loadManifest();
        currentManifest.clear();

        if (project.gitRepository() != null && !project.gitRepository().isBlank()) {
            generateRootPom(project);
        }

        // Declared services, or the synthesized default when the project has content
        // but no deployment yet — shared with the deploy pipeline.
        var services = effectiveServices(project);

        // The README is the one thing EVERY project gets — an empty project generates
        // its folder with just this file (plus the manifest).
        generateReadme(project, services);

        services.forEach(service -> generateService(project, service, command.sourceOnly()));

        // DevOps / infrastructure-as-code at project root (skipped when generating sources
        // only, and pointless while the project has nothing to deploy)
        if (!command.sourceOnly() && !services.isEmpty()) {
            generateDockerCompose(project);
            generateCiWorkflow(project);
            generateTerraform(project);
            generateUpSh(project);
            generateDeployment(project);
            generateE2e(project);
        }

        // UI Shells — standalone Spring Boot apps (no JPA/Kafka, OAuth2 only)
        repository.findAllOfType(UiShellEntity.class).stream()
                .filter(shell -> inProject(shell.projectId(), project))
                .forEach(shell -> generateUiShell(project, shell));

        // The API gateway the shell's remote menus (and external channels) enter through —
        // only meaningful when a uiShell exists.
        if (!command.sourceOnly()) {
            repository.findAllOfType(UiShellEntity.class).stream()
                    .filter(shell -> inProject(shell.projectId(), project))
                    .findAny()
                    .ifPresent(shell -> generateApiGateway(project));
        }

        // The manifest tracks the full project; a partial (view-scoped) run must not overwrite it or
        // it would report every non-slice file as orphaned.
        if (generationScope == null) {
            reportOrphanedGeneratedFiles();
            saveManifest();
        }
    }

    // ─── Root pom (monorepo) ──────────────────────────────────────────────────

    /** Does the element belong to the project? Unstamped (legacy) elements count as everyone's. */
    private boolean inProject(String elementProjectId, ProjectEntity project) {
        return elementProjectId == null || elementProjectId.equals(project.id());
    }

    /** The project's contexts, by their projectId stamp. */
    private List<BoundedContextEntity> projectContexts(ProjectEntity project) {
        return repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> inProject(m.projectId(), project))
                .toList();
    }

    /**
     * The services generation (and deployment) actually works with: the declared ones,
     * or the synthesized default when the project has content but no deployment yet.
     */
    public List<ServiceEntity> effectiveServices(ProjectEntity project) {
        var declared = (project.serviceIds() == null ? List.<String>of() : project.serviceIds()).stream()
                .map(id -> repository.findById(id, ServiceEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
        var services = !declared.isEmpty()
                ? declared
                : java.util.stream.Stream.ofNullable(defaultServiceFor(project)).toList();
        // The RESOLVED registry lands ON the service (project default, instance property
        // or the detected local registry), so the generated manifests reference the same
        // image the deploy pipeline pushes.
        return services.stream()
                .map(sv -> sv.dockerImageRegistry() == null || sv.dockerImageRegistry().isBlank()
                        ? imageRegistryResolver.resolve(sv, project)
                                .map(registry -> sv.toBuilder().dockerImageRegistry(registry).build())
                                .orElse(sv)
                        : sv)
                .toList();
    }

    /**
     * A service named after the project that deploys the project's contexts (their main
     * modules) — synthesized IN MEMORY when the project declares content but no services,
     * never persisted. Null when there is nothing to deploy.
     */
    private ServiceEntity defaultServiceFor(ProjectEntity project) {
        var allModules = repository.findAllOfType(ModuleEntity.class);
        var mainModuleIds = projectContexts(project).stream()
                .map(m -> io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology
                        .mainModuleOf(allModules, m.id()))
                .filter(java.util.Objects::nonNull)
                .map(ModuleEntity::id)
                .toList();
        if (mainModuleIds.isEmpty()) return null;
        return ServiceEntity.builder()
                .id(project.id() + "-service")
                .name(project.name())
                .moduleIds(mainModuleIds)
                .projectId(project.id())
                .build();
    }

    private void generateReadme(ProjectEntity project, List<ServiceEntity> services) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("services", services.stream()
                .map(sv -> Map.of(
                        "name", sv.name(),
                        "slug", serviceName(sv),
                        "modules", deployedUnits(sv).stream().map(BoundedContextEntity::name).toList()))
                .toList());
        model.put("contexts", projectContexts(project).stream().map(BoundedContextEntity::name).toList());
        createFile(project.outputPath(), model, "readme.ftl", "README.md");
    }

    private static String expandTilde(String path) {
        var trimmed = path == null ? "" : path.trim();
        if (trimmed.equals("~") || trimmed.startsWith("~/")) {
            return System.getProperty("user.home") + trimmed.substring(1);
        }
        return trimmed;
    }

    private void generateRootPom(ProjectEntity project) {
        createDir(project.outputPath(), "");
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        createFile(project.outputPath(), model, "root-pom.ftl", "pom.xml");
    }

    // ─── Service level ────────────────────────────────────────────────────────

    private void generateService(ProjectEntity project, ServiceEntity service, boolean sourceOnly) {
        var serviceName = serviceName(service);
        var serviceDir = project.outputPath() + "/" + serviceName;

        createDir(serviceDir, "");

        // service parent pom
        Map<String, Object> serviceModel = new HashMap<>();
        serviceModel.put("project", projectToMap(project));
        serviceModel.put("service", serviceToMap(service));
        createFile(serviceDir, serviceModel, "service-parent-pom.ftl", "pom.xml");

        if (!sourceOnly) {
            // containerization: a multi-stage Dockerfile that builds the service reactor
            createFile(serviceDir, serviceModel, "dockerfile.ftl", "Dockerfile");
            // Kubernetes manifests (Deployment + Service + optional HPA + Ingress per declared URL)
            serviceModel.put("ingressUrls", ingressUrls(service));
            idpFor(project).ifPresent(idp -> serviceModel.put("idp", idp));
            createFile(serviceDir, serviceModel, "k8s.ftl", "k8s/" + serviceName + ".yaml");
        }

        // generate each deployed module: the module lends its name, its bounded context lends the meaning
        deployedUnits(service)
                .forEach(unit -> generateBoundedContext(project, service, serviceDir, unit));

        // generate gateways (outbound adapters at service level)
        if (service.gatewayIds() != null) {
            service.gatewayIds().stream()
                    .map(id -> repository.findById(id, GatewayEntity.class).orElseThrow())
                    .filter(gateway -> inScope(gateway.id()))
                    .forEach(gateway -> generateGateway(project, service, serviceDir, gateway));
        }

        // developer-owned custom boundedContext (hook implementations); the boundedContext structure is generated,
        // but files inside are scaffolded once and never overwritten on regeneration
        generateCustomBoundedContext(project, service, serviceDir, serviceName);

        // generate the Spring Boot app boundedContext
        generateServiceApp(project, service, serviceDir);

        // database schema migrations (Flyway baseline) for the service datasource
        generateDatabaseMigrations(project, service, serviceDir);

        // Roles (all project roles, once per service in app boundedContext)
        generateRolesConfig(project, service, serviceDir);

        // UIAdapters: assigned to the service by id, or realizing the declared UI of a
        // context this service deploys (the App is how that UI materializes).
        var deployedIds = deployedUnits(service).stream()
                .map(BoundedContextEntity::id)
                .collect(java.util.stream.Collectors.toSet());
        var realizingAppIds = repository.findAllOfType(UiEntity.class).stream()
                .filter(u -> u.boundedContextId() != null && deployedIds.contains(u.boundedContextId()))
                .flatMap(u -> u.appIds().stream())
                .collect(java.util.stream.Collectors.toSet());
        repository.findAllOfType(UiAdapterEntity.class).stream()
                .filter(a -> service.id().equals(a.serviceId()) || realizingAppIds.contains(a.id())
                        // an app drawn with no service lives where the aggregates it manages are deployed
                        || ((a.serviceId() == null || a.serviceId().isBlank()) && flattenMenu(a.menuItems()).stream()
                                .anyMatch(it -> it.aggregateId() != null && deployedUnits(service).stream()
                                        .anyMatch(unit -> unit.aggregateIds() != null && unit.aggregateIds().contains(it.aggregateId())))))
                .forEach(adapter -> generateUiAdapter(project, service, serviceDir, adapter));
    }

    // ─── BoundedContext level ─────────────────────────────────────────────────────────

    private void generateBoundedContext(ProjectEntity project, ServiceEntity service,
                                String serviceDir, BoundedContextEntity boundedContext) {
        var boundedContextSlug = boundedContextSlug(boundedContext.name());
        var boundedContextDir = serviceDir + "/" + boundedContextSlug;
        var packageDir = project.packageName().replace(".", "/");
        var boundedContextPackageDir = packageDir + "/" + boundedContextSlug;

        createDir(boundedContextDir, "");

        // boundedContext pom
        Map<String, Object> boundedContextModel = new HashMap<>();
        boundedContextModel.put("project", projectToMap(project));
        boundedContextModel.put("service", serviceToMap(service));
        boundedContextModel.put("module", boundedContextToMap(boundedContext));
        boundedContextModel.put("mail", mailEnabled(project));
        createFile(boundedContextDir, boundedContextModel, "module-pom.ftl", "pom.xml");
        for (var n : emailNotifications(project, service)) {
            if (!boundedContext.id().equals(n.get("ownerBoundedContextId"))) continue;
            var nModel = buildBaseModel(project, service, boundedContext);
            nModel.put("notification", n);
            var nDir = project.packageName().replace(".", "/") + "/" + boundedContextSlug(boundedContext.name()) + "/infra/in/async";
            createDir(boundedContextDir, "src/main/java/" + nDir);
            createFile(boundedContextDir, nModel, "notification-email.ftl",
                    "src/main/java/" + nDir + "/" + n.get("className") + ".java");
        }
        {
            // who is running the use case (four-eyes rules, «recorded by»…), over Spring Security
            var bcPackageDir = project.packageName().replace(".", "/") + "/" + boundedContextSlug(boundedContext.name());
            createDir(boundedContextDir, "src/main/java/" + bcPackageDir + "/application/out");
            createDir(boundedContextDir, "src/main/java/" + bcPackageDir + "/infra/out/security");
            createFile(boundedContextDir, boundedContextModel, "current-user.ftl",
                    "src/main/java/" + bcPackageDir + "/application/out/CurrentUser.java");
            createFile(boundedContextDir, boundedContextModel, "current-user-security.ftl",
                    "src/main/java/" + bcPackageDir + "/infra/out/security/SpringSecurityCurrentUser.java");
        }
        if (usesSequences(boundedContext)) {
            // correlative numbers kept by the system (fields with systemValue SEQUENCE)
            var bcPackageDir = project.packageName().replace(".", "/") + "/" + boundedContextSlug(boundedContext.name());
            createDir(boundedContextDir, "src/main/java/" + bcPackageDir + "/infra/out/persistence");
            createFile(boundedContextDir, boundedContextModel, "sequences.ftl",
                    "src/main/java/" + bcPackageDir + "/application/out/Sequences.java");
            var seqPrefix = capitalize(boundedContext.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
            createFile(boundedContextDir, boundedContextModel, "sequences-jpa.ftl",
                    "src/main/java/" + bcPackageDir + "/infra/out/persistence/" + seqPrefix + "JpaSequences.java");
            createFile(boundedContextDir, boundedContextModel, "sequence-entity.ftl",
                    "src/main/java/" + bcPackageDir + "/infra/out/persistence/" + seqPrefix + "SequenceEntity.java");
            createFile(boundedContextDir, boundedContextModel, "sequence-repository.ftl",
                    "src/main/java/" + bcPackageDir + "/infra/out/persistence/" + seqPrefix + "SequenceRepository.java");
        }
        if (mailEnabled(project)) {
            // the email port (for the custom zone and the notifications) and its SMTP adapter
            var bcPackageDir = project.packageName().replace(".", "/") + "/" + boundedContextSlug(boundedContext.name());
            createDir(boundedContextDir, "src/main/java/" + bcPackageDir + "/infra/out/mail");
            createFile(boundedContextDir, boundedContextModel, "mail-sender.ftl",
                    "src/main/java/" + bcPackageDir + "/application/out/MailSender.java");
            createFile(boundedContextDir, boundedContextModel, "mail-sender-smtp.ftl",
                    "src/main/java/" + bcPackageDir + "/infra/out/mail/SmtpMailSender.java");
        }

        // source directories
        createDir(boundedContextDir, "src/main/java/" + packageDir + "/application/out");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/usecases");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/out");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/query/dto");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/shared/vo");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/suppliers");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence");
        createDir(boundedContextDir, "src/main/resources");
        createDir(boundedContextDir, "src/test/java");
        createDir(boundedContextDir, "src/test/resources");

        // Base interfaces at project package level, shared by all aggregate repositories and query services
        createFile(boundedContextDir, boundedContextModel, "repository.ftl",
                "src/main/java/" + packageDir + "/application/out/Repository.java");
        createFile(boundedContextDir, boundedContextModel, "business-rule-exception.ftl",
                "src/main/java/" + packageDir + "/application/BusinessRuleException.java");
        createFile(boundedContextDir, boundedContextModel, "access-denied.ftl",
                "src/main/java/" + packageDir + "/application/Forbidden.java");
        createDir(boundedContextDir, "src/main/java/" + packageDir + "/application/query");
        createFile(boundedContextDir, boundedContextModel, "queryservice.ftl",
                "src/main/java/" + packageDir + "/application/query/QueryService.java");

        // E2E base class (once per boundedContext)
        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/e2e");
        Map<String, Object> e2eBaseModel = buildBaseModel(project, service, boundedContext);
        createFile(boundedContextDir, e2eBaseModel, "e2e-base.ftl",
                "src/test/java/" + boundedContextPackageDir + "/e2e/BaseE2ETest.java");

        (boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of()).stream()
                .map(aggregateId -> repository.findById(aggregateId, AggregateEntity.class).orElseThrow())
                .filter(aggregate -> inScope(aggregate.id()))
                .forEach(aggregate -> generateAggregate(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, aggregate));

        // Domain services owned by this bounded context (operation-body.md Phase 4): a stateless
        // coordinator interface + a developer-owned default impl scaffolding each operation body.
        (boundedContext.domainServiceIds() != null ? boundedContext.domainServiceIds() : List.<String>of()).stream()
                .map(id -> repository.findById(id, DomainServiceEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .filter(ds -> inScope(ds.id()))
                .forEach(ds -> generateDomainService(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, ds));

        // Per-boundedContext menu: groups this boundedContext's operation pages (exposedAsUi
        // use cases) and CRUDs under a single entry in the app Home
        var uiUseCases = (boundedContext.useCaseIds() != null ? boundedContext.useCaseIds() : List.<String>of()).stream()
                .map(id -> repository.findById(id, UseCaseEntity.class).orElseThrow())
                .filter(UseCaseEntity::exposedAsUi)
                // a scaffolded create/update/delete has no page of its own: the aggregate's CRUD is its page
                .filter(uc -> crudTrioOf(boundedContext, uc) == null)
                .map(uc -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("className", toTypeName(uc.name()) + "Page");
                    m.put("slug", uc.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
                    m.put("fieldName", uncapitalize(toTypeName(uc.name())));
                    m.put("title", uc.title() != null && !uc.title().isBlank() ? uc.title() : uc.name());
                    return m;
                })
                .toList();
        var crudAggregateNames = (boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of()).stream()
                .map(id -> repository.findById(id, AggregateEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .filter(aggregate -> inScope(aggregate.id()) && hasCrudPages(service, aggregate))
                .map(AggregateEntity::name)
                .toList();
        if (!crudAggregateNames.isEmpty() || !uiUseCases.isEmpty()) {
            boundedContextModel.put("crudAggregateNames", crudAggregateNames);
            boundedContextModel.put("moduleMenuClassName", toTypeName(boundedContext.name()) + "Menu");
            boundedContextModel.put("uiUseCases", uiUseCases);
            createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/menu");
            createFile(boundedContextDir, boundedContextModel, "module-menu.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/menu/"
                            + toTypeName(boundedContext.name()) + "Menu.java");
        }

        // BDD runner (once per boundedContext)
        Map<String, Object> bddModel = buildBaseModel(project, service, boundedContext);
        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/bdd");
        createFile(boundedContextDir, bddModel, "bdd-runner.ftl",
                "src/test/java/" + boundedContextPackageDir + "/bdd/CucumberRunner.java");

        // Domain events
        if (boundedContext.domainEventIds() != null) {
            boundedContext.domainEventIds().stream()
                    .map(id -> repository.findById(id, DomainEventEntity.class).orElseThrow())
                    .filter(event -> inScope(event.id()))
                    .forEach(event -> generateDomainEvent(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, event));
        }

        // Subscriptions (idempotent ones lean on the generated inbox)
        if (boundedContext.subscriptionIds() != null && !boundedContext.subscriptionIds().isEmpty()) {
            var subscriptions = boundedContext.subscriptionIds().stream()
                    .map(id -> repository.findById(id, SubscriptionEntity.class).orElseThrow())
                    .filter(subscription -> inScope(subscription.id()))
                    .toList();
            subscriptions.forEach(subscription -> generateSubscription(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, subscription));
            if (subscriptions.stream().anyMatch(SubscriptionEntity::idempotencyEnabled)) {
                Map<String, Object> inboxModel = buildBaseModel(project, service, boundedContext);
                createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/out/inbox");
                createFile(boundedContextDir, inboxModel, "inbox-entity.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/infra/out/inbox/InboxEntity.java");
                createFile(boundedContextDir, inboxModel, "inbox-repository.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/infra/out/inbox/InboxEntityRepository.java");
                createFile(boundedContextDir, inboxModel, "inbox.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/infra/out/inbox/Inbox.java");
            }
        }

        // Scheduled triggers
        if (boundedContext.scheduledTriggerIds() != null) {
            boundedContext.scheduledTriggerIds().stream()
                    .map(id -> repository.findById(id, ScheduledTriggerEntity.class).orElseThrow())
                    .filter(trigger -> inScope(trigger.id()))
                    .forEach(trigger -> generateScheduledTrigger(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, trigger));
        }

        // Use cases
        if (boundedContext.useCaseIds() != null) {
            boundedContext.useCaseIds().stream()
                    .map(id -> repository.findById(id, UseCaseEntity.class).orElseThrow())
                    .filter(useCase -> inScope(useCase.id()))
                    .forEach(useCase -> generateUseCase(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, useCase));
        }

        // MCP server: one tool per exposedAsMcp use case of the context (JSON-RPC at /mcp)
        var mcpUseCases = new java.util.ArrayList<Map<String, Object>>();
        if (boundedContext.useCaseIds() != null) {
            boundedContext.useCaseIds().stream()
                    .map(id -> repository.findById(id, UseCaseEntity.class).orElseThrow())
                    .filter(UseCaseEntity::exposedAsMcp)
                    .filter(uc -> inScope(uc.id()))
                    .forEach(uc -> {
                        var item = new HashMap<String, Object>();
                        item.put("usecase", enrichUseCaseMap(uc));
                        item.put("slug", uc.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
                        item.put("className", toTypeName(uc.name()));
                        item.put("fieldName", uncapitalize(toTypeName(uc.name())) + "UseCase");
                        if (uc.inputModelId() != null && !uc.inputModelId().isBlank()) {
                            repository.findById(uc.inputModelId(), ModelEntity.class)
                                    .ifPresent(im -> item.put("inputModel", fromJson(toJson(im))));
                        }
                        if (uc.outputModelId() != null && !uc.outputModelId().isBlank()) {
                            repository.findById(uc.outputModelId(), ModelEntity.class)
                                    .ifPresent(om -> item.put("outputModel", fromJson(toJson(om))));
                        }
                        mcpUseCases.add(item);
                    });
        }
        if (!mcpUseCases.isEmpty()) {
            Map<String, Object> mcpModel = buildBaseModel(project, service, boundedContext);
            mcpModel.put("mcpUseCases", mcpUseCases);
            mcpModel.put("serviceSlug", serviceName(service));
            createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/mcp");
            createFile(boundedContextDir, mcpModel, "mcp-server.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/in/mcp/McpServer.java");
        }

        // Sagas
        if (boundedContext.sagaIds() != null) {
            boundedContext.sagaIds().stream()
                    .map(id -> repository.findById(id, SagaEntity.class).orElseThrow())
                    .filter(saga -> inScope(saga.id()))
                    .forEach(saga -> generateSaga(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, saga));
        }

        // Workflows started from this context. A workflow has no owning context (unlike a saga),
        // so its home is where it BEGINS — and that is also the service that will be running when
        // its trigger fires. See generateWorkflow.
        repository.findAllOfType(WorkflowEntity.class).stream()
                .filter(workflow -> inScope(workflow.id()))
                .filter(workflow -> boundedContext.id().equals(homeContextOf(workflow)))
                .forEach(workflow -> generateWorkflow(project, boundedContextDir, workflow));

        // Projections
        if (boundedContext.projectionIds() != null) {
            boundedContext.projectionIds().stream()
                    .map(id -> repository.findById(id, ProjectionEntity.class).orElseThrow())
                    .filter(projection -> inScope(projection.id()))
                    .forEach(projection -> generateProjection(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, projection));
        }

        // Read models (boundedContext-level, by boundedContextId)
        repository.findAllOfType(ReadModelEntity.class).stream()
                .filter(rm -> boundedContext.id().equals(rm.boundedContextId()))
                .filter(rm -> inScope(rm.id()))
                .forEach(rm -> generateReadModel(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, rm));

        // Integration events (boundedContext-level, by boundedContextId)
        repository.findAllOfType(IntegrationEventEntity.class).stream()
                .filter(ie -> boundedContext.id().equals(ie.boundedContextId()))
                .filter(ie -> inScope(ie.id()))
                .forEach(ie -> generateIntegrationEvent(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, ie));

        // Integration events derived from domain events flagged publishAsIntegrationEvent:
        // the domain event already carries the full wire config (topic, format, DLQ), so it
        // IS the integration event — no separate integrationEvents entry needed in the model.
        if (boundedContext.domainEventIds() != null) {
            boundedContext.domainEventIds().stream()
                    .map(id -> repository.findById(id, DomainEventEntity.class).orElseThrow())
                    .filter(DomainEventEntity::publishAsIntegrationEvent)
                    .filter(ev -> ev.topicName() != null && !ev.topicName().isBlank())
                    .filter(ev -> inScope(ev.id()))
                    .forEach(ev -> generateIntegrationEventFromDomainEvent(project, service, boundedContext,
                            boundedContextDir, boundedContextPackageDir, ev));
        }

        // Query services (boundedContext-level, by boundedContextId)
        repository.findAllOfType(QueryServiceEntity.class).stream()
                .filter(qs -> boundedContext.id().equals(qs.boundedContextId()))
                .filter(qs -> inScope(qs.id()))
                .forEach(qs -> generateQueryService(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, qs));

        // First-class CRUD APIs implemented here: a REST controller whose write operations call the
        // CRUD use cases and whose listing reads the aggregate's query service.
        generateApiControllers(project, service, boundedContext, boundedContextDir, boundedContextPackageDir);

        // Entities (embedded/child entities within aggregates)
        if (boundedContext.entityIds() != null) {
            boundedContext.entityIds().stream()
                    .map(id -> repository.findById(id, EntityEntity.class).orElseThrow())
                    .filter(entity -> inScope(entity.id()))
                    .forEach(entity -> generateEntity(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, entity));
        }

        // Value objects
        if (boundedContext.valueObjectIds() != null) {
            boundedContext.valueObjectIds().stream()
                    .map(id -> repository.findById(id, ValueObjectEntity.class).orElseThrow())
                    .filter(vo -> inScope(vo.id()))
                    .forEach(vo -> generateValueObject(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, vo));
        }

        // Model mappings (discovered by scanning use case and saga steps)
        generateModelMappingsForBoundedContext(project, service, boundedContext, boundedContextDir, boundedContextPackageDir);

        // Business rules (associated to an owned aggregate via its fact model)
        generateBusinessRulesForBoundedContext(project, service, boundedContext, boundedContextDir, boundedContextPackageDir);

        // Pages (find by matching aggregateId to boundedContext's aggregate IDs)
        var boundedContextAggregateIds = boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.of();
        repository.findAllOfType(PageEntity.class).stream()
                .filter(p -> p.aggregateId() != null && boundedContextAggregateIds.contains(p.aggregateId()))
                .filter(p -> inScope(p.aggregateId()))
                .forEach(page -> generatePage(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, page));

        // Pages REALIZED by the context's declared UIs (no aggregate behind them):
        // the human interface says they exist, so they generate with the context —
        // whether the UI lists them directly or through a realizing App's menu.
        repository.findAllOfType(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiEntity.class).stream()
                .filter(u -> boundedContext.id().equals(u.boundedContextId()))
                .flatMap(u -> java.util.stream.Stream.concat(
                        u.pageIds().stream(),
                        u.appIds().stream()
                                .map(aid -> repository.findById(aid, UiAdapterEntity.class).orElse(null))
                                .filter(java.util.Objects::nonNull)
                                .flatMap(a -> java.util.stream.Stream.of(
                                                menuPageIds(a.menuItems()),
                                                java.util.stream.Stream.of(a.homePageId(), a.headerPageId(),
                                                        a.viewPageId(), a.editPageId()))
                                        .flatMap(x -> x))))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .map(pid -> repository.findById(pid, PageEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .filter(p -> p.aggregateId() == null || p.aggregateId().isBlank())
                .forEach(page -> generatePage(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, page));
    }

    // ─── Service app ─────────────────────────────────────────────────────────

    private void generateServiceApp(ProjectEntity project, ServiceEntity service, String serviceDir) {
        var serviceName = serviceName(service);
        var appDir = serviceDir + "/" + serviceName + "-app";
        var packageDir = project.packageName().replace(".", "/");

        createDir(appDir, "");
        createDir(appDir, "src/main/java/" + packageDir);
        createDir(appDir, "src/main/java/" + packageDir + "/infra/in/ui");
        createDir(appDir, "src/main/resources");
        createDir(appDir, "src/test/java");
        createDir(appDir, "src/test/resources");

        Map<String, Object> appModel = new HashMap<>();
        appModel.put("project", projectToMap(project));
        appModel.put("service", serviceToMap(service));

        // The declared UI (the context's human interface) lends the @UI annotation its
        // parameters: path (= mateu's value), indexHtmlPath and frontendComponentPath.
        var deployedContextIds = deployedUnits(service).stream()
                .map(BoundedContextEntity::id)
                .collect(java.util.stream.Collectors.toSet());
        var declaredUi = repository.findAllOfType(UiEntity.class).stream()
                .filter(u -> u.boundedContextId() != null && deployedContextIds.contains(u.boundedContextId()))
                .findFirst()
                .orElse(null);
        // A UI realized DIRECTLY by pages needs no Home wrapper: the page itself
        // carries @UI (see generatePage) — generating a Home too would fight it
        // for the same path.
        var uiCarriedByPage = declaredUi != null
                && !declaredUi.pageIds().isEmpty() && declaredUi.appIds().isEmpty();
        java.util.Optional.ofNullable(declaredUi)
                .filter(u -> !uiCarriedByPage)
                .ifPresent(u -> {
                    appModel.put("ui", fromJson(toJson(u)));
                    // The pages the UI realizes hang from the Home menu.
                    var unitName = deployedUnits(service).stream()
                            .filter(unit -> unit.id().equals(u.boundedContextId()))
                            .map(BoundedContextEntity::name)
                            .findFirst().orElse(null);
                    if (unitName == null) return;
                    var moduleSlug = boundedContextSlug(unitName);
                    appModel.put("uiPages", u.pageIds().stream()
                            .map(pid -> repository.findById(pid, PageEntity.class).orElse(null))
                            .filter(java.util.Objects::nonNull)
                            .map(pg -> Map.of(
                                    "label", pg.title() != null && !pg.title().isBlank() ? pg.title() : pg.name(),
                                    "className", pageClassName(pg),
                                    "field", fieldNameFromLabel(
                                            pg.title() != null && !pg.title().isBlank() ? pg.title() : pg.name(),
                                            pageSlug(pg) + "Page"),
                                    "moduleSlug", moduleSlug,
                                    "pageSlug", pageSlug(pg)))
                            .toList());
                });

        // One Home menu entry per deployed module (each pointing to that module's menu class).
        // A module produces a menu if a UI consumes one of its aggregates (CRUDs) or it has
        // exposedAsUi use cases (operation pages).
        var menuBoundedContexts = new java.util.ArrayList<Map<String, Object>>();
        deployedUnits(service).stream()
                .filter(m -> (m.aggregateIds() != null && m.aggregateIds().stream()
                                .map(id -> repository.findById(id, AggregateEntity.class).orElse(null))
                                .anyMatch(a -> a != null && hasCrudPages(service, a)))
                        || (m.useCaseIds() != null && m.useCaseIds().stream()
                                .map(id -> repository.findById(id, UseCaseEntity.class).orElseThrow())
                                .anyMatch(UseCaseEntity::exposedAsUi)))
                .forEach(m -> {
                    var entry = new HashMap<String, Object>();
                    entry.put("className", toTypeName(m.name()) + "Menu");
                    entry.put("slug", boundedContextSlug(m.name()));
                    entry.put("field", boundedContextSlug(m.name()) + "Menu");
                    menuBoundedContexts.add(entry);
                });
        appModel.put("menuModules", menuBoundedContexts);

        // Messaging bindings: every async consumer the service's contexts declare (async use
        // cases and subscriptions) must be listed in spring.cloud.function.definition and bound
        // to its topic — otherwise the consumer beans exist but never receive a message.
        var consumers = new java.util.ArrayList<Map<String, Object>>();
        for (var bc : deployedUnits(service)) {
            if (bc.useCaseIds() != null) {
                bc.useCaseIds().stream()
                        .map(id -> repository.findById(id, UseCaseEntity.class).orElseThrow())
                        .filter(UseCaseEntity::exposedAsAsync)
                        .forEach(uc -> {
                            Map<String, Object> c = new HashMap<>();
                            c.put("function", uncapitalize(capitalize(uc.name())));
                            c.put("topic", serviceName + "." + uc.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
                            c.put("group", serviceName);
                            consumers.add(c);
                        });
            }
            if (bc.subscriptionIds() != null) {
                bc.subscriptionIds().stream()
                        .map(id -> repository.findById(id, SubscriptionEntity.class).orElseThrow())
                        .forEach(sub -> {
                            Map<String, Object> c = new HashMap<>();
                            c.put("function", uncapitalize(capitalize(sub.name())));
                            c.put("topic", sub.topicName() != null && !sub.topicName().isBlank()
                                    ? sub.topicName()
                                    : serviceName + "." + sub.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
                            c.put("group", sub.consumerGroup() != null && !sub.consumerGroup().isBlank()
                                    ? sub.consumerGroup() : serviceName);
                            consumers.add(c);
                        });
            }
        }
        // the email notifications its contexts own: each one listens for its event
        for (var n : emailNotifications(project, service)) {
            Map<String, Object> c = new HashMap<>();
            c.put("function", n.get("function"));
            c.put("topic", n.get("topic"));
            c.put("group", serviceName + "-notifications");
            consumers.add(c);
        }
        for (var bc : deployedUnits(service)) {
            for (var projectionId : bc.projectionIds() != null ? bc.projectionIds() : List.<String>of()) {
                var projection = repository.findById(projectionId, ProjectionEntity.class).orElseThrow();
                if (projection.handlers() == null) continue;
                for (var handler : projection.handlers()) {
                    var event = handler.domainEventId() == null ? null
                            : repository.findById(handler.domainEventId(), DomainEventEntity.class).orElse(null);
                    if (event == null) continue;
                    Map<String, Object> c = new HashMap<>();
                    c.put("function", uncapitalize(projectionClassName(projection))
                            + capitalize(handler.name()).replaceAll("[^a-zA-Z0-9]", ""));
                    c.put("topic", event.name().toLowerCase().replaceAll("[^a-z0-9]", "-"));
                    c.put("group", serviceName + "-" + projection.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
                    consumers.add(c);
                }
            }
        }
        appModel.put("consumers", consumers);

        idpFor(project).ifPresent(idp -> {
            appModel.put("idp", idp);
            // the keycloak client a person opening this service directly signs in with
            keycloakAppClients(effectiveServices(project)).stream()
                    .filter(c -> service.id().equals(c.get("serviceId"))).findFirst()
                    .ifPresent(c -> appModel.put("oidcClientId", c.get("clientId")));
        });
        appModel.put("mail", mailEnabled(project));
        createFile(appDir, appModel, "service-app-pom.ftl", "pom.xml");
        createFile(appDir, appModel, "application-yaml.ftl", "src/main/resources/application.yaml");
        createFile(appDir, appModel, "application.ftl",
                "src/main/java/" + packageDir + "/" + toClassName(service.name()) + "Application.java");
        if (service.outboxEnabled()) {
            // Transactional outbox: every send is stored with the state change, the relay delivers it
            createDir(appDir, "src/main/java/" + packageDir + "/infra/out/outbox");
            createFile(appDir, appModel, "outbox.ftl", "src/main/java/" + packageDir + "/infra/out/outbox/Outbox.java");
            createFile(appDir, appModel, "outbox-relay.ftl", "src/main/java/" + packageDir + "/infra/out/outbox/OutboxRelay.java");
        }
        createDir(appDir, "src/main/java/" + packageDir + "/infra/in/rest");
        createFile(appDir, appModel, "business-rule-handler.ftl",
                "src/main/java/" + packageDir + "/infra/in/rest/BusinessRuleExceptionHandler.java");
        // A Home is a UI: with nothing to show there is none (the service is reached by its APIs).
        if (!uiCarriedByPage && (declaredUi != null || !menuBoundedContexts.isEmpty())) {
            createFile(appDir, appModel, "home.ftl",
                    "src/main/java/" + packageDir + "/infra/in/ui/Home.java");
        }
    }

    // ─── Aggregate level ─────────────────────────────────────────────────────

    private void generateAggregate(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                   String boundedContextDir, String boundedContextPackageDir, AggregateEntity aggregate) {

        var aggregatePackageName = aggregate.name().toLowerCase();

        createDir(boundedContextDir,
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName + "/create");

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "aggregate-repository.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/out/" + aggregate.name() + "Repository.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "aggregate-queryservice.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/query/" + aggregate.name() + "QueryService.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "row.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/query/dto/" + aggregate.name() + "Row.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "dto.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/query/dto/" + aggregate.name() + "Dto.java");

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "create-command.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/create/Create" + aggregate.name() + "Command.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "create-usecase.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/create/Create" + aggregate.name() + "UseCase.java");

        // invariants hook: port + context generated here, default implementation scaffolded once in the custom boundedContext
        if (aggregate.invariants() != null && !aggregate.invariants().isEmpty()) {
            var aggDir = "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregate.name().toLowerCase();
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "aggregate-invariants.ftl",
                    aggDir + "/" + aggregate.name() + "Invariants.java");
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "aggregate-context.ftl",
                    aggDir + "/" + aggregate.name() + "Context.java");
            var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
            createCustomFile(customDir, project, service, boundedContext, aggregate, "aggregate-invariants-default.ftl",
                    "src/main/java/" + project.packageName().replace(".", "/")
                            + "/custom/Default" + aggregate.name() + "Invariants.java");
        }

        createDir(boundedContextDir,
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName + "/update");

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "update-command.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/update/Update" + aggregate.name() + "Command.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "update-usecase.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/update/Update" + aggregate.name() + "UseCase.java");

        createDir(boundedContextDir,
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName + "/delete");

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "delete-command.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/delete/Delete" + aggregate.name() + "Command.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "delete-usecase.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/delete/Delete" + aggregate.name() + "UseCase.java");

        createDir(boundedContextDir,
                "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName);
        createDir(boundedContextDir,
                "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName + "/vo");

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "vo-id.ftl",
                "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                        + "/vo/" + aggregate.name() + "Id.java");

        // Value-object enums referenced by the aggregate fields (one class per enum field)
        if (aggregate.modelId() != null && !aggregate.modelId().isBlank()) {
            var modelEntity = repository.findById(aggregate.modelId(), ModelEntity.class).orElse(null);
            if (modelEntity != null && modelEntity.fields() != null) {
                modelEntity.fields().stream()
                        .filter(f -> !f.basicType() && f.enumId() != null && !f.enumId().isBlank())
                        .forEach(f -> generateAggregateEnum(
                                project, service, boundedContext, boundedContextDir, boundedContextPackageDir, aggregate, f.name(), f.enumId()));
            }
        }

        boolean hasValueObjectFields = false;
        if (hasValueObjectFields) {
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "vo-name.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                            + "/vo/" + aggregate.name() + "Name.java");
        }

        boolean hasOperations = aggregate.operations() != null && !aggregate.operations().isEmpty();
        if (hasOperations) {
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "operation-context.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                            + "/" + aggregate.name() + "OperationContext.java");
        }

        if (aggregate.operations() != null) {
            for (var operationEntity : aggregate.operations()) {
                if (operationEntity.type() == null || !"CUSTOM".equals(operationEntity.type())) {
                    continue;
                }
                var operation = new OperationDto(
                        operationEntity.id(),
                        operationEntity.name(),
                        operationEntity.inputModelId(),
                        operationEntity.outputModelId(),
                        splitCsv(operationEntity.preconditions()),
                        listFromJson(operationEntity.sets(), FieldValueSettingDto.class),
                        splitCsv(operationEntity.emits()),
                        OperationType.valueOf(operationEntity.type()),
                        operationEntity.paginated(),
                        operationEntity.defaultPageSize(),
                        operationEntity.intent());

                Map<String, Object> model = new HashMap<>();
                model.put("project", projectToMap(project));
                model.put("service", serviceToMap(service));
                model.put("module", boundedContextToMap(boundedContext));
                model.put("aggregate", aggregateToMap(aggregate));
                model.put("operation", fromJson(toJson(operation)));
                model.put("operationInput", operationInputOf(operationEntity.inputModelId()));
                // The modeled body (operation-body.md), legacy fields desugared, drives the scaffold.
                model.put("steps", operationStepsModel(operationEntity));
                // An explicit modeled body generates executable control-flow structure with typed
                // two-zone leaf hooks (§5); legacy free-text bodies stay as the guided scaffold.
                boolean executable = OperationBodyDesugar.hasModeledBody(operationEntity);
                model.put("executable", executable);
                if (executable) {
                    model.put("executableBody", executableBodyModel(operationEntity));
                }

                createFile(boundedContextDir, model, "custom-operation.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                                + "/" + capitalize(operation.name()) + aggregate.name() + "Operation.java");

                // developer-owned default implementation of the operation (custom boundedContext, write-once)
                var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
                createCustomFile(customDir, model, "aggregate-operation-default.ftl",
                        "src/main/java/" + project.packageName().replace(".", "/")
                                + "/custom/Default" + capitalize(operation.name()) + aggregate.name() + "Operation.java");
            }
        }

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "aggregate.ftl",
                "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                        + "/" + aggregate.name() + ".java");

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "dbentity.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "Entity.java");
        // The repository port has a single implementation: JPA for a normal aggregate, event-sourced
        // (events as the source of truth, with a state snapshot for reads) for an event-sourced one.
        if (!isEventSourced(aggregate)) {
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "dbrepository.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "DBRepository.java");
        }
        var queryModel = aggregateModel(project, service, boundedContext, aggregate);
        queryModel.put("rowLookups", rowLookupsOf(project, boundedContext, aggregate));
        createFile(boundedContextDir, queryModel, "dbqueryservice.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "DBQueryService.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "entityrepository.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EntityRepository.java");

        // Event-sourced aggregates also get an append-only event store (entity + repository + appender).
        // The aggregate's current-state JPA persistence above stays for now; making the event store the
        // source of truth (reconstitution) is the next step — see docs/design/event-sourcing.md.
        if (isEventSourced(aggregate)) {
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "es-event-entity.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EventEntity.java");
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "es-event-store.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EventStore.java");
            createFile(boundedContextDir, project, service, boundedContext, aggregate, "es-event-appender.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EventAppender.java");

            // decode stored payloads to typed domain events, so the fold hook works with real events
            var esModel = aggregateModel(project, service, boundedContext, aggregate);
            var boundedContextEventNames = (boundedContext.domainEventIds() != null ? boundedContext.domainEventIds() : List.<String>of()).stream()
                    .map(eid -> repository.findById(eid, DomainEventEntity.class).orElse(null))
                    .filter(java.util.Objects::nonNull)
                    .map(DomainEventEntity::name)
                    .toList();
            esModel.put("domainEvents", boundedContextEventNames);

            createFile(boundedContextDir, esModel, "es-codec.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EventCodec.java");
            // event-sourced port implementation (appends events + keeps a state snapshot; folds on read)
            createFile(boundedContextDir, esModel, "es-repository.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EventSourcedRepository.java");
            // two-zone hook: how operations produce events and how the typed event stream folds into state
            createFile(boundedContextDir, esModel, "es-handler.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + aggregate.name() + "EventSourcing.java");
            var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
            createCustomFile(customDir, esModel, "es-handler-default.ftl",
                    "src/main/java/" + project.packageName().replace(".", "/")
                            + "/custom/Default" + aggregate.name() + "EventSourcing.java");
        }

        var crudPages = hasCrudPages(service, aggregate);
        if (crudPages) {
        createDir(boundedContextDir,
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + aggregatePackageName);

        createFile(boundedContextDir, project, service, boundedContext, aggregate, "crud-adapter.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + aggregatePackageName
                        + "/" + aggregate.name() + "CrudAdapter.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "crud-orchestrator.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + aggregatePackageName
                        + "/" + aggregate.name() + "CrudOrchestrator.java");
        var viewModel = aggregateModel(project, service, boundedContext, aggregate);
        viewModel.put("lookups", lookupsOf(project, service, boundedContext));
        // a list of value objects is edited as an inline grid: one row class per listed model
        for (var f : (List<?>) ((Map<?, ?>) viewModel.get("aggregate")).get("fields")) {
            if (f instanceof Map<?, ?> fm && fm.get("gridClass") instanceof String gridClass) {
                repository.findById((String) fm.get("modelId"), ModelEntity.class).ifPresent(gm -> {
                    Map<String, Object> filaModel = buildBaseModel(project, service, boundedContext);
                    filaModel.put("rowPackage", project.packageName() + "." + boundedContext.name().toLowerCase()
                            .replaceAll("[^a-z0-9]", "") + ".infra.in.ui.pages." + aggregatePackageName);
                    filaModel.put("rowOwner", aggregate.name() + "ViewModel");
                    filaModel.put("gridModel", fromJson(toJson(gm)));
                    filaModel.put("gridClassName", gridClass);
                    createFile(boundedContextDir, filaModel, "usecase-page-fila.ftl",
                            "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + aggregatePackageName
                                    + "/" + gridClass + ".java");
                });
            }
        }
        createFile(boundedContextDir, viewModel, "crud-viewmodel.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + aggregatePackageName
                        + "/" + aggregate.name() + "ViewModel.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "options-supplier.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/suppliers/"
                        + aggregate.name() + "IdOptionsSupplier.java");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "label-supplier.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/suppliers/"
                        + aggregate.name() + "IdLabelSupplier.java");
        }

        // ─── Tests ────────────────────────────────────────────────────────────────
        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName);
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "aggregate-test.ftl",
                "src/test/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                        + "/" + aggregate.name() + "Test.java");

        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName + "/create");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "create-usecase-test.ftl",
                "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/create/Create" + aggregate.name() + "UseCaseTest.java");

        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName + "/update");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "update-usecase-test.ftl",
                "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/update/Update" + aggregate.name() + "UseCaseTest.java");

        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName + "/delete");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "delete-usecase-test.ftl",
                "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + aggregatePackageName
                        + "/delete/Delete" + aggregate.name() + "UseCaseTest.java");

        // ─── BDD ─────────────────────────────────────────────────────────────────
        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/bdd");
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "bdd-steps.ftl",
                "src/test/java/" + boundedContextPackageDir + "/bdd/" + aggregate.name() + "Steps.java");

        createDir(boundedContextDir, "src/test/resources/features/" + boundedContextSlug(boundedContext.name()));
        createFile(boundedContextDir, project, service, boundedContext, aggregate, "bdd-feature.ftl",
                "src/test/resources/features/" + boundedContextSlug(boundedContext.name()) + "/" + aggregate.name() + ".feature");

        // E2E test (it drives the aggregate's CRUD pages)
        if (crudPages) {
            var e2eModel = aggregateModel(project, service, boundedContext, aggregate);
            e2eModel.put("lookups", lookupsOf(project, service, boundedContext));
            e2eModel.put("e2eListUrl", crudRouteOf(aggregate));
            createFile(boundedContextDir, e2eModel, "e2e-aggregate.ftl",
                    "src/test/java/" + boundedContextPackageDir + "/e2e/" + aggregate.name() + "E2ETest.java");
        }
    }

    // ─── Use Cases ────────────────────────────────────────────────────────────

    private void generateUseCase(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                 String boundedContextDir, String boundedContextPackageDir, UseCaseEntity useCase) {
        var trio = crudTrioOf(boundedContext, useCase);
        if (trio != null) {
            generateCrudTrioUseCase(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, useCase, trio);
            return;
        }
        var ucSlug = useCase.name().toLowerCase().replaceAll("[^a-z0-9]", "");
        // File/class names go through the safe type name: display names may contain spaces.
        var ucClass = toTypeName(useCase.name());
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug);

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("usecase", enrichUseCaseMap(useCase));
        if (useCase.inputModelId() != null && !useCase.inputModelId().isBlank()) {
            var inputModel = repository.findById(useCase.inputModelId(), ModelEntity.class).orElse(null);
            model.put("inputModel", inputModel != null ? fromJson(toJson(inputModel)) : null);
        }
        if (useCase.outputModelId() != null && !useCase.outputModelId().isBlank()) {
            var outputModel = repository.findById(useCase.outputModelId(), ModelEntity.class).orElse(null);
            model.put("outputModel", outputModel != null ? fromJson(toJson(outputModel)) : null);
        }

        createFile(boundedContextDir, model, "usecase-command.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug
                        + "/" + ucClass + "Command.java");
        if (model.get("outputModel") != null) {
            createFile(boundedContextDir, model, "usecase-result.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug
                            + "/" + ucClass + "Result.java");
        }
        if (model.get("usecase") instanceof Map<?, ?> ucMap && ucMap.get("outcome") != null) {
            createFile(boundedContextDir, model, "usecase-outcome.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug
                            + "/" + ucClass + "Outcome.java");
        }
        createFile(boundedContextDir, model, "usecase.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug
                        + "/" + ucClass + "UseCase.java");

        // custom-steps hook: port in the generated boundedContext, default implementation in the custom boundedContext
        // from the enriched steps: a step the template could not write became a Custom hook too
        @SuppressWarnings("unchecked")
        var enriched = (List<Map<String, Object>>) ((Map<String, Object>) model.get("usecase")).get("steps");
        var hasCustomStep = enriched != null && enriched.stream().anyMatch(st -> "Custom".equals(st.get("type")));
        if (enriched != null) {
            for (var st : enriched) {
                if (!"CallRemoteUseCase".equals(st.get("type")) || !(st.get("remote") instanceof Map<?, ?> remote)) continue;
                Map<String, Object> clientModel = buildBaseModel(project, service, boundedContext);
                clientModel.put("remote", remote);
                createFile(boundedContextDir, clientModel, "remote-usecase-client.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/application/out/remote/" + remote.get("className") + "Client.java");
                createFile(boundedContextDir, clientModel, "remote-usecase-rest-client.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/infra/out/remote/" + remote.get("className") + "RestClient.java");
            }
        }
        if (hasCustomStep) {
            createFile(boundedContextDir, model, "usecase-steps.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug
                            + "/" + ucClass + "Steps.java");
            var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
            createCustomFile(customDir, model, "usecase-steps-default.ftl",
                    "src/main/java/" + project.packageName().replace(".", "/")
                            + "/custom/Default" + ucClass + "Steps.java");
        }

        if (useCase.exposedAsRest() || calledThroughInboundAcl(boundedContext, useCase) || calledRemotely(useCase)
                || targetOfAWorkflow(useCase)) {
            createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/rest");
            createFile(boundedContextDir, model, "usecase-rest-controller.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/in/rest/"
                            + ucClass + "Controller.java");
        }

        // exposedAsUi: a Mateu page whose fields are the command and whose primary action
        // executes the use case (view model only; menu wiring happens with the module menu).
        if (useCase.exposedAsUi()) {
            createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + ucSlug);

            // Array fields backed by a model become inline-editable grids: resolve each
            // referenced model to a generated row class (one per model, next to the page).
            // The output's lists get the same row classes, shown as read-only grids.
            var gridClasses = new HashMap<String, String>();
            for (var modelId : java.util.stream.Stream.of(useCase.inputModelId(), useCase.outputModelId())
                    .filter(id -> id != null && !id.isBlank()).distinct().toList()) {
                repository.findById(modelId, ModelEntity.class).ifPresent(im -> {
                    for (var f : im.fields() != null ? im.fields() : List.<ModelFieldEntity>of()) {
                        if (!f.basicType() && f.modelId() != null && !f.modelId().isBlank()
                                && f.type() != null && "array".equals(f.type().name())) {
                            repository.findById(f.modelId(), ModelEntity.class).ifPresent(gm -> {
                                var className = toTypeName(gm.name()) + "Fila";
                                gridClasses.put(f.modelId(), className);
                                Map<String, Object> filaModel = buildBaseModel(project, service, boundedContext);
                                filaModel.put("usecase", enrichUseCaseMap(useCase));
                                filaModel.put("gridModel", fromJson(toJson(gm)));
                                filaModel.put("gridClassName", className);
                                createFile(boundedContextDir, filaModel, "usecase-page-fila.ftl",
                                        "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/"
                                                + ucSlug + "/" + className + ".java");
                            });
                        }
                    }
                });
            }
            model.put("gridClasses", gridClasses);
            model.put("lookups", lookupsOf(project, service, boundedContext));
            model.put("enumOptions", enumOptionsOf(useCase));

            var templateFile = pageTemplateFile(useCase);
            if (templateFile != null) {
                model.put("template", pageTemplateModel(project, boundedContext, useCase, gridClasses));
            }
            createFile(boundedContextDir, model, templateFile != null ? templateFile : "usecase-page.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + ucSlug
                            + "/" + ucClass + "Page.java");
        }

        if (useCase.exposedAsAsync()) {
            createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/async");
            createFile(boundedContextDir, model, "usecase-async-consumer.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/in/async/"
                            + ucClass + "Consumer.java");
        }

        // Unit test for custom use case
        createDir(boundedContextDir, "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug);
        Map<String, Object> testModel = buildBaseModel(project, service, boundedContext);
        testModel.put("usecase", enrichUseCaseMap(useCase));
        if (useCase.inputModelId() != null && !useCase.inputModelId().isBlank()) {
            var inputModel = repository.findById(useCase.inputModelId(), ModelEntity.class).orElse(null);
            testModel.put("inputModel", inputModel != null ? fromJson(toJson(inputModel)) : null);
        }
        if (model.get("outputModel") != null) {
            testModel.put("outputModel", model.get("outputModel"));
        }
        createFile(boundedContextDir, testModel, "usecase-test.ftl",
                "src/test/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug
                        + "/" + ucClass + "UseCaseTest.java");
    }

    /**
     * An external system calls this use case through the context's inbound ACL (the editor's
     * «external system → use case» gesture). The call has to arrive somewhere: that is the use
     * case's REST endpoint, whether or not it was also flagged exposedAsRest.
     */
    private static boolean calledThroughInboundAcl(BoundedContextEntity boundedContext, UseCaseEntity useCase) {
        return boundedContext.acls() != null && boundedContext.acls().stream()
                .filter(a -> a.direction() != null && "INBOUND".equalsIgnoreCase(String.valueOf(a.direction())))
                .anyMatch(a -> a.translatedUseCaseIds() != null && a.translatedUseCaseIds().contains(useCase.id()));
    }

    /**
     * Whether a UI consumes this aggregate's CRUD, which is what its pages are the surface of (an
     * actor only gets permissions, an external system or another context the REST API): an app
     * that has it in its menu, a page bound to it, or a UI shell federating its service.
     */
    private boolean hasCrudPages(ServiceEntity service, AggregateEntity aggregate) {
        var slug = aggregate.name().toLowerCase().replaceAll("[^a-z0-9]", "");
        return repository.findAllOfType(UiShellEntity.class).stream()
                        .anyMatch(sh -> sh.serviceIds() != null && sh.serviceIds().contains(service.id()))
                || repository.findAllOfType(PageEntity.class).stream()
                        .anyMatch(p -> aggregate.id().equals(p.aggregateId()))
                || repository.findAllOfType(UiAdapterEntity.class).stream()
                        .flatMap(a -> flattenMenu(a.menuItems()).stream())
                        .anyMatch(it -> aggregate.id().equals(it.aggregateId())
                                || (it.route() != null && it.route().toLowerCase().replaceAll("[^a-z0-9]", "").equals(slug)));
    }

    /**
     * The fields that pick an instance of an aggregate, by name: {@code libroId} is a Libro. Only
     * the aggregates of this context with CRUD pages count, since those are the ones that get the
     * option and label suppliers a lookup needs. Field name → the suppliers' package and prefix.
     */
    private Map<String, Map<String, String>> lookupsOf(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext) {
        var lookups = new HashMap<String, Map<String, String>>();
        for (var id : boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of()) {
            repository.findById(id, AggregateEntity.class)
                    .filter(aggregate -> hasCrudPages(service, aggregate))
                    .ifPresent(aggregate -> lookups.put(uncapitalize(aggregate.name()) + "Id", Map.of(
                            "suppliers", project.packageName() + "." + boundedContext.name().toLowerCase().replaceAll("[^a-z0-9]", "")
                                    + ".infra.in.ui.suppliers." + aggregate.name())));
        }
        return lookups;
    }

    /**
     * The fields of an aggregate's listing that name another aggregate of its context
     * ({@code salaId} is a Sala): the listing shows that one's label, not its id. Field name →
     * the query service that knows the label.
     */
    private Map<String, String> rowLookupsOf(ProjectEntity project, BoundedContextEntity boundedContext, AggregateEntity aggregate) {
        var lookups = new HashMap<String, String>();
        for (var id : boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of()) {
            if (id.equals(aggregate.id())) continue;
            repository.findById(id, AggregateEntity.class).ifPresent(other -> lookups.put(
                    uncapitalize(other.name()) + "Id",
                    project.packageName() + "." + boundedContext.name().toLowerCase().replaceAll("[^a-z0-9]", "")
                            + ".application.query." + other.name() + "QueryService"));
        }
        return lookups;
    }

    /**
     * The modelled delete of this aggregate when someone added rules to it. A screen has to run
     * that one: the plain delete behind the CRUD pages knows nothing about those rules.
     */
    private java.util.Optional<UseCaseEntity> customDeleteOf(AggregateEntity aggregate) {
        var deleteId = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold.CrudUseCases
                .idsOf(aggregate.id()).get(2);
        return repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(bc -> bc.useCaseIds() != null && bc.useCaseIds().contains(deleteId))
                .findFirst()
                .flatMap(bc -> repository.findById(deleteId, UseCaseEntity.class)
                        .filter(useCase -> crudTrioOf(bc, useCase) == null));
    }

    /** The input fields with fixed values: field name → the constants its select offers. */
    private Map<String, List<String>> enumOptionsOf(UseCaseEntity useCase) {
        var options = new HashMap<String, List<String>>();
        if (useCase.inputModelId() == null || useCase.inputModelId().isBlank()) return options;
        repository.findById(useCase.inputModelId(), ModelEntity.class).ifPresent(input -> {
            for (var field : input.fields() != null ? input.fields() : List.<ModelFieldEntity>of()) {
                if (field.enumId() == null || field.enumId().isBlank()) continue;
                repository.findById(field.enumId(), EnumEntity.class).ifPresent(e ->
                        options.put(field.name(), e.values().stream().map(v -> toEnumConstant(v.id())).toList()));
            }
        });
        return options;
    }

    private String projectionClassName(ProjectionEntity projection) {
        var rawName = capitalize(projection.name());
        return rawName.endsWith("Projection") ? rawName : rawName + "Projection";
    }

    /** The query operation a menu entry points at (its first one when it names none). */
    private java.util.Optional<QueryOperationEntity> queryOperationOfMenuItem(UiMenuItemEntity item) {
        if (item.queryServiceId() == null || item.queryServiceId().isBlank()) return java.util.Optional.empty();
        return repository.findById(item.queryServiceId(), QueryServiceEntity.class)
                .flatMap(qs -> qs.operations() == null ? java.util.Optional.empty() : qs.operations().stream()
                        .filter(op -> item.queryOperationId() == null || item.queryOperationId().equals(op.id()))
                        .findFirst());
    }

    /** {@code estado=CONFIRMADA,tipo=X}: the read model's accessor and the text it has to equal. */
    private List<Map<String, Object>> filtersOf(String filter, List<ModelFieldEntity> fields) {
        var out = new java.util.ArrayList<Map<String, Object>>();
        for (var part : filter.split(",")) {
            var eq = part.indexOf('=');
            if (eq <= 0) throw new IllegalArgumentException("Query filter '" + filter + "': expected field=value");
            var name = part.substring(0, eq).trim();
            var field = fields.stream().filter(f -> name.equals(f.name())).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Query filter '" + filter + "': the read model has no field " + name));
            out.add(Map.of("accessor", field.basicType() ? field.name() : field.name() + "Id",
                    "value", part.substring(eq + 1).trim()));
        }
        return out;
    }

    /**
     * A listing grouped by one field: the key, how many rows it stands for, and the sum of every
     * numeric field. When the key names another aggregate ({@code conciertoId}) and this service
     * holds a view of it, the row shows that view's name instead of the bare id.
     */
    private Map<String, Object> groupingOf(ProjectEntity project, ServiceEntity service, ReadModelEntity rm, String groupBy, List<ModelFieldEntity> fields) {
        var key = fields.stream().filter(f -> groupBy.equals(f.name())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Query groupBy '" + groupBy + "': the read model " + rm.name() + " has no such field"));
        Map<String, Object> g = new HashMap<>();
        g.put("keyName", key.name());
        g.put("keyAccessor", key.basicType() ? key.name() : key.name() + "Id");
        g.put("keyLabel", key.label() != null && !key.label().isBlank() ? key.label() : humanize(key.name()));
        var countLabel = rm.aggregateId() == null ? "Total" : repository.findById(rm.aggregateId(), AggregateEntity.class)
                .map(a -> humanize(a.name()) + "s").orElse("Total");
        g.put("countLabel", countLabel);
        g.put("sums", fields.stream()
                .filter(f -> f.basicType() && f.type() != null && !f.name().equals(key.name()))
                .filter(f -> switch (f.type().name()) { case "integer", "number", "money" -> true; default -> false; })
                .map(f -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", f.name());
                    m.put("label", f.label() != null && !f.label().isBlank() ? f.label() : humanize(f.name()));
                    m.put("integer", "integer".equals(f.type().name()));
                    return m;
                }).toList());
        // conciertoId → a view of Concierto in this service: show what it calls itself
        var referenced = key.name().replaceAll("Id$", "");
        deployedUnits(service).stream()
                .filter(u -> u.readModelIds() != null)
                .flatMap(u -> u.readModelIds().stream()
                        .map(id -> repository.findById(id, ReadModelEntity.class).orElse(null))
                        .filter(java.util.Objects::nonNull)
                        .filter(other -> !other.id().equals(rm.id()) && other.aggregateId() != null)
                        .filter(other -> repository.findById(other.aggregateId(), AggregateEntity.class)
                                .map(a -> a.name().equalsIgnoreCase(referenced)).orElse(false))
                        .map(other -> Map.entry(u, other)))
                .findFirst()
                .ifPresent(e -> {
                    var other = e.getValue();
                    var otherFields = repository.findById(other.aggregateId(), AggregateEntity.class)
                            .flatMap(a -> repository.findById(a.modelId(), ModelEntity.class))
                            .map(m -> m.fields() == null ? List.<ModelFieldEntity>of() : m.fields()).orElse(List.of());
                    otherFields.stream()
                            .filter(f -> f.basicType() && f.type() != null && "string".equals(f.type().name()) && !"id".equals(f.name()))
                            .findFirst()
                            .ifPresent(nameField -> {
                                var otherClass = toTypeName(other.name()).replaceAll("ReadModel$", "");
                                g.put("lookupQueryService", project.packageName() + "." + boundedContextSlug(e.getKey().name())
                                        + ".application.query." + otherClass + "ReadModelQueryService");
                                g.put("lookupAccessor", nameField.name());
                            });
                });
        return g;
    }

    /** The read model a menu entry's query answers with, if it answers with one. */
    private java.util.Optional<ReadModelEntity> readModelOfMenuItem(UiMenuItemEntity item) {
        if (item.queryServiceId() == null || item.queryServiceId().isBlank()) return java.util.Optional.empty();
        return repository.findById(item.queryServiceId(), QueryServiceEntity.class)
                .flatMap(qs -> qs.operations() == null ? java.util.Optional.empty() : qs.operations().stream()
                        .filter(op -> item.queryOperationId() == null || item.queryOperationId().equals(op.id()))
                        .findFirst())
                .flatMap(op -> repository.findAllOfType(ReadModelEntity.class).stream()
                        .filter(rm -> rm.modelId() != null && rm.modelId().equals(op.outputModelId())
                                // a view of an aggregate answers to the aggregate's model too (its own
                                // shape may be derived from it, see AggregateStateProjections)
                                || rm.aggregateId() != null && repository.findById(rm.aggregateId(), AggregateEntity.class)
                                        .map(a -> op.outputModelId() != null && op.outputModelId().equals(a.modelId())).orElse(false))
                        .findFirst());
    }

    /** One of an aggregate's derived CRUD use cases, and which of the three it is. */
    private record CrudTrio(AggregateEntity aggregate, String role) {}

    /**
     * The use case is one of an aggregate's derived CRUD trio ({@code uc-crear/actualizar/eliminar
     * {aggId}}) still in the shape the scaffold gave it. Those get a body that rests on the
     * aggregate's built-in CRUD: generated as plain steps they would build nothing (a null
     * aggregate on create, an update without the id). A trio someone has since extended with
     * steps of their own is left to the general template, which honours them.
     */
    private CrudTrio crudTrioOf(BoundedContextEntity boundedContext, UseCaseEntity useCase) {
        var aggregateIds = boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of();
        for (var aggregateId : aggregateIds) {
            var role = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold.CrudUseCases
                    .idsOf(aggregateId).indexOf(useCase.id());
            if (role < 0) continue;
            var steps = useCase.steps() != null ? useCase.steps() : List.<UseCaseStepEntity>of();
            var scaffoldShape = steps.stream().allMatch(st -> switch (st.type()) {
                case ReadAggregate, SaveAggregate, PublishDomainEvent -> true;
                case Custom -> role == 2 && st.name() != null && st.name().startsWith("delete");
                default -> false;
            });
            if (!scaffoldShape) return null;
            return repository.findById(aggregateId, AggregateEntity.class)
                    .map(a -> new CrudTrio(a, List.of("create", "update", "delete").get(role)))
                    .orElse(null);
        }
        return null;
    }

    private void generateCrudTrioUseCase(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                         String boundedContextDir, String boundedContextPackageDir,
                                         UseCaseEntity useCase, CrudTrio trio) {
        var ucSlug = useCase.name().toLowerCase().replaceAll("[^a-z0-9]", "");
        var ucClass = toTypeName(useCase.name());
        var event = (useCase.steps() != null ? useCase.steps() : List.<UseCaseStepEntity>of()).stream()
                .filter(st -> st.type() == UseCaseStepType.PublishDomainEvent && st.domainEventId() != null)
                .map(st -> repository.findById(st.domainEventId(), DomainEventEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(DomainEventEntity::name)
                .findFirst().orElse(null);
        var model = aggregateModel(project, service, boundedContext, trio.aggregate());
        var trioMap = new HashMap<String, Object>();
        trioMap.put("role", trio.role());
        trioMap.put("slug", ucSlug);
        trioMap.put("className", ucClass);
        if (event != null) trioMap.put("event", event);
        model.put("trio", trioMap);
        var dir = "src/main/java/" + boundedContextPackageDir + "/application/usecases/" + ucSlug;
        createDir(boundedContextDir, dir);
        createFile(boundedContextDir, model, "crud-trio-command.ftl", dir + "/" + ucClass + "Command.java");
        createFile(boundedContextDir, model, "crud-trio-usecase.ftl", dir + "/" + ucClass + "UseCase.java");
    }

    private Map<String, Object> enrichUseCaseMap(UseCaseEntity useCase) {
        var map = new HashMap<String, Object>();
        map.putAll(fromJson(toJson(useCase)));
        // A safe Java type name for the templates: display names may contain spaces.
        map.put("className", toTypeName(useCase.name()));

        // without an input model the command is the row's id (see usecase-command.ftl): a row action
        Set<String> commandFieldNames = Set.of("id");
        if (useCase.inputModelId() != null && !useCase.inputModelId().isBlank()) {
            var inputModel = repository.findById(useCase.inputModelId(), ModelEntity.class).orElse(null);
            if (inputModel != null && inputModel.fields() != null) {
                commandFieldNames = inputModel.fields().stream()
                        .map(ModelFieldEntity::name)
                        .collect(java.util.stream.Collectors.toSet());
            }
        }

        // The result the last Custom step returns (see usecase.ftl): what a later step can read.
        List<String> resultFieldNames = List.of();
        if (useCase.outputModelId() != null && !useCase.outputModelId().isBlank()) {
            resultFieldNames = repository.findById(useCase.outputModelId(), ModelEntity.class)
                    .map(m -> m.fields() == null ? List.<String>of() : m.fields().stream().map(ModelFieldEntity::name).toList())
                    .orElse(List.of());
        }
        var lastCustom = -1;
        if (useCase.steps() != null) {
            for (int i = 0; i < useCase.steps().size(); i++) {
                if (useCase.steps().get(i).type() == UseCaseStepType.Custom) lastCustom = i;
            }
        }

        // What an event published after the last Custom step needs and neither the result nor the
        // command has (a confirmation link, a token): the step hands it over in an Outcome next to
        // the result, so the event gets it and the caller does not.
        var outcomeExtras = new java.util.LinkedHashMap<String, String>();

        var enrichedSteps = new java.util.ArrayList<Map<String, Object>>();
        var needsStreamBridge = false;
        var usesCurrentUser = false;
        var usesSequences = false;
        var loadedAggregates = new java.util.HashSet<String>();
        // calls to a use case another service deploys: what each returned, for the hooks after it
        var remoteResponses = new java.util.ArrayList<Map<String, Object>>();

        if (useCase.steps() != null) {
            var stepIndex = -1;
            for (var step : useCase.steps()) {
                stepIndex++;
                var stepMap = enrichStep(step.id(), step.name(),
                        step.type() != null ? step.type().name() : "Custom",
                        step.aggregateId(), step.operationId(),
                        step.gatewayId(), step.gatewayOperationId(),
                        step.domainEventId(), step.useCaseId(), step.modelMappingId());
                if (step.intent() != null && !step.intent().isBlank()) {
                    stepMap.put("intent", step.intent());
                }

                String stepType = (String) stepMap.get("type");
                // The aggregate to load: the command's id, or its {aggregate}Id (a lookup on screen)
                if ("ReadAggregate".equals(stepType) && stepMap.get("aggregate") instanceof Map<?, ?> readAgg) {
                    var ref = uncapitalize((String) readAgg.get("name")) + "Id";
                    if (commandFieldNames.contains("id")) stepMap.put("idField", "id");
                    else if (commandFieldNames.contains(ref)) stepMap.put("idField", ref);
                }
                // An operation on an aggregate the use case loaded, with everything it needs in the
                // command, is a real call: its rules live in the operation, not in a use-case hook.
                if ("CallAggregateOperation".equals(stepType)
                        && stepMap.get("aggregate") instanceof Map<?, ?> callAgg
                        && loadedAggregates.contains((String) callAgg.get("name"))
                        && stepMap.get("operation") instanceof Map<?, ?> callOp
                        && "CUSTOM".equals(callOp.get("type"))) {
                    var input = operationInputOf((String) callOp.get("inputModelId"));
                    var inputArgs = new java.util.ArrayList<String>();
                    var complete = true;
                    if (input != null) {
                        for (var f : asList(input.get("fields"))) {
                            @SuppressWarnings("unchecked") var fm = (Map<String, Object>) f;
                            var name = (String) fm.get("name");
                            // a value the system supplies (who runs it, when): not the caller's to give
                            var systemValue = fm.get("systemValue") instanceof String sv ? sv : null;
                            if (systemValue != null) {
                                switch (systemValue) {
                                    case "CURRENT_USER" -> { inputArgs.add("currentUser.username()"); usesCurrentUser = true; }
                                    case "NOW" -> inputArgs.add("java.time.LocalDateTime.now()");
                                    case "TODAY" -> inputArgs.add("java.time.LocalDate.now()");
                                    case "SEQUENCE" -> {
                                        // one series per aggregate and field: «Numero.numero»
                                        var next = "sequences.next(\"" + callAgg.get("name") + "." + name + "\")";
                                        inputArgs.add("integer".equals(String.valueOf(fm.get("type"))) ? "Math.toIntExact(" + next + ")" : next);
                                        usesSequences = true;
                                    }
                                    default -> complete = false;
                                }
                                if (!complete) break;
                                continue;
                            }
                            if (!commandFieldNames.contains(name)) { complete = false; break; }
                            var basic = Boolean.TRUE.equals(fm.get("basicType"));
                            var suffixed = !basic && (fm.get("enumId") == null || fm.get("enumId").toString().isBlank())
                                    && !"array".equals(fm.get("type"));
                            inputArgs.add("command." + name + (suffixed ? "Id" : "") + "()");
                        }
                    }
                    if (complete) {
                        stepMap.put("operationCall", true);
                        stepMap.put("operationClass", capitalize((String) callOp.get("name")) + callAgg.get("name") + "Operation");
                        stepMap.put("operationInputArgs", input == null ? null : String.join(", ", inputArgs));
                    }
                }
                // A use case of ANOTHER service is not a bean here: the call goes over HTTP, through a
                // client generated next to the caller and the callee's REST endpoint (one line in the
                // editor: use case → use case). What it answers is handed to the hooks after it.
                if ("CallUseCase".equals(stepType) && step.useCaseId() != null) {
                    var remote = remoteCallOf(useCase.id(), step.useCaseId(), commandFieldNames);
                    if (remote != null) {
                        stepMap.put("type", "CallRemoteUseCase");
                        stepMap.put("remote", remote);
                        stepType = "CallRemoteUseCase";
                        remoteResponses.add(remote);
                    }
                }
                // A use case of an EXTERNAL system (one line in the editor: use case → the partner's
                // use case) is the same kind of call: a client over HTTP to {SYSTEM}_URL, its answer
                // handed to the hooks after it. The partner is a real process, not a hook.
                if ("CallExternalUseCase".equals(stepType) && step.externalUseCaseId() != null) {
                    var remote = externalCallOf(useCase, step.externalUseCaseId(), commandFieldNames);
                    if (remote != null) {
                        stepMap.put("type", "CallRemoteUseCase");
                        stepMap.put("remote", remote);
                        stepType = "CallRemoteUseCase";
                        remoteResponses.add(remote);
                    }
                }
                if ("Custom".equals(stepType) && !remoteResponses.isEmpty()) {
                    stepMap.put("remoteParams", new java.util.ArrayList<>(remoteResponses));
                }
                // A step this template cannot write for real becomes a hook (two-zone rule: no TODO
                // business logic in the generated zone). Its intent says what it has to do.
                var hookIntent = hookIntentFor(stepType, stepMap, commandFieldNames, loadedAggregates);
                if (hookIntent != null) {
                    stepMap.put("type", "Custom");
                    if (!stepMap.containsKey("intent")) stepMap.put("intent", hookIntent);
                    stepType = "Custom";
                    if (!remoteResponses.isEmpty()) stepMap.put("remoteParams", new java.util.ArrayList<>(remoteResponses));
                }
                if ("CallGateway".equals(stepType) && stepMap.get("gatewayOperation") instanceof Map<?, ?> opMap) {
                    var inModelId = (String) opMap.get("inputModelId");
                    if (inModelId != null) {
                        var inModel = repository.findById(inModelId, ModelEntity.class).orElse(null);
                        if (inModel != null && inModel.fields() != null) {
                            stepMap.put("argFields", buildArgs(inModel.fields(), commandFieldNames));
                        }
                    }
                } else if ("PublishDomainEvent".equals(stepType) && stepMap.get("domainEvent") instanceof Map<?, ?> evMap) {
                    var modelId = (String) evMap.get("modelId");
                    if (modelId != null) {
                        var payloadModel = repository.findById(modelId, ModelEntity.class).orElse(null);
                        if (payloadModel != null && payloadModel.fields() != null) {
                            stepMap.put("argFields", buildArgs(payloadModel.fields(), commandFieldNames));
                        }
                    }
                    // After the step that produced the result, the event is built from it first:
                    // that is where a Custom step leaves what it decided (ids, dates, flags).
                    var afterLastCustom = stepIndex > lastCustom && lastCustom >= 0;
                    var fromResult = afterLastCustom && !resultFieldNames.isEmpty();
                    var available = new java.util.ArrayList<String>();
                    if (fromResult) available.addAll(resultFieldNames);
                    commandFieldNames.stream().sorted().forEach(available::add);
                    if (stepMap.get("argFields") instanceof List<?> args) {
                        for (var a : args) {
                            @SuppressWarnings("unchecked") var am = (Map<String, Object>) a;
                            var n = (String) am.get("name");
                            if (fromResult && resultFieldNames.contains(n)) {
                                am.put("matched", true);
                                am.put("expr", "result." + n + "()");
                            } else if (commandFieldNames.contains(n)) {
                                am.put("expr", "command." + n + "()");
                            } else if (afterLastCustom) {
                                am.put("matched", true);
                                am.put("expr", "outcome." + n + "()");
                                outcomeExtras.putIfAbsent(n, javaTypeOf(am));
                            }
                        }
                    }
                    // the event's aggregateId: the first id the use case has at hand
                    var idField = available.stream().filter(n -> n.equals("id") || n.endsWith("Id")).findFirst();
                    if (idField.isPresent()) {
                        var n = idField.get();
                        stepMap.put("aggregateIdExpr",
                                (fromResult && resultFieldNames.contains(n) ? "result." : "command.") + n + "()");
                    }
                } else if ("ReadAggregate".equals(stepType) && stepMap.get("aggregate") instanceof Map<?, ?> aggMap) {
                    var aggName = (String) aggMap.get("name");
                    if (aggName != null) loadedAggregates.add(aggName);
                } else if ("SaveAggregate".equals(stepType) && stepMap.get("aggregate") instanceof Map<?, ?> aggMap) {
                    var aggName = (String) aggMap.get("name");
                    stepMap.put("aggregateLoaded", aggName != null && loadedAggregates.contains(aggName));
                }

                enrichedSteps.add(stepMap);
                if ("PublishDomainEvent".equals(stepMap.get("type")) && !stepMap.containsKey("integrationClass")) {
                    needsStreamBridge = true;
                }
            }
        }

        if (!outcomeExtras.isEmpty()) {
            var fields = new java.util.ArrayList<Map<String, Object>>();
            outcomeExtras.forEach((n, t) -> fields.add(Map.of("name", n, "javaType", t)));
            map.put("outcome", Map.of("className", toTypeName(useCase.name()) + "Outcome", "fields", fields));
        }
        map.put("steps", enrichedSteps);
        map.put("needsStreamBridge", needsStreamBridge);
        map.put("usesCurrentUser", usesCurrentUser);
        map.put("usesSequences", usesSequences);
        return map;
    }

    /**
     * Why a step has to be a hook, or null when the template writes it for real: an aggregate
     * operation (its arguments are business decisions), saving an aggregate nothing loaded (it
     * has to be built from the command), or loading one when the command carries no id.
     */
    private static String hookIntentFor(String stepType, Map<String, Object> stepMap,
                                        Set<String> commandFieldNames, Set<String> loadedAggregates) {
        var agg = stepMap.get("aggregate") instanceof Map<?, ?> a ? (String) a.get("name") : null;
        switch (stepType) {
            case "CallUseCase":
                var uc = stepMap.get("useCase") instanceof Map<?, ?> u ? (String) u.get("className") : null;
                return uc != null ? "Invoca el caso de uso " + uc + " con un comando construido a partir de este" : null;
            case "ApplyModelMapping":
                return "Aplica el mapeo de modelos" + (stepMap.get("modelMapping") instanceof Map<?, ?> mm ? " «" + mm.get("name") + "»" : "");
            case "CallGateway":
                return stepMap.get("gateway") instanceof Map<?, ?> g && !(stepMap.get("gatewayOperation") instanceof Map<?, ?>)
                        ? "Llama al gateway " + g.get("className") + " (elige la operación)" : null;
            default:
                break;
        }
        if (agg == null) return null;
        return switch (stepType) {
            case "CallAggregateOperation" -> {
                if (Boolean.TRUE.equals(stepMap.get("operationCall"))) yield null;
                var op = stepMap.get("operation") instanceof Map<?, ?> o ? (String) o.get("name") : null;
                yield op != null ? "Invoca la operación «" + op + "» de " + agg + " con los datos del comando"
                        : "Opera sobre " + agg + " (carga el agregado, aplica el cambio y guárdalo)";
            }
            case "SaveAggregate" -> loadedAggregates.contains(agg) ? null
                    : "Construye " + agg + " a partir del comando y guárdalo";
            case "ReadAggregate" -> stepMap.containsKey("idField") ? null
                    : "Carga " + agg + " a partir de los datos del comando";
            default -> null;
        };
    }

    /** "conciertoId" → "Concierto id": a column header when the model gives no label. */
    private static String humanize(String name) {
        var spaced = name.replaceAll("([a-z0-9])([A-Z])", "$1 $2").toLowerCase();
        return spaced.isEmpty() ? spaced : Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
    }

    /** The service that deploys a use case (through the module of its context), or null. */
    private ServiceEntity serviceOfUseCase(String useCaseId) {
        for (var sv : repository.findAllOfType(ServiceEntity.class)) {
            for (var bc : deployedUnits(sv)) {
                if (bc.useCaseIds() != null && bc.useCaseIds().contains(useCaseId)) return sv;
            }
        }
        return null;
    }

    /**
     * The model's EMAIL notifications a service sends (its contexts own them), as what their
     * consumer is generated from. None without an email provider: there is nothing to send with.
     */
    private List<Map<String, Object>> emailNotifications(ProjectEntity project, ServiceEntity service) {
        if (!mailEnabled(project)) return List.of();
        var owned = deployedUnits(service).stream().map(BoundedContextEntity::id).collect(java.util.stream.Collectors.toSet());
        var out = new ArrayList<Map<String, Object>>();
        for (var n : repository.findAllOfType(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.NotificationEntity.class)) {
            if (n.ownerBoundedContextId() == null || !owned.contains(n.ownerBoundedContextId())) continue;
            if (n.channels() == null || !n.channels().contains("EMAIL")) continue;
            var event = n.eventId() == null ? null : repository.findById(n.eventId(), DomainEventEntity.class).orElse(null);
            if (event == null) {
                log.warn("notification '{}' does not say which event sends it (eventId)", n.name());
                continue;
            }
            // the topic its publisher writes to: the integration topic when the event travels to other
            // services (an integration event of its name), else the plain one a use case sends it on
            var integrated = repository.findAllOfType(IntegrationEventEntity.class).stream()
                    .anyMatch(integration -> event.name().equals(integration.name()));
            var topic = !integrated ? event.name().toLowerCase().replaceAll("[^a-z0-9]", "-")
                    : event.topicName() != null && !event.topicName().isBlank() ? event.topicName()
                    : serviceEmitting(event.name()).map(sv -> io.mateu.modux.modeldrivengenerator.application
                            .usecases.flow.expand.FlowExpander.topicOf(project.name(), sv.name(), event.name())).orElse(null);
            if (topic == null) continue;
            var className = toTypeName(n.name()) + "Notification";
            var m = new HashMap<String, Object>();
            m.put("name", n.name());
            m.put("className", className);
            m.put("function", uncapitalize(className));
            m.put("topic", topic);
            m.put("eventName", event.name());
            m.put("ownerBoundedContextId", n.ownerBoundedContextId());
            m.put("subject", n.subject());
            m.put("body", n.body());
            var expression = n.recipientExpression();
            if (expression != null && !expression.isBlank()) {
                m.put("recipientField", expression.substring(expression.lastIndexOf('.') + 1).trim());
            }
            m.put("roles", (n.recipientRoleIds() == null ? List.<String>of() : n.recipientRoleIds()).stream()
                    .map(id -> repository.findById(id, RoleEntity.class).map(RoleEntity::name).orElse(id)).toList());
            out.add(m);
        }
        return out;
    }

    /**
     * Whether the context takes correlative numbers: an operation of one of its aggregates has an
     * input field with systemValue SEQUENCE.
     */
    private boolean usesSequences(BoundedContextEntity boundedContext) {
        return (boundedContext.aggregateIds() == null ? List.<String>of() : boundedContext.aggregateIds()).stream()
                .flatMap(id -> repository.findById(id, AggregateEntity.class).stream())
                .flatMap(a -> a.operations() == null ? java.util.stream.Stream.empty() : a.operations().stream())
                .map(OperationEntity::inputModelId).filter(java.util.Objects::nonNull)
                .flatMap(id -> repository.findById(id, ModelEntity.class).stream())
                .flatMap(m -> m.fields() == null ? java.util.stream.Stream.empty() : m.fields().stream())
                .anyMatch(f -> "SEQUENCE".equals(f.systemValue()));
    }

    /** Whether the deployment declares an email provider: then the services can send email (MailSender). */
    private boolean mailEnabled(ProjectEntity project) {
        return repository.findById(DeploymentEntity.idFor(project.id()), DeploymentEntity.class)
                .map(DeploymentEntity::emailProvider).isPresent();
    }

    /** The Mateu page template a use case's screen is drawn with; null = the plain form that runs it. */
    private static String pageTemplateFile(UseCaseEntity useCase) {
        if (useCase.pageTemplate() == null || useCase.pageTemplate().isBlank()) return null;
        return switch (useCase.pageTemplate().trim().toUpperCase()) {
            case "DASHBOARD" -> "pagetemplates/dashboard.ftl";
            case "TODO_LIST" -> "pagetemplates/todo.ftl";
            case "CALENDAR" -> "pagetemplates/calendar.ftl";
            case "SMART_SEARCH" -> "pagetemplates/search.ftl";
            case "ITEM_OVERVIEW" -> "pagetemplates/overview.ftl";
            case "FORM" -> null;
            default -> throw new IllegalArgumentException("Use case " + useCase.name() + ": unknown pageTemplate '"
                    + useCase.pageTemplate() + "' (DASHBOARD, TODO_LIST, CALENDAR, SMART_SEARCH, ITEM_OVERVIEW or FORM)");
        };
    }

    /**
     * What a page template needs beyond the use case: which output fields play each part
     * (templateFields), the list it shows (items: that field, its row class, its model) and the
     * page an item opens (itemUseCaseId: an ITEM_OVERVIEW of the same context).
     */
    private Map<String, Object> pageTemplateModel(ProjectEntity project, BoundedContextEntity boundedContext,
                                                  UseCaseEntity useCase, Map<String, String> gridClasses) {
        var template = new HashMap<String, Object>();
        var fields = useCase.templateFields() != null ? new HashMap<>(useCase.templateFields()) : new HashMap<String, String>();
        template.put("fields", fields);
        var output = useCase.outputModelId() == null ? List.<ModelFieldEntity>of() : fieldsOf(useCase.outputModelId());
        var rowModels = new HashMap<String, Object>();
        ModelFieldEntity items = null;
        for (var f : output) {
            if (!f.basicType() && f.modelId() != null && f.type() == FieldDataType.array) {
                repository.findById(f.modelId(), ModelEntity.class).ifPresent(m -> rowModels.put(f.modelId(), fromJson(toJson(m))));
                if (items == null && (fields.get("items") == null || fields.get("items").equals(f.name()))) items = f;
            }
        }
        template.put("rowModels", rowModels);
        if (items != null) {
            fields.putIfAbsent("items", items.name());
            template.put("itemsField", items.name());
            template.put("itemsModelId", items.modelId());
            template.put("rowClass", gridClasses.get(items.modelId()));
        } else if (List.of("TODO_LIST", "CALENDAR", "SMART_SEARCH").contains(useCase.pageTemplate().trim().toUpperCase())) {
            throw new IllegalArgumentException("Use case " + useCase.name() + ": a " + useCase.pageTemplate()
                    + " page shows a list — its output needs an array of a model (templateFields.items names which)");
        }
        if (useCase.itemUseCaseId() != null && !useCase.itemUseCaseId().isBlank()) {
            var itemUseCase = repository.findById(useCase.itemUseCaseId(), UseCaseEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Use case " + useCase.name()
                            + ": itemUseCaseId " + useCase.itemUseCaseId() + " does not exist"));
            if (!"ITEM_OVERVIEW".equalsIgnoreCase(String.valueOf(itemUseCase.pageTemplate()))
                    || boundedContext.useCaseIds() == null || !boundedContext.useCaseIds().contains(itemUseCase.id())) {
                throw new IllegalArgumentException("Use case " + useCase.name() + ": the item opens " + itemUseCase.name()
                        + ", which has to be an ITEM_OVERVIEW of the same context");
            }
            var itemClass = toTypeName(itemUseCase.name());
            var itemSlug = itemUseCase.name().toLowerCase().replaceAll("[^a-z0-9]", "");
            template.put("item", Map.of(
                    "className", itemClass + "Page",
                    "pageFqn", project.packageName() + "." + boundedContextSlug(boundedContext.name())
                            + ".infra.in.ui.pages." + itemSlug + "." + itemClass + "Page"));
        }
        return template;
    }

    /** Whether a workflow step runs this use case: the engine reaches it over REST (HTTP_CALL). */
    private boolean targetOfAWorkflow(UseCaseEntity useCase) {
        return repository.findAllOfType(WorkflowEntity.class).stream()
                .flatMap(wf -> wf.steps() == null ? java.util.stream.Stream.<WorkflowStepEntity>empty() : wf.steps().stream())
                .anyMatch(st -> useCase.id().equals(st.targetUseCaseId()));
    }

    /** Whether a use case of another service calls this one: then it answers over REST. */
    private boolean calledRemotely(UseCaseEntity callee) {
        var calleeService = serviceOfUseCase(callee.id());
        if (calleeService == null) return false;
        return repository.findAllOfType(UseCaseEntity.class).stream()
                .filter(uc -> uc.steps() != null && uc.steps().stream().anyMatch(st ->
                        st.type() == UseCaseStepType.CallUseCase && callee.id().equals(st.useCaseId())))
                .map(uc -> serviceOfUseCase(uc.id()))
                .anyMatch(sv -> sv != null && !sv.id().equals(calleeService.id()));
    }

    /**
     * A call from one service's use case to another's: the client the caller needs (its request
     * built from the command, its response typed after the callee's output) and where the callee
     * answers. Null when both run in the same service — then it is a plain bean call.
     */
    /**
     * What a list travels as, for whoever reads it on the other side: «a JSON array; each row:
     * {id, name, area…}». Empty for a field that is not a list of a model.
     */
    private String jsonListShape(ModelFieldEntity f) {
        if (f.basicType() || f.modelId() == null || f.modelId().isBlank() || f.type() != FieldDataType.array) return "";
        var fields = fieldsOf(f.modelId()).stream()
                .map(x -> x.name() + " (" + (x.enumId() != null ? "enum" : x.type() != null ? x.type().name() : "string") + ")")
                .toList();
        return "a JSON array; each row: {" + String.join(", ", fields) + "}";
    }

    private Map<String, Object> remoteCallOf(String callerId, String calleeId, Set<String> commandFieldNames) {
        var callee = repository.findById(calleeId, UseCaseEntity.class).orElse(null);
        var callerService = serviceOfUseCase(callerId);
        var calleeService = serviceOfUseCase(calleeId);
        if (callee == null || callerService == null || calleeService == null || callerService.id().equals(calleeService.id())) {
            return null;
        }
        var className = toTypeName(callee.name());
        var request = new java.util.ArrayList<Map<String, Object>>();
        fieldsOf(callee.inputModelId()).forEach(f -> request.add(Map.of(
                "name", f.name(), "javaType", javaTypeOf(f),
                "expr", commandFieldNames.contains(f.name()) ? "command." + f.name() + "()" : "null")));
        var response = new java.util.ArrayList<Map<String, Object>>();
        fieldsOf(callee.outputModelId()).forEach(f -> response.add(Map.of("name", f.name(), "javaType", javaTypeOf(f),
                "shape", jsonListShape(f))));
        var apiVersion = callee.apiVersion() != null && !callee.apiVersion().isBlank() ? callee.apiVersion() : "v1";
        if (!apiVersion.startsWith("v")) apiVersion = "v" + apiVersion;
        var svcSlug = serviceName(calleeService).toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
        Map<String, Object> remote = new HashMap<>();
        remote.put("className", className);
        remote.put("var", uncapitalize(className));
        remote.put("service", serviceName(calleeService));
        remote.put("urlProperty", svcSlug.toUpperCase().replace("-", "_") + "_URL");
        remote.put("defaultUrl", "http://localhost:" + (calleeService.port() != null ? calleeService.port() : 8080));
        remote.put("path", "/" + apiVersion + "/" + callee.name().toLowerCase().replaceAll("[^a-z0-9]", "-"));
        remote.put("request", request);
        remote.put("response", response);
        remote.put("hasResponse", !response.isEmpty());
        return remote;
    }

    /** The external system offering that use case, and the use case itself. */
    private java.util.Optional<Map.Entry<ExternalSystemEntity, ExternalSystemUseCaseEntity>> externalUseCase(String externalUseCaseId) {
        return repository.findAllOfType(ExternalSystemEntity.class).stream()
                .flatMap(x -> (x.useCases() == null ? List.<ExternalSystemUseCaseEntity>of() : x.useCases()).stream()
                        .filter(u -> externalUseCaseId.equals(u.id()))
                        .map(u -> Map.entry(x, u)))
                .findFirst();
    }

    /**
     * Where a projection fed from outside reads: GET on an external system's use case (its path,
     * default {@code /{name}}) at {@code {SYSTEM}_URL}, or every row of one of its tables over JDBC
     * at {@code {SYSTEM}_JDBC_URL}. Null for the projections fed by events or by an aggregate.
     */
    private Map<String, Object> pollSourceOf(ProjectionEntity projection) {
        if (projection.sourceExternalUseCaseId() != null && !projection.sourceExternalUseCaseId().isBlank()) {
            return externalUseCase(projection.sourceExternalUseCaseId()).map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("kind", "api");
                m.put("system", e.getKey().name());
                m.put("source", e.getValue().name());
                m.put("urlProperty", externalUrlProperty(e.getKey()));
                m.put("defaultUrl", e.getKey().baseUrl() != null && !e.getKey().baseUrl().isBlank() ? e.getKey().baseUrl() : "http://localhost:8080");
                m.put("path", e.getValue().path() != null && !e.getValue().path().isBlank() ? e.getValue().path()
                        : "/" + e.getValue().name().toLowerCase().replaceAll("[^a-z0-9]", "-"));
                return m;
            }).orElse(null);
        }
        if (projection.sourceExternalTableId() != null && !projection.sourceExternalTableId().isBlank()) {
            return repository.findAllOfType(ExternalSystemEntity.class).stream()
                    .flatMap(x -> (x.tables() == null ? List.<io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemTableEntity>of() : x.tables()).stream()
                            .filter(t -> projection.sourceExternalTableId().equals(t.id()))
                            .map(t -> {
                                var prefix = externalUrlProperty(x).replaceAll("_URL$", "");
                                Map<String, Object> m = new HashMap<>();
                                m.put("kind", "table");
                                m.put("system", x.name());
                                m.put("source", t.name());
                                m.put("jdbcProperty", prefix + "_JDBC_URL");
                                m.put("userProperty", prefix + "_JDBC_USER");
                                m.put("passwordProperty", prefix + "_JDBC_PASSWORD");
                                return m;
                            }))
                    .findFirst().orElse(null);
        }
        return null;
    }

    /** {@code LEGADO_JDBC_URL/_USER/_PASSWORD}: what the projections polling a legacy table need. */
    private List<String> externalJdbcEnvs() {
        return repository.findAllOfType(ProjectionEntity.class).stream()
                .map(this::pollSourceOf).filter(java.util.Objects::nonNull)
                .filter(m -> "table".equals(m.get("kind")))
                .flatMap(m -> java.util.stream.Stream.of((String) m.get("jdbcProperty"), (String) m.get("userProperty"), (String) m.get("passwordProperty")))
                .distinct().toList();
    }

    /** {@code PASARELA_URL → its baseUrl}, for every external system some use case calls or a projection polls. */
    private List<Map.Entry<String, String>> externalUrls(ProjectEntity project) {
        var called = repository.findAllOfType(UseCaseEntity.class).stream()
                .flatMap(uc -> uc.steps() == null ? java.util.stream.Stream.empty() : uc.steps().stream())
                .map(UseCaseStepEntity::externalUseCaseId).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(java.util.HashSet::new));
        // and the ones a projection polls
        repository.findAllOfType(ProjectionEntity.class).stream()
                .map(ProjectionEntity::sourceExternalUseCaseId).filter(java.util.Objects::nonNull).forEach(called::add);
        return repository.findAllOfType(ExternalSystemEntity.class).stream()
                .filter(x -> x.useCases() != null && x.useCases().stream().anyMatch(u -> called.contains(u.id())))
                .map(x -> Map.entry(externalUrlProperty(x),
                        x.baseUrl() != null && !x.baseUrl().isBlank() ? x.baseUrl() : "http://localhost:8080"))
                .toList();
    }

    /** The environment variable that says where an external system answers: {@code PASARELA_URL}. */
    static String externalUrlProperty(ExternalSystemEntity system) {
        return system.name().toUpperCase().replaceAll("[^A-Z0-9]+", "_").replaceAll("^_|_$", "") + "_URL";
    }

    /**
     * A call to an external system's use case: POST {@code {path}} (default {@code /{name}}) at
     * {@code {SYSTEM}_URL}, sending its input model (or, when it declares none, the caller's
     * input) and reading its output model.
     */
    private Map<String, Object> externalCallOf(UseCaseEntity caller, String externalUseCaseId, Set<String> commandFieldNames) {
        var found = externalUseCase(externalUseCaseId).orElse(null);
        if (found == null) return null;
        var system = found.getKey();
        var target = found.getValue();
        var className = toTypeName(system.name()) + capitalize(toTypeName(target.name()));
        var request = new java.util.ArrayList<Map<String, Object>>();
        var inputModelId = target.inputModelId() != null && !target.inputModelId().isBlank() ? target.inputModelId() : caller.inputModelId();
        fieldsOf(inputModelId).forEach(f -> request.add(Map.of(
                "name", f.name(), "javaType", javaTypeOf(f),
                "expr", commandFieldNames.contains(f.name()) ? "command." + f.name() + "()" : "null")));
        var response = new java.util.ArrayList<Map<String, Object>>();
        fieldsOf(target.outputModelId()).forEach(f -> response.add(Map.of("name", f.name(), "javaType", javaTypeOf(f))));
        Map<String, Object> remote = new HashMap<>();
        remote.put("className", className);
        remote.put("var", uncapitalize(className));
        remote.put("service", system.name());
        remote.put("external", true);
        remote.put("urlProperty", externalUrlProperty(system));
        remote.put("defaultUrl", system.baseUrl() != null && !system.baseUrl().isBlank() ? system.baseUrl() : "http://localhost:8080");
        remote.put("path", target.path() != null && !target.path().isBlank() ? target.path()
                : "/" + target.name().toLowerCase().replaceAll("[^a-z0-9]", "-"));
        remote.put("request", request);
        remote.put("response", response);
        remote.put("hasResponse", !response.isEmpty());
        return remote;
    }

    private List<ModelFieldEntity> fieldsOf(String modelId) {
        if (modelId == null || modelId.isBlank()) return List.of();
        return repository.findById(modelId, ModelEntity.class)
                .map(m -> m.fields() == null ? List.<ModelFieldEntity>of() : m.fields()).orElse(List.of());
    }

    /** The Java type a field travels as between services (enums and references as text). */
    /** The words the generated UI adds on its own (a menu, a link) follow the project's language: English unless it says Spanish. */
    static boolean speaksSpanish(ProjectEntity project) {
        var locale = project.defaultLocale() != null && !project.defaultLocale().isBlank() ? project.defaultLocale()
                : project.locales() != null && !project.locales().isEmpty() ? project.locales().get(0) : "";
        return locale.toLowerCase().startsWith("es");
    }

    private static String javaTypeOf(ModelFieldEntity f) {
        if (!f.basicType() || f.type() == null) return "String";
        return switch (f.type().name()) {
            case "integer" -> "Integer";
            case "number", "money" -> "java.math.BigDecimal";
            case "bool" -> "Boolean";
            case "date" -> "java.time.LocalDate";
            case "time" -> "java.time.LocalTime";
            case "dateTime" -> "java.time.LocalDateTime";
            default -> "String";
        };
    }

    /** The Java type an event's record gives a payload field (see integration-event.ftl). */
    private static String javaTypeOf(Map<String, Object> arg) {
        if (!Boolean.TRUE.equals(arg.get("basicType"))) return "String";
        var t = String.valueOf(arg.get("type"));
        return switch (t) {
            case "integer" -> "Integer";
            case "number", "money" -> "java.math.BigDecimal";
            case "bool" -> "Boolean";
            case "date" -> "java.time.LocalDate";
            case "time" -> "java.time.LocalTime";
            case "dateTime" -> "java.time.LocalDateTime";
            default -> "String";
        };
    }

    private List<Map<String, Object>> buildArgs(List<ModelFieldEntity> fields, Set<String> commandFieldNames) {
        var args = new java.util.ArrayList<Map<String, Object>>();
        for (var f : fields) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", f.name());
            m.put("basicType", f.basicType());
            m.put("type", f.type() != null ? f.type().name() : null);
            m.put("matched", commandFieldNames.contains(f.name()));
            args.add(m);
        }
        return args;
    }

    // ─── Gateways ─────────────────────────────────────────────────────────────

    private void generateGateway(ProjectEntity project, ServiceEntity service, String serviceDir, GatewayEntity gateway) {
        // Gateways are module-agnostic at service level; we place them in the first deployed
        // module's package dir, in a shared infra area.
        var units = deployedUnits(service);
        if (units.isEmpty()) return;
        var firstBoundedContext = units.get(0);
        var boundedContextSlug = boundedContextSlug(firstBoundedContext.name());
        var boundedContextDir = serviceDir + "/" + boundedContextSlug;
        var boundedContextPackageDir = project.packageName().replace(".", "/") + "/" + boundedContextSlug;

        Map<String, Object> model = buildBaseModel(project, service, firstBoundedContext);
        var gwMap = new HashMap<String, Object>();
        gwMap.putAll(fromJson(toJson(gateway)));

        var allModels = new HashMap<String, ModelEntity>();
        repository.findAllOfType(ModelEntity.class).forEach(m -> allModels.put(m.id(), m));

        // collect models reachable from the operations (input/output + transitive $ref fields)
        var reachable = new java.util.LinkedHashMap<String, ModelEntity>();
        if (gateway.operations() != null) {
            for (var op : gateway.operations()) {
                collectGatewayModel(op.inputModelId(), allModels, reachable);
                collectGatewayModel(op.outputModelId(), allModels, reachable);
            }
        }

        var dtoPackage = project.packageName() + "." + boundedContextSlug + ".application.out.gateway.dto";
        model.put("dtoPackage", dtoPackage);

        // typed DTO descriptors (one record per reachable model)
        var dtos = new java.util.ArrayList<Map<String, Object>>();
        for (var m : reachable.values()) {
            var dto = new HashMap<String, Object>();
            dto.put("className", toTypeName(m.name()));
            var fields = new java.util.ArrayList<Map<String, Object>>();
            if (m.fields() != null) {
                for (var f : m.fields()) {
                    var fm = new HashMap<String, Object>();
                    fm.put("name", f.name());
                    fm.put("javaType", gatewayJavaType(f, allModels));
                    fields.add(fm);
                }
            }
            dto.put("fields", fields);
            dtos.add(dto);
        }
        model.put("dtos", dtos);

        if (gateway.operations() != null) {
            var enrichedOps = new java.util.ArrayList<Map<String, Object>>();
            for (var op : gateway.operations()) {
                var opMap = new HashMap<String, Object>();
                opMap.putAll(fromJson(toJson(op)));
                if (op.inputModelId() != null && !op.inputModelId().isBlank()) {
                    var im = allModels.get(op.inputModelId());
                    if (im != null) opMap.put("inputModel", fromJson(toJson(im)));
                }
                if (op.outputModelId() != null && !op.outputModelId().isBlank()) {
                    var om = allModels.get(op.outputModelId());
                    if (om != null) opMap.put("outputClass", toTypeName(om.name()));
                }
                // give each parameter a Java-safe argument name (header names often have hyphens)
                @SuppressWarnings("unchecked")
                var paramMaps = (List<Map<String, Object>>) opMap.get("parameters");
                if (paramMaps != null) {
                    for (var pm : paramMaps) {
                        pm.put("argName", uncapitalize(toTypeName(String.valueOf(pm.get("name")))));
                    }
                }
                enrichedOps.add(opMap);
            }
            gwMap.put("operations", enrichedOps);
        }
        model.put("gateway", gwMap);

        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/out");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/out/gateway");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/out/gateway/dto");

        for (var dto : dtos) {
            var dtoModel = new HashMap<>(model);
            dtoModel.put("dto", dto);
            createFile(boundedContextDir, dtoModel, "gateway-dto.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/out/gateway/dto/"
                            + dto.get("className") + ".java");
        }

        createFile(boundedContextDir, model, "gateway.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/out/"
                        + capitalize(gateway.name()) + "Gateway.java");
        createFile(boundedContextDir, model, "gateway-impl.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/gateway/"
                        + capitalize(gateway.name()) + "GatewayImpl.java");
    }

    private void collectGatewayModel(String modelId, Map<String, ModelEntity> all,
                                     Map<String, ModelEntity> out) {
        if (modelId == null || modelId.isBlank() || out.containsKey(modelId)) return;
        var m = all.get(modelId);
        if (m == null) return;
        out.put(modelId, m);
        if (m.fields() != null) {
            for (var f : m.fields()) {
                if (!f.basicType() && f.modelId() != null) {
                    collectGatewayModel(f.modelId(), all, out);
                }
            }
        }
    }

    private String gatewayJavaType(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity f,
                                   Map<String, ModelEntity> all) {
        if (!f.basicType() && f.modelId() != null
                && (f.type() == null || !"array".equals(f.type().name()))) {
            var ref = all.get(f.modelId());
            return ref != null ? toTypeName(ref.name()) : "String";
        }
        if (f.type() == null) return "String";
        return switch (f.type()) {
            case integer -> "Integer";
            case number, money -> "java.math.BigDecimal";
            case bool -> "Boolean";
            case date -> "java.time.LocalDate";
            case time -> "java.time.LocalTime";
            case dateTime -> "java.time.LocalDateTime";
            // Arrays travel as JSON text end to end (commands, entities, REST): the dto must
            // match or deserialization breaks on the gateway's response.
            case array -> "String";
            default -> "String";
        };
    }

    // ─── ReadModels ───────────────────────────────────────────────────────────

    private void generateReadModel(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                   String boundedContextDir, String boundedContextPackageDir, ReadModelEntity readModel) {
        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        var typeName = toTypeName(readModel.name());
        var className = typeName.endsWith("ReadModel") ? typeName : typeName + "ReadModel";
        model.put("className", className);
        model.put("tableName", snakeCase(className + "Entity"));
        if (readModel.modelId() != null && !readModel.modelId().isBlank()) {
            var modelEntity = repository.findById(readModel.modelId(), ModelEntity.class).orElse(null);
            model.put("model", modelEntity != null ? fromJson(toJson(modelEntity)) : null);
            // JDBC read side: precomputed column names and primitive accessors per field.
            if (modelEntity != null && modelEntity.fields() != null) {
                model.put("jdbcFields", modelEntity.fields().stream()
                        .map(f -> {
                            var jf = new HashMap<String, Object>();
                            jf.put("name", f.name());
                            jf.put("basicType", f.basicType());
                            jf.put("columnName", snakeCase("col_" + f.name() + (f.basicType() ? "" : "_id")));
                            jf.put("primitiveType", f.basicType() ? mapFieldDataType(f.type()) : null);
                            return (Object) jf;
                        })
                        .toList());
            }
        }
        model.put("dataAccess", dataAccessOf(project, null));

        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/query/readmodel");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/query");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence");

        // Read-side DTO (record)
        createFile(boundedContextDir, model, "read-model.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/query/readmodel/" + className + ".java");

        // JPA persistence
        createFile(boundedContextDir, model, "readmodel-entity.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + className + "Entity.java");
        createFile(boundedContextDir, model, "readmodel-entityrepository.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + className + "EntityRepository.java");

        // QueryService interface + impl
        createFile(boundedContextDir, model, "readmodel-queryservice.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/query/" + className + "QueryService.java");
        createFile(boundedContextDir, model, "readmodel-dbqueryservice.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/persistence/" + className + "DBQueryService.java");
    }

    // ─── IntegrationEvents ────────────────────────────────────────────────────

    private void generateIntegrationEvent(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                          String boundedContextDir, String boundedContextPackageDir, IntegrationEventEntity integrationEvent) {
        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        var className = toTypeName(integrationEvent.name());
        model.put("className", className);
        model.put("integrationEvent", fromJson(toJson(integrationEvent)));
        if (integrationEvent.payloadModelId() != null && !integrationEvent.payloadModelId().isBlank()) {
            var payloadModel = repository.findById(integrationEvent.payloadModelId(), ModelEntity.class).orElse(null);
            model.put("payloadModel", payloadModel != null ? fromJson(toJson(payloadModel)) : null);
        }

        var schemaVersion = schemaVersionOf(integrationEvent.schemaVersion());
        model.put("schemaVersion", schemaVersion);

        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/out/integration");
        createFile(boundedContextDir, model, "integration-event.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/out/integration/" + className + ".java");
        if (schemaVersion > 1) {
            model.put("upcasterClass", className + "Upcaster");
            model.put("upcasterPackage", project.packageName() + "." + boundedContextSlug(boundedContext.name()) + ".application.out.integration");
            model.put("eventLabel", className);
            createFile(boundedContextDir, model, "event-upcaster.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/out/integration/" + className + "Upcaster.java");
            var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
            createCustomFile(customDir, model, "event-upcaster-default.ftl",
                    "src/main/java/" + project.packageName().replace(".", "/")
                            + "/custom/Default" + className + "Upcaster.java");
        }
        createFile(boundedContextDir, model, "integration-event-publisher.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/out/integration/" + className + "Publisher.java");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/out/integration");
        createFile(boundedContextDir, model, "integration-event-kafka-publisher.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/integration/" + className + "KafkaPublisher.java");
    }

    /**
     * A domain event flagged {@code publishAsIntegrationEvent} already carries its full wire
     * config (topic, serialization, DLQ), so it doubles as the integration event: this emits the
     * same artifacts as an explicit IntegrationEventEntity — payload record, publisher port and
     * Kafka implementation — from the domain event itself.
     */
    private void generateIntegrationEventFromDomainEvent(ProjectEntity project, ServiceEntity service,
                                                         BoundedContextEntity boundedContext, String boundedContextDir,
                                                         String boundedContextPackageDir, DomainEventEntity event) {
        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        var className = toTypeName(event.name());
        model.put("className", className);
        Map<String, Object> ieMap = new HashMap<>();
        ieMap.put("topicName", event.topicName());
        model.put("integrationEvent", ieMap);
        var payloadModelId = event.integrationModelId() != null && !event.integrationModelId().isBlank()
                ? event.integrationModelId() : event.modelId();
        if (payloadModelId != null && !payloadModelId.isBlank()) {
            var payloadModel = repository.findById(payloadModelId, ModelEntity.class).orElse(null);
            model.put("payloadModel", payloadModel != null ? fromJson(toJson(payloadModel)) : null);
        }
        model.put("schemaVersion", schemaVersionOf(event.schemaVersion()));

        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/out/integration");
        createFile(boundedContextDir, model, "integration-event.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/out/integration/" + className + ".java");
        createFile(boundedContextDir, model, "integration-event-publisher.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/out/integration/" + className + "Publisher.java");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/out/integration");
        createFile(boundedContextDir, model, "integration-event-kafka-publisher.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/out/integration/" + className + "KafkaPublisher.java");
    }

    // ─── QueryServices ────────────────────────────────────────────────────────

    private void generateQueryService(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                      String boundedContextDir, String boundedContextPackageDir, QueryServiceEntity queryService) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/query");
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/query/dto");

        // Resolve distinct referenced models → DTOs, mapping modelId -> TypeName
        var typeNameByModelId = new HashMap<String, String>();
        var dtosToGenerate = new LinkedHashSet<String>();
        var operations = queryService.operations() != null ? queryService.operations() : List.<QueryOperationEntity>of();

        for (var op : operations) {
            resolveQueryModelType(op.inputModelId(), typeNameByModelId, dtosToGenerate);
            resolveQueryModelType(op.outputModelId(), typeNameByModelId, dtosToGenerate);
        }

        // Generate each DTO once
        for (var modelId : dtosToGenerate) {
            var modelEntity = repository.findById(modelId, ModelEntity.class).orElse(null);
            if (modelEntity == null) continue;
            Map<String, Object> dtoModel = buildBaseModel(project, service, boundedContext);
            var dtoClassName = typeNameByModelId.get(modelId);
            dtoModel.put("className", dtoClassName);
            dtoModel.put("model", fromJson(toJson(modelEntity)));
            createFile(boundedContextDir, dtoModel, "query-dto.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/query/dto/" + dtoClassName + ".java");
        }

        // Build enriched operation list
        var enrichedOps = new ArrayList<Map<String, Object>>();
        for (var op : operations) {
            var opMap = new HashMap<String, Object>();
            opMap.put("opName", uncapitalize(op.name()));
            opMap.put("inType", queryTypeRef(op.inputModelId(), typeNameByModelId));
            opMap.put("outType", queryTypeRef(op.outputModelId(), typeNameByModelId));
            opMap.put("cardinality", op.cardinality() != null ? op.cardinality().name() : "Single");
            enrichedOps.add(opMap);
        }

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        var className = toTypeName(queryService.name());
        model.put("className", className);
        model.put("operations", enrichedOps);
        createFile(boundedContextDir, model, "query-service.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/query/" + className + ".java");
    }

    private void resolveQueryModelType(String modelId, Map<String, String> typeNameByModelId, Set<String> dtosToGenerate) {
        if (modelId == null || modelId.isBlank() || typeNameByModelId.containsKey(modelId)) return;
        var modelEntity = repository.findById(modelId, ModelEntity.class).orElse(null);
        if (modelEntity == null) return;
        typeNameByModelId.put(modelId, toTypeName(modelEntity.name()));
        dtosToGenerate.add(modelId);
    }

    private String queryTypeRef(String modelId, Map<String, String> typeNameByModelId) {
        if (modelId == null || modelId.isBlank()) return "Object";
        return typeNameByModelId.getOrDefault(modelId, "Object");
    }

    // ─── First-class CRUD API REST controllers ─────────────────────────────────

    /** Generate a REST controller for each CRUD API implemented in this bounded context. */
    private void generateApiControllers(ProjectEntity project, ServiceEntity service,
                                        BoundedContextEntity boundedContext, String boundedContextDir,
                                        String boundedContextPackageDir) {
        repository.findAllOfType(
                        io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiEntity.class).stream()
                .filter(api -> api.id() != null && api.id().startsWith("api-crud-"))
                .filter(api -> api.implementedByBoundedContextIds().contains(boundedContext.id()))
                .filter(api -> inScope(api.id()))
                .forEach(api -> generateCrudApiController(project, service, boundedContext,
                        boundedContextDir, boundedContextPackageDir, api));
    }

    private void generateCrudApiController(ProjectEntity project, ServiceEntity service,
                                           BoundedContextEntity boundedContext, String boundedContextDir,
                                           String boundedContextPackageDir,
                                           io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiEntity api) {
        var aggregateId = api.id().substring("api-crud-".length());
        var aggregate = repository.findById(aggregateId, AggregateEntity.class).orElse(null);
        if (aggregate == null) return;

        var pkg = project.packageName();
        var bcSlug = boundedContextSlug(boundedContext.name());
        var imports = new LinkedHashSet<String>();
        var writeOps = new ArrayList<Map<String, Object>>();
        Map<String, Object> read = null;

        for (var op : api.operations()) {
            if ("GET".equalsIgnoreCase(op.httpMethod()) && op.targetQueryServiceId() != null) {
                var qsClass = toTypeName(aggregate.name()) + "QueryService";
                var rowType = toTypeName(aggregate.name()) + "Row";
                read = new HashMap<>();
                read.put("path", op.path() != null ? op.path() : "");
                read.put("method", "list");
                read.put("qsClass", qsClass);
                read.put("qsField", uncapitalize(qsClass));
                read.put("rowType", rowType);
                imports.add(pkg + "." + bcSlug + ".application.query." + qsClass);
                imports.add(pkg + "." + bcSlug + ".application.query.dto." + rowType);
            } else if (op.targetUseCaseId() != null) {
                var uc = repository.findById(op.targetUseCaseId(), UseCaseEntity.class).orElse(null);
                if (uc == null) continue;
                var ucClass = toTypeName(uc.name());
                var ucSlug = uc.name().toLowerCase().replaceAll("[^a-z0-9]", "");
                var hasOutput = uc.outputModelId() != null && !uc.outputModelId().isBlank();
                var wm = new HashMap<String, Object>();
                var trio = crudTrioOf(boundedContext, uc);
                if (trio != null) {
                    // the trio's commands carry the id the path names (see crud-trio-command.ftl)
                    wm.put("trio", trio.role());
                }
                wm.put("mappingAnn", capitalize(op.httpMethod().toLowerCase()) + "Mapping");
                wm.put("path", op.path() != null ? op.path() : "");
                wm.put("ucClass", ucClass);
                wm.put("ucField", uncapitalize(ucClass));
                wm.put("method", uncapitalize(ucClass));
                wm.put("hasOutput", hasOutput);
                writeOps.add(wm);
                var ucPkg = pkg + "." + bcSlug + ".application.usecases." + ucSlug + ".";
                imports.add(ucPkg + ucClass + "UseCase");
                imports.add(ucPkg + ucClass + "Command");
                if (hasOutput) imports.add(ucPkg + ucClass + "Result");
            }
        }
        if (writeOps.isEmpty() && read == null) return;

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("api", Map.of("className", toTypeName(api.name()), "name", api.name()));
        model.put("writeOps", writeOps);
        if (read != null) model.put("read", read);
        model.put("imports", new ArrayList<>(imports));
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/rest");
        createFile(boundedContextDir, model, "api-controller.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/rest/"
                        + toTypeName(api.name()) + "Controller.java");
    }

    // ─── Sagas ────────────────────────────────────────────────────────────────

    private void generateSaga(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                              String boundedContextDir, String boundedContextPackageDir, SagaEntity saga) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/sagas");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("saga", enrichSagaMap(saga));

        createFile(boundedContextDir, model, "saga.ftl",
                "src/main/java/" + boundedContextPackageDir + "/application/sagas/"
                        + capitalize(saga.name()) + "Saga.java");

        // custom-steps hook: a port in the generated boundedContext, default implementation in the custom boundedContext
        var hasCustomStep = saga.steps() != null
                && saga.steps().stream().anyMatch(s -> s.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.saga.vo.SagaStepType.Custom);
        if (hasCustomStep) {
            createFile(boundedContextDir, model, "saga-steps.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/sagas/"
                            + capitalize(saga.name()) + "Steps.java");
            var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
            createCustomFile(customDir, model, "saga-steps-default.ftl",
                    "src/main/java/" + project.packageName().replace(".", "/")
                            + "/custom/Default" + capitalize(saga.name()) + "Steps.java");
        }

        // EventConductor workflow definition (the workflow engine owns the orchestration)
        createFile(boundedContextDir, model, "workflow-definition.ftl",
                "src/main/resources/workflows/" + capitalize(saga.name()) + ".workflow.json");
    }

    /**
     * The EventConductor definition of a workflow.
     *
     * <p>Only the JSON: EventConductor OWNS the orchestration, so there is no class to generate —
     * a workflow is not code, it is a definition the engine loads from
     * {@code classpath:/workflows/*.json}. That is also why the file has to live inside a module:
     * a module is what becomes a jar on a running service's classpath.
     */
    private void generateWorkflow(ProjectEntity project, String boundedContextDir,
                                  WorkflowEntity workflow) {
        var gateways = repository.findAllOfType(WorkflowGatewayEntity.class).stream()
                .filter(g -> workflow.id().equals(workflowGraph.workflowOf(g.id()).orElse(null)))
                .toList();
        var definition = io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                .EventConductorWorkflowDefinition.of(
                        workflow, gateways, this::formIdOfPage,
                        io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                                .EventConductorWorkflowDefinition
                                .topicPrefix(project.name(), workflow.name()));

        Map<String, Object> model = new HashMap<>();
        model.put("definition", toPrettyJson(definition));
        createFile(boundedContextDir, model, "workflow-definition-json.ftl",
                "src/main/resources/workflows/" + capitalize(workflow.name()) + ".workflow.json");
    }

    /**
     * A workflow whose home cannot be worked out generates NOTHING — and the whole reason this
     * code exists is that generating nothing used to be silent. So it says so.
     */
    private void warnAboutHomelessWorkflows() {
        repository.findAllOfType(WorkflowEntity.class).stream()
                .filter(workflow -> inScope(workflow.id()))
                .filter(workflow -> homeContextOf(workflow) == null)
                .forEach(workflow -> log.warn("workflow '{}' generates no definition: it is unknown"
                        + " which context it starts from. Give it a trigger, or a step with a use case.",
                        workflow.name()));
    }

    /**
     * Where a workflow lives: the context that owns whatever STARTS it.
     *
     * <p>A workflow spans contexts by design, so no context owns it — but the file has to be on
     * somebody's classpath, and the one that will certainly be running when the trigger fires is
     * the one the trigger comes from. When nothing says how it starts, the first step's use case
     * decides instead; a workflow with neither has nothing to run and is skipped.
     */
    private String homeContextOf(WorkflowEntity workflow) {
        var trigger = workflow.triggerAggregateId() != null ? workflow.triggerAggregateId()
                : workflow.triggerDomainServiceId() != null ? workflow.triggerDomainServiceId()
                : workflow.triggerUseCaseId();
        if (trigger == null && workflow.steps() != null) {
            trigger = workflow.steps().stream()
                    .map(WorkflowStepEntity::targetUseCaseId)
                    .filter(java.util.Objects::nonNull)
                    .findFirst().orElse(null);
        }
        if (trigger == null) return null;
        var owner = trigger;
        return repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(bc -> owns(bc, owner))
                .map(BoundedContextEntity::id)
                .findFirst().orElse(null);
    }

    private static boolean owns(BoundedContextEntity boundedContext, String elementId) {
        return java.util.stream.Stream.of(boundedContext.aggregateIds(),
                        boundedContext.useCaseIds(), boundedContext.domainServiceIds())
                .filter(java.util.Objects::nonNull)
                .anyMatch(ids -> ids.contains(elementId));
    }

    /** The EventConductor form a page's model becomes (a human task's form). */
    private Map<String, Object> formDefinitionOf(PageEntity page) {
        var fields = page.modelId() == null ? List.<ModelFieldEntity>of() : fieldsOf(page.modelId());
        return io.mateu.modux.modeldrivengenerator.application.usecases.workflow.EventConductorFormDefinition.of(
                page.name(), fields,
                enumId -> repository.findById(enumId, EnumEntity.class)
                        .map(e -> e.values() == null ? List.<String>of() : e.values().stream().map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.EnumValueEntity::name).toList())
                        .orElse(List.of()));
    }

    /** The id of the form generated from a page, or null when that page generates none. */
    private String formIdOfPage(String pageId) {
        return repository.findById(pageId, PageEntity.class)
                .map(page -> io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                        .EventConductorWorkflowDefinition.formId(page.name()))
                .orElse(null);
    }

    /**
     * JSON that comes out the same on every generation: a map's keys in a fixed order (a Map.of has
     * none, it changes from one JVM run to the next), so files and the hashes taken of them are stable.
     */
    private String toPrettyJson(Object value) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .configure(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
                    .writerWithDefaultPrettyPrinter().writeValueAsString(value);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("could not serialize the workflow definition", e);
        }
    }

    private Map<String, Object> enrichSagaMap(SagaEntity saga) {
        var map = new HashMap<String, Object>();
        map.putAll(fromJson(toJson(saga)));

        var enrichedSteps = new java.util.ArrayList<>();
        if (saga.steps() != null) {
            for (var step : saga.steps()) {
                var stepMap = enrichStep(step.id(), step.name(),
                        step.type() != null ? step.type().name() : "Custom",
                        step.aggregateId(), step.operationId(),
                        step.gatewayId(), step.gatewayOperationId(),
                        step.domainEventId(), step.useCaseId(), step.modelMappingId());
                if (step.compensatingStepId() != null) {
                    stepMap.put("compensatingStepId", step.compensatingStepId());
                }
                if (step.maxSuccessfulExecutions() != null) {
                    stepMap.put("maxSuccessfulExecutions", step.maxSuccessfulExecutions());
                }
                enrichedSteps.add(stepMap);
            }
        }
        map.put("steps", enrichedSteps);
        return map;
    }

    // ─── Entity (embedded/child) ──────────────────────────────────────────────

    private void generateEntity(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                String boundedContextDir, String boundedContextPackageDir, EntityEntity entity) {
        var parentAggregate = entity.parentAggregateId() != null
                ? repository.findById(entity.parentAggregateId(), AggregateEntity.class).orElse(null)
                : null;

        var aggregatePackageName = parentAggregate != null
                ? parentAggregate.name().toLowerCase()
                : "shared";

        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName);

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("entity", fromJson(toJson(entity)));
        model.put("aggregate", parentAggregate != null ? aggregateToMap(parentAggregate) : Map.of("name", aggregatePackageName));

        if (entity.modelId() != null && !entity.modelId().isBlank()) {
            var entityModel = repository.findById(entity.modelId(), ModelEntity.class).orElse(null);
            model.put("entityModel", entityModel != null ? fromJson(toJson(entityModel)) : null);
        }

        createFile(boundedContextDir, model, "entity-embedded.ftl",
                "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregatePackageName
                        + "/" + capitalize(entity.name()) + ".java");
    }

    // ─── Value Objects ────────────────────────────────────────────────────────

    private void generateValueObject(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                     String boundedContextDir, String boundedContextPackageDir, ValueObjectEntity vo) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/domain/vo");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("vo", fromJson(toJson(vo)));

        var voType = vo.type() != null ? vo.type().toUpperCase() : "SIMPLE";

        switch (voType) {
            case "ENUM" -> createFile(boundedContextDir, model, "vo-enum.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/domain/vo/"
                            + capitalize(vo.name()) + ".java");
            case "COMPOSITE" -> {
                model.put("voFields", parseVoFields(vo.fieldsJson()));
                createFile(boundedContextDir, model, "vo-composite.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/domain/vo/"
                                + capitalize(vo.name()) + ".java");
            }
            default -> createFile(boundedContextDir, model, "vo-simple.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/domain/vo/"
                            + capitalize(vo.name()) + ".java");
        }
    }

    private void generateAggregateEnum(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                       String boundedContextDir, String boundedContextPackageDir, AggregateEntity aggregate,
                                       String fieldName, String enumId) {
        var enumEntity = repository.findById(enumId, EnumEntity.class).orElse(null);
        var values = (enumEntity != null && enumEntity.values() != null)
                ? enumEntity.values().stream().map(v -> toEnumConstant(v.id())).toList()
                : List.<String>of();

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("aggregate", aggregateToMap(aggregate));
        model.put("enumName", capitalize(fieldName));
        model.put("values", values);

        createFile(boundedContextDir, model, "aggregate-enum.ftl",
                "src/main/java/" + boundedContextPackageDir + "/domain/aggregates/" + aggregate.name().toLowerCase()
                        + "/vo/" + capitalize(fieldName) + ".java");
    }

    /** Turns an enum value id (e.g. "B2C", "pago-front") into a valid Java enum constant. */
    private String toEnumConstant(String id) {
        var constant = id.toUpperCase().replaceAll("[^A-Z0-9_]", "_");
        return constant.matches("^[0-9].*") ? "_" + constant : constant;
    }

    private List<Map<String, String>> parseVoFields(String fieldsJson) {
        if (fieldsJson == null || fieldsJson.isBlank()) return List.of();
        // Try comma-separated "name:type" format
        var result = new ArrayList<Map<String, String>>();
        for (var part : fieldsJson.split(",")) {
            part = part.trim();
            var colonIdx = part.indexOf(':');
            if (colonIdx > 0) {
                var fieldName = part.substring(0, colonIdx).trim();
                var fieldType = part.substring(colonIdx + 1).trim().toLowerCase();
                result.add(Map.of("name", fieldName, "type", fieldType));
            } else if (!part.isBlank()) {
                result.add(Map.of("name", part, "type", "string"));
            }
        }
        return result;
    }

    // ─── Model Mappings (scanned from use-case and saga steps) ───────────────

    private void generateModelMappingsForBoundedContext(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                                String boundedContextDir, String boundedContextPackageDir) {
        Set<String> mappingIds = new LinkedHashSet<>();

        // Collect from use case steps
        if (boundedContext.useCaseIds() != null) {
            boundedContext.useCaseIds().stream()
                    .map(id -> repository.findById(id, UseCaseEntity.class).orElse(null))
                    .filter(uc -> uc != null && inScope(uc.id()) && uc.steps() != null)
                    .flatMap(uc -> uc.steps().stream())
                    .filter(step -> step.modelMappingId() != null && !step.modelMappingId().isBlank())
                    .map(UseCaseStepEntity::modelMappingId)
                    .forEach(mappingIds::add);
        }

        // Collect from saga steps
        if (boundedContext.sagaIds() != null) {
            boundedContext.sagaIds().stream()
                    .map(id -> repository.findById(id, SagaEntity.class).orElse(null))
                    .filter(saga -> saga != null && inScope(saga.id()) && saga.steps() != null)
                    .flatMap(saga -> saga.steps().stream())
                    .filter(step -> step.modelMappingId() != null && !step.modelMappingId().isBlank())
                    .map(SagaStepEntity::modelMappingId)
                    .forEach(mappingIds::add);
        }

        if (mappingIds.isEmpty()) return;

        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/mappers");

        for (var mappingId : mappingIds) {
            var mapping = repository.findById(mappingId, ModelMappingEntity.class).orElse(null);
            if (mapping == null) continue;

            Map<String, Object> model = buildBaseModel(project, service, boundedContext);
            model.put("mapping", fromJson(toJson(mapping)));

            ModelEntity sourceModel = null;
            ModelEntity targetModel = null;
            if (mapping.sourceModelId() != null && !mapping.sourceModelId().isBlank()) {
                sourceModel = repository.findById(mapping.sourceModelId(), ModelEntity.class).orElse(null);
                model.put("sourceModel", sourceModel != null ? fromJson(toJson(sourceModel)) : null);
            }
            if (mapping.targetModelId() != null && !mapping.targetModelId().isBlank()) {
                targetModel = repository.findById(mapping.targetModelId(), ModelEntity.class).orElse(null);
                model.put("targetModel", targetModel != null ? fromJson(toJson(targetModel)) : null);
            }

            // Self-contained mapping DTOs (colocated) so the mapper compiles regardless of how the
            // model is represented elsewhere; the type name is derived from the model name.
            if (sourceModel != null) {
                model.put("sourceTypeName", typeName(sourceModel.name()));
                createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/mappers/dto");
                Map<String, Object> dto = buildBaseModel(project, service, boundedContext);
                dto.put("model", fromJson(toJson(sourceModel)));
                dto.put("className", typeName(sourceModel.name()));
                createFile(boundedContextDir, dto, "mapper-dto.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/application/mappers/dto/"
                                + typeName(sourceModel.name()) + ".java");
            }
            if (targetModel != null) {
                model.put("targetTypeName", typeName(targetModel.name()));
                createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/mappers/dto");
                Map<String, Object> dto = buildBaseModel(project, service, boundedContext);
                dto.put("model", fromJson(toJson(targetModel)));
                dto.put("className", typeName(targetModel.name()));
                createFile(boundedContextDir, dto, "mapper-dto.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/application/mappers/dto/"
                                + typeName(targetModel.name()) + ".java");
            }

            createFile(boundedContextDir, model, "model-mapper.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/mappers/"
                            + capitalize(mapping.name()) + "Mapper.java");

            // custom part: a two-zone hook (port in the generated boundedContext, default impl in the custom boundedContext)
            var hasResolvedModels = model.get("sourceModel") != null && model.get("targetModel") != null;
            if (mapping.hasCustomPart() && hasResolvedModels) {
                createFile(boundedContextDir, model, "model-mapper-custom.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/application/mappers/"
                                + capitalize(mapping.name()) + "CustomMapping.java");
                var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
                createCustomFile(customDir, model, "model-mapper-custom-default.ftl",
                        "src/main/java/" + project.packageName().replace(".", "/")
                                + "/custom/Default" + capitalize(mapping.name()) + "CustomMapping.java");
            }
        }
    }

    // ─── Business rules (fact = the aggregate whose modelId matches the rule) ───

    private void generateBusinessRulesForBoundedContext(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                                String boundedContextDir, String boundedContextPackageDir) {
        var aggregateIds = boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of();
        if (aggregateIds.isEmpty()) return;

        var allRules = repository.findAllOfType(BusinessRuleEntity.class);
        if (allRules == null || allRules.isEmpty()) return;

        var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";

        for (var aggregateId : aggregateIds) {
            if (!inScope(aggregateId)) continue;
            var aggregate = repository.findById(aggregateId, AggregateEntity.class).orElse(null);
            if (aggregate == null || aggregate.modelId() == null) continue;

            var rules = allRules.stream()
                    .filter(r -> aggregate.modelId().equals(r.modelId()))
                    .toList();
            if (rules.isEmpty()) continue;

            createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/application/rules");
            var aggMap = aggregateToMap(aggregate);

            // per-aggregate port + evaluator (generated once)
            Map<String, Object> aggModel = buildBaseModel(project, service, boundedContext);
            aggModel.put("aggregate", aggMap);
            createFile(boundedContextDir, aggModel, "business-rule-port.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/rules/"
                            + capitalize(aggregate.name()) + "Rule.java");
            createFile(boundedContextDir, aggModel, "business-rules-evaluator.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/application/rules/"
                            + capitalize(aggregate.name()) + "RulesEvaluator.java");

            // per rule: generated glue + hook port, plus write-once default impl in the custom boundedContext
            for (var rule : rules) {
                Map<String, Object> model = buildBaseModel(project, service, boundedContext);
                model.put("aggregate", aggMap);
                model.put("rule", fromJson(toJson(rule)));

                createFile(boundedContextDir, model, "business-rule.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/application/rules/"
                                + capitalize(rule.name()) + "Rule.java");
                createFile(boundedContextDir, model, "business-rule-logic.ftl",
                        "src/main/java/" + boundedContextPackageDir + "/application/rules/"
                                + capitalize(rule.name()) + "Logic.java");
                createCustomFile(customDir, model, "business-rule-logic-default.ftl",
                        "src/main/java/" + project.packageName().replace(".", "/")
                                + "/custom/Default" + capitalize(rule.name()) + "Logic.java");
            }
        }
    }

    // ─── Database schema migrations (Flyway) ───────────────────────────────────

    private void generateDatabaseMigrations(ProjectEntity project, ServiceEntity service, String serviceDir) {
        var tool = repository.findById(DeploymentEntity.idFor(project.id()), DeploymentEntity.class)
                .map(DeploymentEntity::dbMigrationTool).orElse(null);
        if (tool == DbMigrationTool.None) return;            // explicit opt-out → keep ddl-auto
        if (tool == DbMigrationTool.Liquibase) {
            System.out.println("[modux] Liquibase migrations are not generated yet; skipping for service "
                    + service.name() + ". Set dbMigrationTool=Flyway to generate migrations.");
            return;
        }
        // Flyway (also the default when unset)

        var tables = new ArrayList<Map<String, Object>>();
        for (var boundedContext : deployedUnits(service)) {
            for (var aggId : (boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of())) {
                if (!inScope(aggId)) continue;
                var agg = repository.findById(aggId, AggregateEntity.class).orElse(null);
                if (agg == null) continue;
                tables.add(aggregateTable(agg));
                if (isEventSourced(agg)) {
                    tables.add(eventStoreTable(agg));
                }
            }
            for (var entId : (boundedContext.entityIds() != null ? boundedContext.entityIds() : List.<String>of())) {
                if (!inScope(entId)) continue;
                var ent = repository.findById(entId, EntityEntity.class).orElse(null);
                if (ent != null && ent.isCollection()) tables.add(collectionEntityTable(ent));
            }
            // read models are discovered by boundedContextId (the same way generateBoundedContext does), so
            // flow-materialized read models are included too
            repository.findAllOfType(ReadModelEntity.class).stream()
                    .filter(rm -> boundedContext.id().equals(rm.boundedContextId()))
                    .filter(rm -> inScope(rm.id()))
                    .forEach(rm -> tables.add(readModelTable(rm)));
            // the correlative series of the context (systemValue SEQUENCE), when it takes numbers
            if (usesSequences(boundedContext)) {
                var seqColumns = new ArrayList<Map<String, Object>>();
                seqColumns.add(column("name", "varchar(255)", true));
                seqColumns.add(column("last_value", "bigint", false));
                var seqTable = new HashMap<String, Object>();
                seqTable.put("name", boundedContext.name().toLowerCase().replaceAll("[^a-z0-9]", "") + "_sequence");
                seqTable.put("columns", seqColumns);
                tables.add(seqTable);
            }
        }

        // Inbox table for idempotent subscriptions (see inbox.ftl)
        var needsInbox = deployedUnits(service).stream()
                .flatMap(bc -> (bc.subscriptionIds() != null ? bc.subscriptionIds() : List.<String>of()).stream())
                .map(id -> repository.findById(id, SubscriptionEntity.class).orElse(null))
                .anyMatch(sub -> sub != null && sub.idempotencyEnabled());
        if (needsInbox) {
            var inboxColumns = new ArrayList<Map<String, Object>>();
            inboxColumns.add(column("id", "bigint", true));
            inboxColumns.add(column("subscription_name", "varchar(255)", false));
            inboxColumns.add(column("message_hash", "varchar(64)", false));
            inboxColumns.add(column("processed_at", "timestamp", false));
            var inboxTable = new HashMap<String, Object>();
            inboxTable.put("name", "modux_inbox");
            inboxTable.put("columns", inboxColumns);
            inboxTable.put("sequence", "modux_inbox_sequence");
            tables.add(inboxTable);
        }
        if (service.outboxEnabled()) {
            var outboxName = service.outboxTableName() != null && !service.outboxTableName().isBlank()
                    ? service.outboxTableName() : "modux_outbox";
            var outboxColumns = new ArrayList<Map<String, Object>>();
            outboxColumns.add(column("id", "bigint", true));
            outboxColumns.add(column("destination", "varchar(255)", false));
            outboxColumns.add(column("payload", "text", false));
            outboxColumns.add(column("created_at", "timestamp", false));
            var outboxTable = new HashMap<String, Object>();
            outboxTable.put("name", outboxName);
            outboxTable.put("columns", outboxColumns);
            outboxTable.put("sequence", outboxName + "_sequence");
            tables.add(outboxTable);
        }
        if (tables.isEmpty()) return;

        var appDir = serviceDir + "/" + serviceName(service) + "-app";
        var migrationDir = appDir + "/src/main/resources/db/migration";
        var snapshotPath = Path.of(project.outputPath(), ".modux", "schema-" + serviceName(service) + ".json");

        // Stored procedures for aggregate retrieval, in a Postgres-only location the local
        // profile does not load (see application-yaml.ftl). A repeatable migration: Flyway
        // reapplies it on checksum change and CREATE OR REPLACE keeps it idempotent.
        var procs = deployedUnits(service).stream()
                .flatMap(bc -> (bc.aggregateIds() != null ? bc.aggregateIds() : List.<String>of()).stream())
                .map(id -> repository.findById(id, AggregateEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .filter(agg -> inScope(agg.id()))
                .filter(agg -> "STORED_PROCEDURE".equals(dataAccessOf(project, agg)))
                .map(this::aggregateToMap)
                .toList();
        if (!procs.isEmpty()) {
            Map<String, Object> procModel = new HashMap<>();
            procModel.put("project", projectToMap(project));
            procModel.put("service", serviceToMap(service));
            procModel.put("procs", procs);
            createFile(appDir, procModel, "get-procs.ftl",
                    "src/main/resources/db/migration-pg/R__get_procs.sql");
        }
        var previous = readSchemaSnapshot(snapshotPath);

        if (previous == null) {
            // first generation → immutable baseline
            Map<String, Object> model = new HashMap<>();
            model.put("project", projectToMap(project));
            model.put("service", serviceToMap(service));
            model.put("tables", tables);
            createCustomFile(appDir, model, "flyway-baseline.ftl",
                    "src/main/resources/db/migration/V1__baseline.sql");
            writeSchemaSnapshot(snapshotPath, 1, tables);
            return;
        }

        // subsequent generation → diff the desired schema against the last snapshot
        var diff = diffSchema(asList(previous.get("tables")), tables);
        var newTables = asList(diff.get("newTables"));
        var addedColumns = asList(diff.get("addedColumns"));
        var widenedColumns = asList(diff.get("widenedColumns"));
        var review = asList(diff.get("review"));
        if (newTables.isEmpty() && addedColumns.isEmpty() && widenedColumns.isEmpty() && review.isEmpty()) {
            return;   // no schema change → no new migration
        }

        var nextVersion = Math.max(intValue(previous.get("version")), maxMigrationVersion(migrationDir)) + 1;
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));
        model.put("version", nextVersion);
        model.put("newTables", newTables);
        model.put("addedColumns", addedColumns);
        model.put("widenedColumns", widenedColumns);
        model.put("review", review);
        // each incremental migration is immutable once applied
        createCustomFile(appDir, model, "flyway-migration.ftl",
                "src/main/resources/db/migration/V" + nextVersion + "__model_changes.sql");
        writeSchemaSnapshot(snapshotPath, nextVersion, tables);
        if (!review.isEmpty()) {
            System.out.println("[modux] Schema migration V" + nextVersion + " for service " + service.name()
                    + " contains " + review.size() + " destructive/ambiguous change(s) left as comments for manual review.");
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object> asList(Object value) {
        return value instanceof List<?> list ? (List<Object>) list : List.of();
    }

    private int intValue(Object value) {
        return value instanceof Number n ? n.intValue() : 0;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readSchemaSnapshot(Path path) {
        try {
            if (!Files.exists(path)) return null;
            return fromJson(Files.readString(path));
        } catch (Exception e) {
            return null;   // unreadable snapshot → treat as first generation
        }
    }

    @SneakyThrows
    private void writeSchemaSnapshot(Path path, int version, List<Map<String, Object>> tables) {
        Files.createDirectories(path.getParent());
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("version", version);
        snapshot.put("tables", tables);
        Files.writeString(path, toJson(snapshot));
    }

    /** Highest existing V{n} migration number in the directory, or 0 if none. */
    private int maxMigrationVersion(String migrationDir) {
        var dir = Path.of(migrationDir);
        if (!Files.isDirectory(dir)) return 0;
        var max = 0;
        try (var stream = Files.list(dir)) {
            for (var p : (Iterable<Path>) stream::iterator) {
                var m = java.util.regex.Pattern.compile("^V(\\d+)__").matcher(p.getFileName().toString());
                if (m.find()) max = Math.max(max, Integer.parseInt(m.group(1)));
            }
        } catch (Exception ignored) {
            // best effort
        }
        return max;
    }

    /** Diff two table lists; additive changes are returned as DDL, destructive ones as review notes. */
    private Map<String, Object> diffSchema(List<Object> previous, List<Map<String, Object>> current) {
        var prevByName = new HashMap<String, Map<String, Object>>();
        for (var t : previous) {
            if (t instanceof Map<?, ?> m) prevByName.put(String.valueOf(m.get("name")), castMap(m));
        }
        var curByName = new HashMap<String, Map<String, Object>>();
        for (var t : current) curByName.put(String.valueOf(t.get("name")), t);

        var newTables = new ArrayList<Object>();
        var addedColumns = new ArrayList<Object>();
        var widenedColumns = new ArrayList<Object>();
        var review = new ArrayList<Object>();

        for (var curTable : current) {
            var name = String.valueOf(curTable.get("name"));
            var prevTable = prevByName.get(name);
            if (prevTable == null) {
                newTables.add(curTable);
                continue;
            }
            var prevCols = columnTypes(prevTable);
            var curCols = columnTypes(curTable);
            for (var entry : curCols.entrySet()) {
                if (!prevCols.containsKey(entry.getKey())) {
                    var col = new HashMap<String, Object>();
                    col.put("table", name);
                    col.put("name", entry.getKey());
                    col.put("type", entry.getValue());
                    addedColumns.add(col);
                } else if (widens(prevCols.get(entry.getKey()), entry.getValue())) {
                    // only wider (varchar → text): nothing written so far can be lost
                    var col = new HashMap<String, Object>();
                    col.put("table", name);
                    col.put("name", entry.getKey());
                    col.put("type", entry.getValue());
                    col.put("was", prevCols.get(entry.getKey()));
                    widenedColumns.add(col);
                } else if (!prevCols.get(entry.getKey()).equals(entry.getValue())) {
                    review.add("ALTER TABLE " + name + " ALTER COLUMN " + entry.getKey()
                            + " TYPE " + entry.getValue() + ";  -- was " + prevCols.get(entry.getKey()));
                }
            }
            for (var prevColName : prevCols.keySet()) {
                if (!curCols.containsKey(prevColName)) {
                    review.add("ALTER TABLE " + name + " DROP COLUMN " + prevColName + ";");
                }
            }
        }
        for (var prevName : prevByName.keySet()) {
            if (!curByName.containsKey(prevName)) {
                review.add("DROP TABLE " + prevName + ";");
            }
        }

        var diff = new HashMap<String, Object>();
        diff.put("newTables", newTables);
        diff.put("addedColumns", addedColumns);
        diff.put("widenedColumns", widenedColumns);
        diff.put("review", review);
        return diff;
    }

    /** A column type change that keeps every value: varchar(n) to text, or to a longer varchar. */
    static boolean widens(String was, String now) {
        if (was == null || now == null || was.equals(now)) return false;
        var from = java.util.regex.Pattern.compile("varchar\\((\\d+)\\)").matcher(was.trim());
        if (!from.matches()) return false;
        if (now.trim().equals("text")) return true;
        var to = java.util.regex.Pattern.compile("varchar\\((\\d+)\\)").matcher(now.trim());
        return to.matches() && Integer.parseInt(to.group(1)) > Integer.parseInt(from.group(1));
    }

    private Map<String, String> columnTypes(Map<String, Object> table) {
        var result = new java.util.LinkedHashMap<String, String>();
        for (var c : asList(table.get("columns"))) {
            if (c instanceof Map<?, ?> col) {
                result.put(String.valueOf(col.get("name")), String.valueOf(col.get("type")));
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Map<?, ?> m) {
        return (Map<String, Object>) m;
    }

    private Map<String, Object> aggregateTable(AggregateEntity aggregate) {
        var columns = new ArrayList<Map<String, Object>>();
        columns.add(column("id", "bigint", true));
        var modelEntity = (aggregate.modelId() != null && !aggregate.modelId().isBlank())
                ? repository.findById(aggregate.modelId(), ModelEntity.class).orElse(null) : null;
        if (modelEntity != null && modelEntity.fields() != null) {
            for (var f : modelEntity.fields()) {
                if ("id".equals(f.name())) continue;
                // a list of value objects is kept as JSON: unbounded text, never varchar(255)
                var jsonList = !f.basicType() && f.modelId() != null && !f.modelId().isBlank()
                        && f.type() == FieldDataType.array;
                var type = f.longText() ? "text"
                        : f.basicType() ? sqlTypeForPrimitive(mapFieldDataType(f.type()))
                        : jsonList ? "text" : "varchar(255)";
                columns.add(column(snakeCase("col_" + f.name()), type, false));
            }
        }
        var table = new HashMap<String, Object>();
        table.put("name", aggregateTableName(aggregate));
        table.put("columns", columns);
        table.put("sequence", aggregate.name().toLowerCase() + "_sequence");
        return table;
    }

    /** The append-only event-store table for an event-sourced aggregate. */
    private Map<String, Object> eventStoreTable(AggregateEntity aggregate) {
        var columns = new ArrayList<Map<String, Object>>();
        columns.add(column("id", "bigint", true));
        columns.add(column("aggregate_id", "varchar(255)", false));
        columns.add(column("sequence_number", "bigint", false));
        columns.add(column("event_type", "varchar(255)", false));
        columns.add(column("payload", "text", false));
        columns.add(column("occurred_at", "timestamp", false));
        columns.add(column("recorded_by", "varchar(255)", false));
        var table = new HashMap<String, Object>();
        table.put("name", aggregate.name().toLowerCase() + "_event");
        table.put("columns", columns);
        table.put("sequence", aggregate.name().toLowerCase() + "_event_sequence");
        return table;
    }

    private Map<String, Object> readModelTable(ReadModelEntity readModel) {
        var columns = new ArrayList<Map<String, Object>>();
        columns.add(column("id", "varchar(255)", true));
        var modelEntity = (readModel.modelId() != null && !readModel.modelId().isBlank())
                ? repository.findById(readModel.modelId(), ModelEntity.class).orElse(null) : null;
        if (modelEntity != null && modelEntity.fields() != null) {
            for (var f : modelEntity.fields()) {
                if ("id".equals(f.name())) continue;
                if (f.basicType()) {
                    columns.add(column(snakeCase("col_" + f.name()), f.longText() ? "text" : sqlTypeForRawType(f.type()), false));
                } else {
                    columns.add(column(snakeCase("col_" + f.name() + "_id"), "varchar(255)", false));
                }
            }
        }
        var typeName = toTypeName(readModel.name());
        var className = typeName.endsWith("ReadModel") ? typeName : typeName + "ReadModel";
        var table = new HashMap<String, Object>();
        table.put("name", snakeCase(className + "Entity"));
        table.put("columns", columns);
        table.put("sequence", null);
        return table;
    }

    private Map<String, Object> collectionEntityTable(EntityEntity entity) {
        var columns = new ArrayList<Map<String, Object>>();
        columns.add(column("id", "varchar(255)", true));
        var modelEntity = (entity.modelId() != null && !entity.modelId().isBlank())
                ? repository.findById(entity.modelId(), ModelEntity.class).orElse(null) : null;
        if (modelEntity != null && modelEntity.fields() != null) {
            for (var f : modelEntity.fields()) {
                if ("id".equals(f.name())) continue;
                // collection entities use no @Column → the physical naming strategy snake-cases the field name
                if (f.basicType()) {
                    columns.add(column(snakeCase(f.name()), sqlTypeForRawType(f.type()), false));
                } else {
                    columns.add(column(snakeCase(f.name() + "Id"), "varchar(255)", false));
                }
            }
        }
        var table = new HashMap<String, Object>();
        table.put("name", entity.name().toLowerCase().replaceAll("[^a-z0-9]", "_"));
        table.put("columns", columns);
        table.put("sequence", null);
        return table;
    }

    private Map<String, Object> column(String name, String type, boolean pk) {
        var c = new HashMap<String, Object>();
        c.put("name", name);
        c.put("type", type);
        c.put("pk", pk);
        return c;
    }

    /** Table name for an aggregate: the model's explicit tableName if set, else snake_case of {Aggregate}Entity. */
    private String aggregateTableName(AggregateEntity aggregate) {
        if (aggregate.tableName() != null && !aggregate.tableName().isBlank()) {
            return aggregate.tableName();
        }
        return snakeCase(aggregate.name() + "Entity");
    }

    /** SQL type for an aggregate field's resolved primitive type (output of mapFieldDataType). */
    private String sqlTypeForPrimitive(String primitiveType) {
        if (primitiveType == null) return "varchar(255)";
        return switch (primitiveType) {
            case "integer" -> "integer";
            case "decimal" -> "numeric(19, 4)";
            case "bool" -> "boolean";
            case "date" -> "date";
            case "time" -> "time";
            case "datetime" -> "timestamp";
            case "json" -> "text";
            default -> "varchar(255)";
        };
    }

    /** SQL type for a raw model field data type (read-model / collection-entity fields). */
    private String sqlTypeForRawType(FieldDataType type) {
        if (type == null) return "varchar(255)";
        return switch (type) {
            case integer -> "integer";
            case number, money -> "numeric(19, 4)";
            case bool -> "boolean";
            case date -> "date";
            case time -> "time";
            case dateTime -> "timestamp";
            case array -> "text"; // kept as JSON
            default -> "varchar(255)";
        };
    }

    /** Whether an aggregate is event-sourced (by persistence type or the explicit flag). */
    private boolean isEventSourced(AggregateEntity aggregate) {
        return aggregate.eventSourcingEnabled()
                || (aggregate.persistenceType() != null && "EVENT_SOURCED".equals(aggregate.persistenceType().name()));
    }

    /** Resolve a model schema-version string ("2", "v2", null...) to an int, defaulting to 1. */
    private int schemaVersionOf(String raw) {
        if (raw == null) return 1;
        var digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) return 1;
        try {
            var v = Integer.parseInt(digits);
            return v < 1 ? 1 : v;
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    /** Lowercase snake_case of a Java identifier, matching how table names are emitted in @Table. */
    private String snakeCase(String value) {
        if (value == null || value.isEmpty()) return value;
        var sb = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (i > 0 && Character.isUpperCase(c)) {
                char prev = value.charAt(i - 1);
                if (Character.isLowerCase(prev) || Character.isDigit(prev)) sb.append('_');
            }
            sb.append(Character.toLowerCase(c));
        }
        return sb.toString();
    }

    // ─── Pages ────────────────────────────────────────────────────────────────

    private void generatePage(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                              String boundedContextDir, String boundedContextPackageDir, PageEntity page) {
        var pageSlug = pageSlug(page);
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + pageSlug);

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("page", fromJson(toJson(page)));
        model.put("pageSlug", pageSlug);
        model.put("pageClassName", pageClassName(page));


        // The ui→page assignment says the page IS the interface: the page class itself
        // carries @UI (path and mateu parameters from the declared UI) — no Home wrapper.
        repository.findAllOfType(UiEntity.class).stream()
                .filter(u -> u.appIds().isEmpty() && !u.pageIds().isEmpty()
                        && u.pageIds().get(0).equals(page.id()))
                .findFirst()
                .ifPresent(u -> model.put("ui", fromJson(toJson(u))));

        // Resolve aggregate
        if (page.aggregateId() != null && !page.aggregateId().isBlank()) {
            var aggregate = repository.findById(page.aggregateId(), AggregateEntity.class).orElse(null);
            model.put("aggregate", aggregate != null ? aggregateToMap(aggregate) : null);
        }

        // Resolve model for FORM pages
        if (page.modelId() != null && !page.modelId().isBlank()) {
            var pageModel = repository.findById(page.modelId(), ModelEntity.class).orElse(null);
            model.put("pageModel", pageModel != null ? fromJson(toJson(pageModel)) : null);
        }

        // Resolve components for DASHBOARD pages
        if (page.componentIds() != null && !page.componentIds().isEmpty()) {
            var components = page.componentIds().stream()
                    .map(cId -> repository.findById(cId, ComponentEntity.class).orElse(null))
                    .filter(c -> c != null)
                    .map(c -> fromJson(toJson(c)))
                    .toList();
            model.put("components", components);

            // Also generate each component class
            page.componentIds().stream()
                    .map(cId -> repository.findById(cId, ComponentEntity.class).orElse(null))
                    .filter(c -> c != null)
                    .forEach(component -> generateComponent(project, service, boundedContext, boundedContextDir, boundedContextPackageDir, component));
        }

        // A designed component tree wins over the page type: the page IS its design.
        var composed = page.content() != null && !page.content().isEmpty();
        if (composed) {
            var wiring = new ComponentTreeJava.Wiring(
                    id -> repository.findById(id, ModelEntity.class).orElse(null),
                    id -> repository.findById(id, QueryServiceEntity.class).orElse(null),
                    contextId -> repository.findById(contextId, BoundedContextEntity.class)
                            .map(ctx -> project.packageName() + "." + boundedContextSlug(ctx.name()))
                            .orElse(null),
                    fieldId -> repository.findAllOfType(ModelEntity.class).stream()
                            .filter(m -> inProject(m.projectId(), project))
                            .filter(m -> m.fields() != null && m.fields().stream()
                                    .anyMatch(f -> fieldId.equals(f.id())))
                            .findFirst().orElse(null),
                    this::toTypeName,
                    id -> repository.findById(id, UseCaseEntity.class).orElse(null),
                    useCaseId -> repository.findAllOfType(BoundedContextEntity.class).stream()
                            .filter(ctx -> ctx.useCaseIds() != null && ctx.useCaseIds().contains(useCaseId))
                            .findFirst()
                            .map(ctx -> project.packageName() + "." + boundedContextSlug(ctx.name()))
                            .orElse(null),
                    id -> repository.findById(id, PageEntity.class).orElse(null),
                    id -> repository.findById(id, ModelMappingEntity.class).orElse(null));
            // Is this page the ficha some crud/listing navigates to? Its query op loads the record.
            var detailSource = repository.findAllOfType(PageEntity.class).stream()
                    .filter(p -> inProject(p.projectId(), project))
                    // sorted so the picked source doesn't flip between generations when
                    // several listings point at the same ficha
                    .sorted(java.util.Comparator.comparing(PageEntity::name,
                            java.util.Comparator.nullsLast(String::compareTo)))
                    .flatMap(p -> flattenContent(p.content()))
                    .filter(node -> page.id().equals(node.detailPageId()))
                    .filter(node -> node.queryServiceId() != null)
                    .findFirst().orElse(null);
            var tree = ComponentTreeJava.of(page.content(), wiring, detailSource);
            model.put("componentTree", tree.expression());
            model.put("treeImports", tree.imports());
            model.put("treeFields", tree.classFields());
            model.put("treeNested", tree.nestedClasses());
            if (tree.actionHandler() != null) {
                model.put("actionHandler", tree.actionHandler());
            }
            if (tree.hydration() != null) {
                model.put("hydration", tree.hydration());
            }
            // The wildcard route must exist whenever some listing navigates here, even if
            // hydration could not be derived — a row click may not pre-fill, but it must land.
            if (tree.hydration() != null || detailSource != null) {
                model.put("pageRoute",
                        (page.route() != null && !page.route().isBlank() ? page.route() : "/" + page.id()) + "/.*");
            }
        }

        var pageType = page.type() != null ? page.type().toUpperCase() : "CRUD";
        var template = composed ? "page-composed.ftl" : switch (pageType) {
            case "FORM" -> "page-form.ftl";
            case "DASHBOARD" -> "page-dashboard.ftl";
            case "WIZARD" -> "page-wizard.ftl";
            // A generic page: the declaration decides — viewmodel => form, components => dashboard.
            case "PAGE" -> page.modelId() != null && !page.modelId().isBlank()
                    ? "page-form.ftl"
                    : (page.componentIds() != null && !page.componentIds().isEmpty())
                        ? "page-dashboard.ftl"
                        : "page-form.ftl";
            default -> "page-crud.ftl";
        };

        createFile(boundedContextDir, model, template,
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/pages/" + pageSlug
                        + "/" + pageClassName(page) + ".java");

        // FORM and WIZARD pages also emit an EventConductor form definition (for USER_TASK steps)
        if ((pageType.equals("FORM") || pageType.equals("PAGE") || pageType.equals("WIZARD")) && page.modelId() != null) {
            var pageModelEntity = repository.findById(page.modelId(), ModelEntity.class).orElse(null);
            if (pageModelEntity != null && pageModelEntity.fields() != null && !pageModelEntity.fields().isEmpty()) {
                createFile(boundedContextDir, Map.of("definition", toPrettyJson(formDefinitionOf(page))),
                        "workflow-definition-json.ftl", "src/main/resources/forms/"
                                + capitalize(page.name().replaceAll("[^a-zA-Z0-9]", "")) + ".form.json");
            }
        }
    }

    // ─── Components ───────────────────────────────────────────────────────────

    private void generateComponent(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                   String boundedContextDir, String boundedContextPackageDir, ComponentEntity component) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/components");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("component", fromJson(toJson(component)));

        createFile(boundedContextDir, model, "component.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/ui/components/"
                        + capitalize(component.name().replaceAll("[^a-zA-Z0-9]", "")) + "Component.java");
    }

    // ─── Roles / Security ─────────────────────────────────────────────────────

    private void generateRolesConfig(ProjectEntity project, ServiceEntity service, String serviceDir) {
        // Only the project's roles, deduped by name (same-named roles in other
        // projects once produced a duplicated ROLE_X constant).
        var seenNames = new java.util.HashSet<String>();
        var roles = repository.findAllOfType(RoleEntity.class).stream()
                .filter(r -> inProject(r.projectId(), project))
                .filter(r -> seenNames.add(r.name() == null ? r.id() : r.name().trim().toUpperCase()))
                .toList();
        // Always a SecurityConfig: the service ships spring-boot-starter-security, and without
        // one Spring's default locks every endpoint behind a random password. With no roles and
        // no IdP the model declares no authorization, and the config says so (open service).

        var serviceName = serviceName(service);
        var appDir = serviceDir + "/" + serviceName + "-app";
        var packageDir = project.packageName().replace(".", "/");

        createDir(appDir, "src/main/java/" + packageDir + "/infra/in/security");

        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));
        model.put("roles", roles.stream().map(r -> fromJson(toJson(r))).toList());
        idpFor(project).ifPresent(idp -> model.put("idp", idp));

        createFile(appDir, model, "role-security.ftl",
                "src/main/java/" + packageDir + "/infra/in/security/SecurityConfig.java");
        // one login for the whole system: the form's (roles, no IdP) or the IdP's — either way the
        // system's own signed cookie is what every service then accepts
        if (!roles.isEmpty() || idpFor(project).isPresent()) {
            model.put("securityPackage", project.packageName() + ".infra.in.security");
            createFile(appDir, model, "auth-cookie.ftl",
                    "src/main/java/" + packageDir + "/infra/in/security/ModuxAuthCookie.java");
        }
    }

    // ─── UIAdapter Home ───────────────────────────────────────────────────────

    /** Accents out ("página" → "pagina") so identifiers stay plain ASCII. */
    private static String stripAccents(String text) {
        return java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }

    /** The page's package slug, accent-free ("página 3" → "pagina3"). */
    private String pageSlug(PageEntity page) {
        return stripAccents(page.name()).toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    /** The page's class name, accent-free ("página 3" → "Pagina3Page"). */
    private String pageClassName(PageEntity page) {
        return capitalize(stripAccents(page.name()).replaceAll("[^a-zA-Z0-9]", "")) + "Page";
    }

    /** A Java field name out of a human label ("Entrada 2" → "entrada2") — mateu humanizes it back. */
    private static String fieldNameFromLabel(String label, String fallback) {
        var base = stripAccents(label == null ? "" : label).replaceAll("[^a-zA-Z0-9 ]", "").trim();
        if (base.isEmpty()) return fallback;
        var parts = base.split("\\s+");
        var sb = new StringBuilder(parts[0].toLowerCase());
        for (var i = 1; i < parts.length; i++) {
            sb.append(parts[i].substring(0, 1).toUpperCase()).append(parts[i].substring(1).toLowerCase());
        }
        var name = sb.toString();
        return Character.isJavaIdentifierStart(name.charAt(0)) ? name : "m" + name;
    }

    /**
     * The menu field names the CRUD's route. Two routes are taken: the aggregate's REST path (a
     * reload or a direct visit would get the REST listing's JSON) and the path of the app itself
     * (a federating shell strips it and opens the app's home, so the CRUD would be unreachable).
     */
    private String crudMenuField(String label, AggregateEntity aggregate, UiAdapterEntity adapter) {
        var field = fieldNameFromLabel(label, aggregate.name().toLowerCase() + "Crud");
        var restPath = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold.CrudApi
                .pathSegment(aggregate.name(), aggregate.id());
        if (field.equalsIgnoreCase(restPath)) field = field + "s";
        var appPath = appPathOf(adapter);
        if (appPath != null && field.equalsIgnoreCase(appPath.replaceAll("^/+|/+$", "").replaceAll("[^a-zA-Z0-9]", ""))) {
            field = field + "List";
        }
        return field;
    }

    /** The path a federating shell mounts the app at (see generateUiShell): the modelled one, or the service's slug. */
    private String appPathOf(UiAdapterEntity adapter) {
        if (adapter == null) return null;
        if (adapter.path() != null && !adapter.path().isBlank()) return adapter.path();
        if (adapter.serviceId() == null) return null;
        return repository.findById(adapter.serviceId(), ServiceEntity.class)
                .map(s -> "/" + s.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"))
                .orElse(null);
    }

    /** Where the CRUD lives: the app menu entry that opens it, or else the module menu's plural. */
    private String crudRouteOf(AggregateEntity aggregate) {
        return "/" + repository.findAllOfType(UiAdapterEntity.class).stream()
                .flatMap(adapter -> flattenMenu(adapter.menuItems()).stream()
                        .filter(item -> aggregate.id().equals(item.aggregateId()))
                        .map(item -> crudMenuField(item.label(), aggregate, adapter)))
                .findFirst()
                .orElse(aggregate.name().toLowerCase() + "s");
    }

    /** The app's menu tree flattened, document order. */
    private List<UiMenuItemEntity> flattenMenu(List<UiMenuItemEntity> items) {
        if (items == null) return List.of();
        return items.stream()
                .flatMap(it -> java.util.stream.Stream.concat(
                        java.util.stream.Stream.of(it), flattenMenu(it.children()).stream()))
                .toList();
    }

    /** Every pageId referenced anywhere in an app's menu tree. */
    private java.util.stream.Stream<String> menuPageIds(List<UiMenuItemEntity> items) {
        if (items == null) return java.util.stream.Stream.empty();
        return items.stream().flatMap(it -> java.util.stream.Stream.concat(
                it.pageId() == null || it.pageId().isBlank()
                        ? java.util.stream.Stream.empty() : java.util.stream.Stream.of(it.pageId()),
                menuPageIds(it.children())));
    }

    /** The gateway route of an app (same slug as gateway-yaml): {@code /organizacion} → {@code /_organizacion}. */
    static String appRoute(String appPath) {
        return "/_" + appPath.replaceFirst("^/", "").replaceAll("[^a-z0-9-]", "");
    }

    /** The apps of a service, in a stable order (by name). */
    private List<UiAdapterEntity> adaptersOf(ServiceEntity service) {
        return repository.findAllOfType(UiAdapterEntity.class).stream()
                .filter(a -> service.id().equals(a.serviceId()))
                .sorted(java.util.Comparator.comparing(UiAdapterEntity::name, java.util.Comparator.nullsLast(String::compareTo)))
                .toList();
    }

    /** {@code Home} for the service's first app, {@code {App}Home} for the others. */
    private String homeClassOf(ServiceEntity service, UiAdapterEntity adapter) {
        var adapters = adaptersOf(service);
        if (adapters.isEmpty() || adapters.get(0).id().equals(adapter.id())) return "Home";
        return toTypeName(adapter.name()) + "Home";
    }

    private void generateUiAdapter(ProjectEntity project, ServiceEntity service, String serviceDir, UiAdapterEntity adapter) {
        var serviceName = serviceName(service);
        var appDir = serviceDir + "/" + serviceName + "-app";
        var packageDir = project.packageName().replace(".", "/");

        createDir(appDir, "src/main/java/" + packageDir + "/infra/in/ui");

        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));
        model.put("adapter", fromJson(toJson(adapter)));
        idpFor(project).ifPresent(idp -> model.put("idp", idp));

        // The declared UI this app REALIZES lends @UI its parameters (path wins over
        // the adapter's own; indexHtmlPath/frontendComponentPath only live on the UI).
        var realizedUi = repository.findAllOfType(UiEntity.class).stream()
                .filter(u -> u.appIds() != null && u.appIds().contains(adapter.id()))
                .findFirst()
                .orElse(null);
        if (realizedUi != null) {
            model.put("ui", fromJson(toJson(realizedUi)));
            // Menu entries pointing at PAGES resolve to the page classes generated
            // with the UI's context (aggregate-slug entries keep their own path).
            var unitName = deployedUnits(service).stream()
                    .filter(unit -> unit.id().equals(realizedUi.boundedContextId()))
                    .map(BoundedContextEntity::name)
                    .findFirst().orElse(null);
            if (unitName != null) {
                var moduleSlug = boundedContextSlug(unitName);
                // The app's declared home page opens on entry: first menu entry, selected.
                java.util.Optional.ofNullable(adapter.homePageId())
                        .flatMap(hid -> repository.findById(hid, PageEntity.class))
                        .ifPresent(pg -> model.put("homePage", Map.of(
                                "className", pageClassName(pg),
                                "field", fieldNameFromLabel(
                                        pg.title() != null && !pg.title().isBlank() ? pg.title() : pg.name(),
                                        pageSlug(pg) + "Page"),
                                "moduleSlug", moduleSlug,
                                "pageSlug", pageSlug(pg))));
                model.put("menuPages", flattenMenu(adapter.menuItems()).stream()
                        .filter(it -> it.pageId() != null && !it.pageId().isBlank())
                        .map(it -> Map.entry(it, repository.findById(it.pageId(), PageEntity.class).orElse(null)))
                        .filter(e -> e.getValue() != null)
                        .map(e -> Map.of(
                                "label", e.getKey().label() != null ? e.getKey().label() : e.getValue().name(),
                                "className", pageClassName(e.getValue()),
                                "field", fieldNameFromLabel(e.getKey().label(), pageSlug(e.getValue()) + "Page"),
                                "moduleSlug", moduleSlug,
                                "pageSlug", pageSlug(e.getValue())))
                        .toList());
            }
        }

        // Menu entries targeting an AGGREGATE open its CRUD (what the app → aggregate gesture writes).
        model.put("menuCruds", flattenMenu(adapter.menuItems()).stream()
                .filter(it -> it.aggregateId() != null && !it.aggregateId().isBlank()
                        && (it.pageId() == null || it.pageId().isBlank())
                        && (it.route() == null || it.route().isBlank()))
                .map(it -> {
                    var aggregate = repository.findById(it.aggregateId(), AggregateEntity.class).orElse(null);
                    var unit = deployedUnits(service).stream()
                            .filter(u -> u.aggregateIds() != null && u.aggregateIds().contains(it.aggregateId()))
                            .findFirst().orElse(null);
                    if (aggregate == null || unit == null) return null;
                    return Map.of(
                            "name", aggregate.name(),
                            "slug", aggregate.name().toLowerCase(),
                            "moduleSlug", boundedContextSlug(unit.name()),
                            "label", it.label() != null ? it.label() : "",
                            "field", crudMenuField(it.label(), aggregate, adapter));
                })
                .filter(java.util.Objects::nonNull)
                .toList());

        // Menu entries pointing at USE CASES resolve to their exposed UI pages
        // (aggregate-slug entries keep their own path; pageId entries use menuPages).
        model.put("menuUseCases", flattenMenu(adapter.menuItems()).stream()
                .filter(it -> it.useCaseId() != null && !it.useCaseId().isBlank())
                .map(it -> Map.entry(it, repository.findById(it.useCaseId(), UseCaseEntity.class).orElse(null)))
                .filter(e -> e.getValue() != null && e.getValue().exposedAsUi())
                .map(e -> {
                    var item = e.getKey();
                    var uc = e.getValue();
                    var moduleSlug = deployedUnits(service).stream()
                            .filter(unit -> unit.useCaseIds() != null && unit.useCaseIds().contains(uc.id()))
                            .filter(unit -> crudTrioOf(unit, uc) == null)
                            .findFirst()
                            .map(unit -> boundedContextSlug(unit.name()))
                            .orElse(null);
                    if (moduleSlug == null) return null;
                    var ucSlug = uc.name().toLowerCase().replaceAll("[^a-z0-9]", "");
                    return Map.of(
                            "label", item.label() != null ? item.label() : uc.name(),
                            "className", toTypeName(uc.name()) + "Page",
                            "roles", uc.allowedRoles() != null ? uc.allowedRoles() : List.<String>of(),
                            "field", fieldNameFromLabel(item.label(), ucSlug + "Page"),
                            "moduleSlug", moduleSlug,
                            "pageSlug", ucSlug);
                })
                .filter(java.util.Objects::nonNull)
                .toList());

        // Menu entries pointing at a query: a read-only listing of its read model
        model.put("menuListings", flattenMenu(adapter.menuItems()).stream()
                .map(item -> readModelOfMenuItem(item).map(rm -> {
                    var unit = deployedUnits(service).stream()
                            .filter(u -> u.readModelIds() != null && u.readModelIds().contains(rm.id()))
                            .findFirst().orElse(null);
                    if (unit == null) return null;
                    var className = toTypeName(rm.name()).replaceAll("ReadModel$", "");
                    var moduleSlug = boundedContextSlug(unit.name());
                    Map<String, Object> listing = new HashMap<>();
                    listing.put("className", className + "Listing");
                    listing.put("moduleSlug", moduleSlug);
                    listing.put("slug", className.toLowerCase());
                    listing.put("label", item.label() != null ? item.label() : rm.name());
                    listing.put("field", fieldNameFromLabel(item.label(), className.toLowerCase()));
                    var listingModel = buildBaseModel(project, service, unit);
                    listingModel.put("className", className);
                    listingModel.put("title", listing.get("label"));
                    // the row the listing shows: the model's labels, money with its two decimals
                    var rmFields = rm.modelId() == null ? List.<ModelFieldEntity>of()
                            : repository.findById(rm.modelId(), ModelEntity.class)
                                    .map(m -> m.fields() == null ? List.<ModelFieldEntity>of() : m.fields()).orElse(List.of());
                    listingModel.put("rowFields", rmFields.stream().map(f -> {
                        Map<String, Object> rf = new HashMap<>();
                        rf.put("name", f.name());
                        rf.put("label", f.label() != null && !f.label().isBlank() ? f.label() : humanize(f.name()));
                        rf.put("accessor", f.basicType() ? f.name() : f.name() + "Id");
                        rf.put("money", f.basicType() && f.type() != null
                                && ("money".equals(f.type().name()) || "number".equals(f.type().name())));
                        return rf;
                    }).toList());
                    queryOperationOfMenuItem(item).ifPresent(op -> {
                        if (op.filter() != null && !op.filter().isBlank()) listingModel.put("filters", filtersOf(op.filter(), rmFields));
                        if (op.groupBy() != null && !op.groupBy().isBlank())
                            listingModel.put("grouping", groupingOf(project, service, rm, op.groupBy(), rmFields));
                    });
                    var unitDir = serviceDir + "/" + boundedContextSlug(unit.name());
                    var pagesDir = "src/main/java/" + packageDir + "/" + moduleSlug + "/infra/in/ui/pages/" + className.toLowerCase();
                    createDir(unitDir, pagesDir);
                    createFile(unitDir, listingModel, "readmodel-listing.ftl", pagesDir + "/" + className + "Listing.java");
                    return listing;
                }).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList());

        // An event-sourced aggregate in the menu brings its history: what happened to each one, in order
        var histories = new java.util.ArrayList<Map<String, Object>>();
        for (var it : flattenMenu(adapter.menuItems())) {
            if (it.aggregateId() == null || it.aggregateId().isBlank()) continue;
            var aggregate = repository.findById(it.aggregateId(), AggregateEntity.class).orElse(null);
            if (aggregate == null || !isEventSourced(aggregate)) continue;
            var unit = deployedUnits(service).stream()
                    .filter(u -> u.aggregateIds() != null && u.aggregateIds().contains(aggregate.id()))
                    .findFirst().orElse(null);
            if (unit == null) continue;
            var className = aggregate.name() + "HistoryListing";
            var slug = aggregate.name().toLowerCase() + "historial";
            var moduleSlug = boundedContextSlug(unit.name());
            var shown = it.label() != null && !it.label().isBlank() ? it.label() : aggregate.name();
            var label = speaksSpanish(project) ? "Historial de " + shown.toLowerCase() : aggregate.name() + " history";
            var historyModel = buildBaseModel(project, service, unit);
            historyModel.put("className", className);
            historyModel.put("aggregateName", aggregate.name());
            historyModel.put("moduleSlug", moduleSlug);
            historyModel.put("slug", slug);
            historyModel.put("title", label);
            var unitDir = serviceDir + "/" + boundedContextSlug(unit.name());
            var pagesDir = "src/main/java/" + packageDir + "/" + moduleSlug + "/infra/in/ui/pages/" + slug;
            createDir(unitDir, pagesDir);
            createFile(unitDir, historyModel, "es-history-listing.ftl", pagesDir + "/" + className + ".java");
            Map<String, Object> listing = new HashMap<>();
            listing.put("className", className);
            listing.put("moduleSlug", moduleSlug);
            listing.put("slug", slug);
            listing.put("label", label);
            listing.put("field", slug);
            histories.add(listing);
        }
        if (!histories.isEmpty()) {
            @SuppressWarnings("unchecked")
            var all = new java.util.ArrayList<>((List<Map<String, Object>>) model.get("menuListings"));
            all.addAll(histories);
            model.put("menuListings", all);
        }

        // Overwrite Home.java with UIAdapter-driven version. A service may hold several apps: the
        // first keeps Home.java (it replaces the service's default home), each other one gets its
        // own class, so no app overwrites another.
        var homeClass = homeClassOf(service, adapter);
        model.put("homeClassName", homeClass);
        createFile(appDir, model, "ui-adapter-home.ftl",
                "src/main/java/" + packageDir + "/infra/in/ui/" + homeClass + ".java");
    }

    // ─── Docker Compose ───────────────────────────────────────────────────────

    private void generateDockerCompose(ProjectEntity project) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));

        // Gateway base URLs inside the compose network: the model's baseUrl points at
        // localhost (the local-run default), so a "http://localhost:<port>" that matches a
        // sibling service's port is rewritten to that service's compose hostname and
        // injected as the gateway's base-url property.
        var services = effectiveServices(project);
        var gatewayEnvs = outboundGatewayEnvs(services);
        model.put("gatewayEnvs", gatewayEnvs);
        var composeServiceIds = services.stream().map(ServiceEntity::id).collect(java.util.stream.Collectors.toSet());
        model.put("composeShells", repository.findAllOfType(UiShellEntity.class).stream()
                .filter(sh -> sh.serviceIds() != null && sh.serviceIds().stream().anyMatch(composeServiceIds::contains))
                .map(sh -> sh.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"))
                .toList());

        // where the external systems answer: from the host (host.docker.internal) unless the
        // environment says otherwise — the partner is not part of the compose network
        model.put("externalUrls", externalUrls(project).stream().map(e -> Map.of(
                "envName", e.getKey(),
                "url", e.getValue().replaceFirst("//(localhost|127\\.0\\.0\\.1)([:/]|$)", "//host.docker.internal$2"))).toList());
        model.put("externalJdbcEnvs", externalJdbcEnvs());
        // a local keycloak runs in the compose too, with the realm up.sh generation writes
        idpFor(project).filter(GenerateCodeUseCase::isLocalIdp).ifPresent(i -> model.put("localIdp", i));
        model.put("mail", mailEnabled(project));
        // the roles some email notification goes to: whose addresses the services read (NOTIFY_<ROLE>)
        model.put("notifyRoles", services.stream().flatMap(svc -> emailNotifications(project, svc).stream())
                .flatMap(n -> ((List<?>) n.getOrDefault("roles", List.of())).stream()).map(String::valueOf)
                .map(r -> r.toUpperCase().replaceAll("[^A-Z0-9]", "_")).distinct().sorted().toList());
        var procesos = generateWorkflowRuntime(project);
        if (procesos != null) model.put("procesos", procesos);
        createFile(project.outputPath(), model, "docker-compose.ftl", "docker-compose.yml");
        createDir(project.outputPath(), "postgres-init");
        createFile(project.outputPath(), model, "postgres-init.ftl",
                "postgres-init/create-databases.sql");
    }

    /** The version of EventConductor's orchestrator the generated system runs (overridable: EC_ORCHESTRATOR_IMAGE). */
    static final String EVENTCONDUCTOR_IMAGE = "miguelperezcolom/orchestrator-standalone-app:2.38.1";
    /** Its forms app: the human tasks' forms and the worklist (overridable: EC_FORMS_IMAGE). */
    static final String EVENTCONDUCTOR_FORMS_IMAGE = "miguelperezcolom/forms-standalone-app:2.38.1";

    /**
     * The runtime of the model's workflows: EventConductor's orchestrator, as is, with what the
     * model says mounted into it — the definitions ({@code procesos/workflows}, imported at start)
     * and its configuration ({@code procesos/config/application.yaml}): the topic of every event a
     * workflow starts on or waits for, and a connection to every service whose use cases its
     * steps run, authenticated as the system identity. Null when the model has no workflow.
     */
    private Map<String, Object> generateWorkflowRuntime(ProjectEntity project) {
        var workflows = repository.findAllOfType(WorkflowEntity.class).stream()
                .filter(workflow -> inScope(workflow.id()))
                .filter(workflow -> homeContextOf(workflow) != null)
                .toList();
        if (workflows.isEmpty()) return null;

        var connections = new java.util.TreeMap<String, Map<String, Object>>();
        var destinations = new java.util.TreeMap<String, String>();
        var humanTasks = false;
        var mounted = new StringBuilder();   // what the engine reads from disk, to tell a change
        var runtime = new io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                .EventConductorWorkflowDefinition.Runtime(
                useCaseId -> {
                    var useCase = repository.findById(useCaseId, UseCaseEntity.class).orElse(null);
                    var service = useCase == null ? null : serviceOfUseCase(useCaseId);
                    if (service == null) return null;
                    var slug = serviceName(service).replaceAll("[^a-z0-9-]", "-");
                    var port = service.port() != null ? service.port() : 8080;
                    connections.put(slug, Map.of("name", slug,
                            "envName", slug.toUpperCase().replace("-", "_") + "_URL",
                            "url", "http://" + slug + ":" + port));
                    var apiVersion = useCase.apiVersion() != null && !useCase.apiVersion().isBlank() ? useCase.apiVersion() : "v1";
                    if (!apiVersion.startsWith("v")) apiVersion = "v" + apiVersion;
                    var path = useCase.restPath() != null && !useCase.restPath().isBlank() ? useCase.restPath()
                            : "/" + useCase.name().toLowerCase().replaceAll("[^a-z0-9]", "-");
                    var fields = useCase.inputModelId() == null || useCase.inputModelId().isBlank() ? List.of("id")
                            : fieldsOf(useCase.inputModelId()).stream().map(ModelFieldEntity::name).toList();
                    var outputs = useCase.outputModelId() == null || useCase.outputModelId().isBlank() ? List.<String>of()
                            : fieldsOf(useCase.outputModelId()).stream().map(ModelFieldEntity::name).toList();
                    return new io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                            .EventConductorWorkflowDefinition.UseCaseCall(slug, "/" + apiVersion + path, fields, outputs);
                },
                eventName -> eventNamed(eventName)
                        .map(e -> fieldsOf(e.modelId()).stream().map(ModelFieldEntity::name).toList())
                        .orElse(List.of()),
                roleId -> repository.findById(roleId, RoleEntity.class).map(RoleEntity::name).orElse(roleId));

        createDir(project.outputPath(), "procesos/workflows");
        for (var workflow : workflows) {
            var gateways = repository.findAllOfType(WorkflowGatewayEntity.class).stream()
                    .filter(g -> workflow.id().equals(workflowGraph.workflowOf(g.id()).orElse(null)))
                    .toList();
            var definition = io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                    .EventConductorWorkflowDefinition.runnable(workflow, gateways, this::formIdOfPage,
                            io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                                    .EventConductorWorkflowDefinition.topicPrefix(project.name(), workflow.name()),
                            runtime);
            // every event it starts on or waits for, on the topic its publisher sends it to
            var events = new java.util.ArrayList<String>();
            if (workflow.triggerEvent() != null) events.add(workflow.triggerEvent());
            if (workflow.steps() != null) workflow.steps().stream()
                    .filter(st -> st.completionEventName() != null && st.targetUseCaseId() == null && st.roleId() == null)
                    .forEach(st -> events.add(st.completionEventName()));
            for (var event : events) {
                var topic = eventNamed(event).map(DomainEventEntity::topicName).filter(t -> t != null && !t.isBlank())
                        .or(() -> serviceEmitting(event).map(sv -> io.mateu.modux.modeldrivengenerator.application
                                .usecases.flow.expand.FlowExpander.topicOf(project.name(), sv.name(), event)));
                if (topic.isPresent()) {
                    destinations.put(io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                            .EventConductorWorkflowDefinition.destinationOf(event), topic.get());
                } else {
                    log.warn("workflow '{}' waits for event '{}', which is not published to any topic: publish it"
                            + " (a flow that emits it, or publishAsIntegrationEvent)", workflow.name(), event);
                }
            }
            Map<String, Object> model = new HashMap<>();
            model.put("definition", toPrettyJson(definition));
            mounted.append(model.get("definition"));
            createFile(project.outputPath(), model, "workflow-definition-json.ftl",
                    "procesos/workflows/" + capitalize(workflow.name()) + ".workflow.json");
            // the forms of its human steps, for the forms app the worklist lives in
            if (workflow.steps() != null) {
                for (var st : workflow.steps()) {
                    if (st.roleId() == null || st.formPageId() == null) continue;
                    var page = repository.findById(st.formPageId(), PageEntity.class).orElse(null);
                    if (page == null) continue;
                    createDir(project.outputPath(), "procesos/forms");
                    mounted.append(toPrettyJson(formDefinitionOf(page)));
                    createFile(project.outputPath(), Map.of("definition", toPrettyJson(formDefinitionOf(page))),
                            "workflow-definition-json.ftl", "procesos/forms/"
                                    + capitalize(page.name().replaceAll("[^a-zA-Z0-9]", "")) + ".form.json");
                    humanTasks = true;
                }
            }
        }

        Map<String, Object> runtimeModel = new HashMap<>();
        runtimeModel.put("project", projectToMap(project));
        runtimeModel.put("connections", List.copyOf(connections.values()));
        runtimeModel.put("destinations", destinations.entrySet().stream()
                .map(e -> Map.of("name", e.getKey(), "topic", e.getValue())).toList());
        createDir(project.outputPath(), "procesos/config");
        createFile(project.outputPath(), runtimeModel, "procesos-config.ftl", "procesos/config/application.yaml");
        runtimeModel.put("image", EVENTCONDUCTOR_IMAGE);
        // the definitions are mounted files: a change to them would not restart the engine, so the
        // compose carries their hash and a different one recreates the container
        mounted.append(toPrettyJson(runtimeModel.get("connections"))).append(toPrettyJson(runtimeModel.get("destinations")));
        runtimeModel.put("definitionsHash", sha256(mounted.toString()).substring(0, 16));
        if (humanTasks) runtimeModel.put("formsImage", EVENTCONDUCTOR_FORMS_IMAGE);
        return runtimeModel;
    }

    /** The service whose context declares the event (and so publishes it). */
    private java.util.Optional<ServiceEntity> serviceEmitting(String eventName) {
        for (var sv : repository.findAllOfType(ServiceEntity.class)) {
            for (var bc : deployedUnits(sv)) {
                if (bc.domainEventIds() != null && bc.domainEventIds().stream()
                        .map(id -> repository.findById(id, DomainEventEntity.class).orElse(null))
                        .anyMatch(e -> e != null && eventName.equals(e.name()))) {
                    return java.util.Optional.of(sv);
                }
            }
        }
        return java.util.Optional.empty();
    }

    private static String sha256(String text) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256").digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Whether a workflow has a person's task: then the system runs the forms app and its worklist. */
    private boolean hasHumanTasks() {
        return repository.findAllOfType(WorkflowEntity.class).stream()
                .filter(workflow -> inScope(workflow.id()))
                .filter(workflow -> homeContextOf(workflow) != null)
                .flatMap(wf -> wf.steps() == null ? java.util.stream.Stream.<WorkflowStepEntity>empty() : wf.steps().stream())
                .anyMatch(st -> st.roleId() != null && st.formPageId() != null);
    }

    /** The domain event with that name: the materialized one (with its topic) when there are several. */
    /**
     * An event a workflow starts on or waits for leaves its service: the workflow engine is another
     * process. So it travels as an integration event — by the publisher that writes to the topic the
     * engine (and any notification of it) listens on — unless the model already says so. Transient:
     * the store is reloaded after generation.
     */
    private void materializeWorkflowEvents() {
        var project = repository.findAllOfType(ProjectEntity.class).stream().findFirst().orElse(null);
        if (project == null) return;
        var names = new java.util.LinkedHashSet<String>();
        for (var workflow : repository.findAllOfType(WorkflowEntity.class)) {
            if (workflow.triggerEvent() != null && !workflow.triggerEvent().isBlank()) names.add(workflow.triggerEvent());
            if (workflow.steps() != null) workflow.steps().stream()
                    .filter(st -> st.completionEventName() != null && st.targetUseCaseId() == null && st.roleId() == null)
                    .forEach(st -> names.add(st.completionEventName()));
        }
        for (var name : names) {
            if (repository.findAllOfType(IntegrationEventEntity.class).stream().anyMatch(ie -> name.equals(ie.name()))) continue;
            var event = eventNamed(name).orElse(null);
            var service = serviceEmitting(name).orElse(null);
            if (event == null || service == null) continue;
            var boundedContext = repository.findAllOfType(BoundedContextEntity.class).stream()
                    .filter(bc -> bc.domainEventIds() != null && bc.domainEventIds().contains(event.id()))
                    .findFirst().orElse(null);
            if (boundedContext == null) continue;
            var topic = event.topicName() != null && !event.topicName().isBlank() ? event.topicName()
                    : io.mateu.modux.modeldrivengenerator.application.usecases.flow.expand.FlowExpander
                            .topicOf(project.name(), service.name(), name);
            repository.putTransient(new IntegrationEventEntity("ie-wf-" + event.id(), name, boundedContext.id(), null,
                    event.id(), event.modelId(), topic, null, null,
                    io.mateu.modux.modeldrivengenerator.domain.aggregates.integrationevent.vo.IntegrationEventSerializationFormat.JSON,
                    io.mateu.modux.modeldrivengenerator.domain.aggregates.integrationevent.vo.IntegrationEventCompressionType.NONE,
                    true, topic + ".dlq", 5, "v1", null, true, null));
        }
    }

    private java.util.Optional<DomainEventEntity> eventNamed(String name) {
        return repository.findAllOfType(DomainEventEntity.class).stream()
                .filter(e -> name.equals(e.name()))
                .sorted(java.util.Comparator.comparing((DomainEventEntity e) -> e.topicName() == null || e.topicName().isBlank()))
                .findFirst();
    }

    private void generateCiWorkflow(ProjectEntity project) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        createFile(project.outputPath(), model, "ci-workflow.ftl", ".github/workflows/ci.yml");
    }

    private void generateTerraform(ProjectEntity project) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        // The declared URLs become DNS records (Cloudflare) pointing at the cluster ingress.
        model.put("dnsRecords", effectiveServices(project).stream()
                .flatMap(sv -> ingressUrls(sv).stream())
                .map(u -> u.get("host"))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList());
        createFile(project.outputPath(), model, "terraform-main.ftl", "terraform/main.tf");
    }

    /**
     * The e2e module: a Playwright suite that drives the generated apps AS A USER —
     * form login with the scaffold credentials (the in-memory users are roleId/roleId),
     * opens every exposed use-case page from its menu entry, fills its form with
     * type-appropriate sample values and submits it, and opens every CRUD listing.
     * Everything (credentials, menus, pages, fields, types) comes from the model.
     */
    private void generateE2e(ProjectEntity project) {
        var services = effectiveServices(project);
        var serviceIds = services.stream().map(ServiceEntity::id).collect(java.util.stream.Collectors.toSet());
        var roles = repository.findAllOfType(RoleEntity.class);
        var apps = repository.findAllOfType(UiAdapterEntity.class).stream()
                .filter(a -> a.serviceId() != null && serviceIds.contains(a.serviceId()))
                .map(a -> {
                    var service = services.stream().filter(s -> s.id().equals(a.serviceId())).findFirst().orElseThrow();
                    var role = roles.stream()
                            .filter(r -> r.uiAdapterIds() != null && r.uiAdapterIds().contains(a.id()))
                            .findFirst()
                            .orElse(roles.stream().findFirst().orElse(null));
                    var useCasePages = new java.util.ArrayList<Map<String, Object>>();
                    var crudLabels = new java.util.ArrayList<String>();
                    for (var item : flattenMenu(a.menuItems())) {
                        if (item.useCaseId() != null && !item.useCaseId().isBlank()) {
                            repository.findById(item.useCaseId(), UseCaseEntity.class)
                                    .filter(uc -> uc.exposedAsUi())
                                    .ifPresent(uc -> {
                                        var fields = new java.util.ArrayList<Map<String, Object>>();
                                        if (uc.inputModelId() != null && !uc.inputModelId().isBlank()) {
                                            var inputModel = repository.findById(uc.inputModelId(), ModelEntity.class).orElse(null);
                                            if (inputModel != null && inputModel.fields() != null) {
                                                var fieldIndex = new java.util.concurrent.atomic.AtomicInteger();
                                                inputModel.fields().stream().filter(ModelFieldEntity::basicType)
                                                        .forEach(f -> fields.add(Map.of(
                                                                "name", f.name(),
                                                                "label", f.label() != null && !f.label().isBlank() ? f.label() : f.name(),
                                                                "type", mapFieldDataType(f.type()),
                                                                "sample", e2eSampleValue(mapFieldDataType(f.type()),
                                                                        fieldIndex.getAndIncrement()))));
                                            }
                                        }
                                        useCasePages.add(Map.of(
                                                // Same label the rendered menu shows: the Home's menu field
                                                // name comes from fieldNameFromLabel(item.label) and Mateu
                                                // humanizes it (parentheses and symbols do not survive).
                                                "menuLabel", humanizeUcName(fieldNameFromLabel(
                                                        item.label() != null ? item.label() : uc.name(), "")),
                                                "title", uc.title() != null && !uc.title().isBlank() ? uc.title() : uc.name(),
                                                "buttonLabel", humanizeUcName(uc.name()),
                                                // Same fallback as usecase-page.ftl's success Message
                                                // (${usecase.title!usecase.className}: hecho) — the e2e waits for
                                                // exactly that text, so a backend failure turns the test RED.
                                                "successMessage",
                                                    (uc.title() != null && !uc.title().isBlank() ? uc.title() : toTypeName(uc.name()))
                                                        + ": hecho",
                                                "methodName", toTypeName(uc.name()).substring(0, 1).toLowerCase()
                                                        + toTypeName(uc.name()).substring(1),
                                                "fields", fields));
                                    });
                        } else if (item.aggregateId() != null && !item.aggregateId().isBlank() && item.label() != null) {
                            crudLabels.add(item.label());
                        }
                    }
                    return (Object) Map.of(
                            "name", serviceName(service),
                            "title", a.title() != null && !a.title().isBlank() ? a.title() : a.name(),
                            "path", a.path() != null && !a.path().isBlank() ? a.path() : "/",
                            "port", service.port() != null ? service.port() : 8080,
                            "username", role != null ? role.id() : "operador",
                            "password", role != null ? role.id() : "operador",
                            "useCasePages", useCasePages,
                            "crudLabels", crudLabels);
                })
                .toList();
        if (apps.isEmpty()) return;
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("apps", apps);
        idpFor(project).ifPresent(idp -> model.put("idp", idp));
        model.put("shells", repository.findAllOfType(UiShellEntity.class).stream()
                .filter(sh -> sh.serviceIds() != null && sh.serviceIds().stream().anyMatch(serviceIds::contains))
                .map(sh -> Map.of(
                        "slug", sh.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"),
                        "title", sh.title() != null && !sh.title().isBlank() ? sh.title() : sh.name()))
                .toList());
        var e2eDir = project.outputPath() + "/e2e";
        createDir(e2eDir, "src/test/java/e2e");
        createFile(e2eDir, model, "e2e-suite-pom.ftl", "pom.xml");
        createFile(e2eDir, model, "e2e-suite-base.ftl", "src/test/java/e2e/BaseE2eTest.java");
        createFile(e2eDir, model, "e2e-suite-apps.ftl", "src/test/java/e2e/AppsE2eTest.java");
    }

    /** A deterministic sample value for an e2e form field, by its resolved primitive type.
     * The index spreads same-type fields (two dates in a form must not collide: a checkout
     * needs to come after the check-in). */
    private String e2eSampleValue(String primitiveType, int fieldIndex) {
        return switch (primitiveType == null ? "string" : primitiveType) {
            case "integer" -> String.valueOf(1 + fieldIndex);
            case "decimal" -> "12.5";
            case "bool" -> "true";
            // the vaadin date inputs parse the US-locale short format
            case "date" -> "8/" + (10 + fieldIndex) + "/2026";
            case "time" -> "10:30";
            case "datetime" -> "2026-01-01T10:30";
            case "email" -> "e2e@example.com";
            case "url" -> "https://example.com";
            default -> "texto-e2e";
        };
    }

    /** The button caption Mateu shows for a use case: its name humanized (camelCase → spaces). */
    private String humanizeUcName(String name) {
        if (name == null || name.isBlank()) return name;
        var spaced = name.replaceAll("([a-záéíóúñ0-9])([A-ZÁÉÍÓÚÑ])", "$1 $2");
        return spaced.substring(0, 1).toUpperCase() + spaced.substring(1);
    }

    /**
     * up.sh / down.sh: the generated system's local run loop — infra (postgres with the
     * per-service databases, kafka with the listeners the generated defaults expect,
     * keycloak when a uiShell exists) plus every service and shell, all on the model's
     * declared ports with zero overrides. Idempotent by construction.
     */
    /**
     * The base URL each service's outbound gateways get in a container network: a gateway aimed at
     * localhost:{port} of another service of the system goes to that service by name. Service
     * name → its MODUX_GATEWAY_*_BASEURL variables.
     */
    private Map<String, List<Map<String, String>>> outboundGatewayEnvs(List<ServiceEntity> services) {
        var gatewayEnvs = new HashMap<String, List<Map<String, String>>>();
        for (var svc : services) {
            var list = new java.util.ArrayList<Map<String, String>>();
            for (var gwId : svc.gatewayIds() != null ? svc.gatewayIds() : List.<String>of()) {
                var gw = repository.findById(gwId, GatewayEntity.class).orElse(null);
                if (gw == null) {
                    continue;
                }
                var url = gw.baseUrl() != null ? gw.baseUrl().trim() : "";
                var matcher = java.util.regex.Pattern.compile("^https?://localhost:(\\d+)$").matcher(url);
                if (matcher.matches()) {
                    var port = Integer.parseInt(matcher.group(1));
                    var target = services.stream()
                            .filter(s -> s.port() != null && s.port() == port)
                            .findFirst();
                    if (target.isPresent()) {
                        url = "http://" + serviceName(target.get()) + ":" + port;
                    }
                }
                list.add(Map.of(
                        "envName", "MODUX_GATEWAY_" + gw.name().toUpperCase().replaceAll("[^A-Z0-9]", "") + "_BASEURL",
                        "url", url));
            }
            if (!list.isEmpty()) {
                gatewayEnvs.put(svc.name(), list);
            }
        }
        return gatewayEnvs;
    }

    /**
     * What `mvn modux:deploy` needs: an image per runnable (services, API gateway, shells) and, per
     * environment of the model that runs on Kubernetes, its complete manifest
     * ({@code deploy/k8s/{env}.yaml}: Postgres and Kafka in the namespace, the runnables, probes and
     * an Ingress for its URLs). {@code deploy/targets.json} tells the plugin what to build, where
     * to send it and which hosts to point the DNS at. The local Docker target is the compose file.
     */
    @SneakyThrows
    private void generateDeployment(ProjectEntity project) {
        var projectSlug = project.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
        var services = effectiveServices(project);
        var serviceIds = services.stream().map(ServiceEntity::id).collect(java.util.stream.Collectors.toSet());
        var shells = repository.findAllOfType(UiShellEntity.class).stream()
                .filter(sh -> sh.serviceIds() != null && sh.serviceIds().stream().anyMatch(serviceIds::contains))
                .toList();
        var deployment = repository.findById(DeploymentEntity.idFor(project.id()), DeploymentEntity.class).orElse(null);

        // the runnables, each one an image built from its own directory
        var runnables = new ArrayList<Map<String, Object>>();
        for (var sv : services) {
            var slug = serviceName(sv).toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
            Map<String, Object> r = new HashMap<>();
            r.put("name", slug);
            r.put("dir", serviceName(sv));
            r.put("port", sv.port() != null ? sv.port() : 8080);
            r.put("kind", "service");
            r.put("db", sv.name().toLowerCase().replace(" ", "_"));
            r.put("serviceId", sv.id());
            r.put("gatewayEnvs", outboundGatewayEnvs(services).getOrDefault(sv.name(), List.of()));
            runnables.add(r);
        }
        if (!shells.isEmpty()) {
            runnables.add(new HashMap<>(Map.of("name", "gateway", "dir", "gateway", "port", 8088, "kind", "gateway")));
            for (var sh : shells) {
                var slug = sh.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
                runnables.add(new HashMap<>(Map.of("name", slug, "dir", slug, "port", 8100, "kind", "shell", "shellId", sh.id())));
                Map<String, Object> m = new HashMap<>();
                m.put("jar", "target/*.jar");
                m.put("title", sh.name());
                createFile(project.outputPath() + "/" + slug, m, "runnable-dockerfile.ftl", "Dockerfile");
            }
            Map<String, Object> m = new HashMap<>();
            m.put("jar", "target/*.jar");
            m.put("title", "API gateway");
            createFile(project.outputPath() + "/gateway", m, "runnable-dockerfile.ftl", "Dockerfile");
        }

        var targets = new ArrayList<Map<String, Object>>();
        // the local Docker target is always there: the compose file next to up.sh
        targets.add(new HashMap<>(Map.of("name", "local", "target", "DOCKER", "compose", "docker-compose.yml")));
        var environments = deployment != null && deployment.environments() != null
                ? deployment.environments() : List.<ProjectEnvironmentConfigEntity>of();
        for (var env : environments) {
            if (env.environment() == null) continue;
            var target = env.deployTarget() != null && !env.deployTarget().isBlank() ? env.deployTarget().toUpperCase()
                    : (env.kubernetesContext() != null && !env.kubernetesContext().isBlank() ? "KUBERNETES" : "DOCKER");
            var envName = env.environment().toLowerCase();
            if (!"KUBERNETES".equals(target)) {
                targets.add(new HashMap<>(Map.of("name", envName, "target", "DOCKER", "compose", "docker-compose.yml")));
                continue;
            }
            var registry = env.imageRegistry() != null && !env.imageRegistry().isBlank() ? env.imageRegistry()
                    : deployment.dockerRegistry();
            var namespace = env.kubernetesNamespace() != null && !env.kubernetesNamespace().isBlank()
                    ? env.kubernetesNamespace() : projectSlug + "-" + envName;
            var domain = env.ingressDomain() != null && !env.ingressDomain().isBlank() ? env.ingressDomain().trim() : null;
            var envRunnables = new ArrayList<Map<String, Object>>();
            var allHosts = new java.util.LinkedHashSet<String>();
            for (var r : runnables) {
                var er = new HashMap<String, Object>(r);
                var image = (registry != null && !registry.isBlank() ? registry.replaceAll("/+$", "") + "/" : "")
                        + projectSlug + "-" + r.get("name");
                er.put("image", image);
                var hosts = new ArrayList<String>();
                if ("service".equals(r.get("kind"))) {
                    var sv = services.stream().filter(x -> x.id().equals(r.get("serviceId"))).findFirst().orElseThrow();
                    for (var id : sv.urlIds() == null ? List.<String>of() : sv.urlIds()) {
                        repository.findById(id, UrlEntity.class)
                                .filter(u -> urlApplies(u, env.environment(), domain))
                                .map(this::hostOf).ifPresent(hosts::add);
                    }
                    // a system without a shell is reached through its services
                    if (hosts.isEmpty() && shells.isEmpty() && domain != null) hosts.add(r.get("name") + "." + domain);
                } else if ("shell".equals(r.get("kind"))) {
                    // the shell is the front door, entered through the API gateway
                    var sh = shells.stream().filter(x -> x.id().equals(r.get("shellId"))).findFirst().orElseThrow();
                    var declared = sh.url() == null || sh.url().isBlank() ? null
                            : hostOf(UrlEntity.builder().url(sh.url()).build());
                    if (declared != null && (domain == null || declared.equals(domain) || declared.endsWith("." + domain))) {
                        hosts.add(declared);
                    } else if (domain != null) {
                        hosts.add(r.get("name") + "." + domain);
                    }
                }
                er.put("hosts", hosts);
                allHosts.addAll(hosts);
                envRunnables.add(er);
            }
            // the shell's hosts are served by the gateway
            var shellHosts = envRunnables.stream().filter(r -> "shell".equals(r.get("kind")))
                    .flatMap(r -> asList(r.get("hosts")).stream()).toList();
            envRunnables.stream().filter(r -> "gateway".equals(r.get("kind"))).forEach(r -> r.put("hosts", shellHosts));
            envRunnables.stream().filter(r -> "shell".equals(r.get("kind"))).forEach(r -> r.put("hosts", List.of()));

            Map<String, Object> model = new HashMap<>();
            model.put("project", projectToMap(project));
            model.put("projectSlug", projectSlug);
            model.put("namespace", namespace);
            model.put("runnables", envRunnables);
            model.put("databases", runnables.stream().filter(r -> r.get("db") != null).map(r -> r.get("db")).toList());
            model.put("ingressClass", env.ingressClassName() != null && !env.ingressClassName().isBlank() ? env.ingressClassName() : "nginx");
            model.put("tls", env.ingressTlsEnabled() == null || env.ingressTlsEnabled());
            model.put("certIssuer", env.certIssuer() != null && !env.certIssuer().isBlank() ? env.certIssuer() : null);
            model.put("externalUrls", externalUrls(project).stream()
                    .map(e -> Map.of("envName", e.getKey(), "url", e.getValue())).toList());
            model.put("externalJdbcEnvs", externalJdbcEnvs());
            createFile(project.outputPath(), model, "deploy-k8s.ftl", "deploy/k8s/" + envName + ".yaml");

            Map<String, Object> t = new HashMap<>();
            t.put("name", envName);
            t.put("target", "KUBERNETES");
            t.put("manifest", "deploy/k8s/" + envName + ".yaml");
            t.put("context", env.kubernetesContext());
            t.put("namespace", namespace);
            t.put("registry", registry);
            t.put("dbSecret", projectSlug + "-db");
            t.put("dnsProvider", env.dnsProvider());
            t.put("hosts", new ArrayList<>(allHosts));
            t.put("images", envRunnables.stream().map(r -> Map.of(
                    "name", r.get("name"), "dir", r.get("dir"), "image", r.get("image"))).toList());
            targets.add(t);
        }
        Map<String, Object> model = new HashMap<>();
        model.put("json", toPrettyJson(Map.of("project", projectSlug,
                        "builds", runnables.stream().map(r -> r.get("dir")).toList(),
                        "targets", targets)));
        createFile(project.outputPath(), model, "deploy-targets.ftl", "deploy/targets.json");
    }

    /** A URL belongs to an environment when it names it, or names none and lives in its domain. */
    private static boolean urlApplies(UrlEntity url, String environment, String domain) {
        if (url.environment() != null && !url.environment().isBlank()) {
            return url.environment().equalsIgnoreCase(environment);
        }
        var host = hostOfStatic(url);
        return host != null && domain != null && (host.equals(domain) || host.endsWith("." + domain));
    }

    private String hostOf(UrlEntity url) {
        return hostOfStatic(url);
    }

    private static String hostOfStatic(UrlEntity url) {
        var raw = url.url() != null && !url.url().isBlank() ? url.url().trim() : (url.name() != null ? url.name().trim() : "");
        if (raw.isBlank()) return null;
        var withScheme = raw.matches("^[a-z][a-z0-9+.-]*://.*") ? raw : "https://" + raw;
        try {
            return java.net.URI.create(withScheme).getHost();
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** A keycloak on this machine: the one up.sh and the compose file start themselves. */
    static boolean isLocalIdp(Map<String, Object> idp) {
        var url = String.valueOf(idp.get("url"));
        return url.contains("://localhost") || url.contains("://127.0.0.1");
    }

    /**
     * One public keycloak client per app (and per adapter-less service), matching the
     * {@code @KeycloakSecured} clientIds the generated Homes carry.
     */
    private List<Map<String, Object>> keycloakAppClients(List<ServiceEntity> services) {
        var projectServiceIds = services.stream().map(ServiceEntity::id).collect(java.util.stream.Collectors.toSet());
        var appClients = new java.util.ArrayList<Map<String, Object>>();
        var servicesWithAdapter = new java.util.HashSet<String>();
        repository.findAllOfType(UiAdapterEntity.class).stream()
                .filter(a -> a.serviceId() != null && projectServiceIds.contains(a.serviceId()))
                .sorted(java.util.Comparator.comparing(UiAdapterEntity::name,
                        java.util.Comparator.nullsLast(String::compareTo)))
                .forEach(a -> {
                    servicesWithAdapter.add(a.serviceId());
                    var svc = services.stream()
                            .filter(s -> s.id().equals(a.serviceId())).findFirst().orElse(null);
                    var pathSlug = a.path() == null ? ""
                            : a.path().replaceFirst("^/", "").replaceAll("[^a-z0-9-]", "");
                    var clientId = !pathSlug.isBlank() ? pathSlug
                            : (svc != null ? svc.name() : a.name())
                                    .toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
                    appClients.add(Map.of("clientId", clientId, "serviceId", a.serviceId(),
                            "port", svc != null && svc.port() != null ? svc.port() : 8080));
                });
        services.stream()
                .filter(s -> !servicesWithAdapter.contains(s.id()))
                .forEach(s -> appClients.add(Map.of(
                        "clientId", s.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"),
                        "serviceId", s.id(),
                        "port", s.port() != null ? s.port() : 8080)));
        return appClients;
    }

    private void generateUpSh(ProjectEntity project) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        var services = effectiveServices(project);
        model.put("services", services.stream()
                .map(sv -> Map.of(
                        "name", serviceName(sv),
                        "port", sv.port() != null ? sv.port() : 8080,
                        "db", sv.name().toLowerCase().replace(" ", "_")))
                .toList());
        var projectServiceIds = services.stream().map(ServiceEntity::id)
                .collect(java.util.stream.Collectors.toSet());
        model.put("shells", repository.findAllOfType(UiShellEntity.class).stream()
                .filter(sh -> sh.serviceIds() != null && sh.serviceIds().stream().anyMatch(projectServiceIds::contains))
                .map(sh -> Map.of(
                        "slug", sh.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"),
                        "name", sh.name(),
                        "title", sh.title() != null && !sh.title().isBlank() ? sh.title() : sh.name()))
                .toList());
        // One public keycloak client per app (and per adapter-less service), matching the
        // @KeycloakSecured clientIds the generated Homes carry. Only when an IdP is chosen.
        var idp = idpFor(project);
        model.put("idp", idp.orElse(null));
        var appClients = idp.isPresent() ? keycloakAppClients(services) : List.<Map<String, Object>>of();
        model.put("appClients", appClients);
        // a local keycloak (the IdP's issuer is on localhost) comes with its realm: the model's
        // roles, one user per role and the clients of the shell and the apps — imported on start
        // by up.sh and by the compose file alike
        idp.filter(GenerateCodeUseCase::isLocalIdp).ifPresent(i -> {
            var realm = new HashMap<String, Object>(model);
            realm.put("roles", repository.findAllOfType(RoleEntity.class).stream()
                    .filter(r -> inProject(r.projectId(), project)).map(RoleEntity::name).sorted().toList());
            realm.put("hasShell", !((List<?>) model.get("shells")).isEmpty());
            createDir(project.outputPath(), "keycloak");
            createFile(project.outputPath(), realm, "keycloak-realm.ftl", "keycloak/" + i.get("realm") + "-realm.json");
        });
        createFile(project.outputPath(), model, "up-sh.ftl", "up.sh");
        createFile(project.outputPath(), model, "down-sh.ftl", "down.sh");
        // run as ./up.sh, which is what their own output tells you
        new File(project.outputPath(), "up.sh").setExecutable(true);
        new File(project.outputPath(), "down.sh").setExecutable(true);
    }

    /**
     * The API gateway (Spring Cloud Gateway, webmvc): one front door for the shell and the
     * external channels. Routes come from the model — every service gets its /api border;
     * every app (uiAdapter) gets its micro-frontend routes (/_app → /app) and its natural
     * path (/app); everything else falls through to the shell.
     */
    private void generateApiGateway(ProjectEntity project) {
        var services = effectiveServices(project);
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("gatewayPort", 8088);
        model.put("shellPort", 8100);
        model.put("services", services.stream()
                .map(sv -> Map.of(
                        "name", serviceName(sv),
                        "slug", serviceName(sv).toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"),
                        "port", sv.port() != null ? sv.port() : 8080))
                .toList());
        var portsByServiceId = services.stream().collect(java.util.stream.Collectors.toMap(
                ServiceEntity::id, sv -> sv.port() != null ? sv.port() : 8080));
        model.put("apps", repository.findAllOfType(UiAdapterEntity.class).stream()
                .filter(a -> a.serviceId() != null && portsByServiceId.containsKey(a.serviceId()))
                .filter(a -> a.path() != null && !a.path().isBlank())
                .sorted(java.util.Comparator.comparing(UiAdapterEntity::name,
                        java.util.Comparator.nullsLast(String::compareTo)))
                .map(a -> {
                    var slug = a.path().replaceFirst("^/", "").replaceAll("[^a-z0-9-]", "");
                    var svc = services.stream().filter(sv -> sv.id().equals(a.serviceId())).findFirst()
                            .map(sv -> serviceName(sv).toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"))
                            .orElse(slug);
                    return Map.of(
                            "slug", slug,
                            "svc", svc,
                            "port", portsByServiceId.get(a.serviceId()));
                })
                .toList());
        var proxies = gatewayProxies(services);
        model.put("proxies", proxies);
        var gatewayDir = project.outputPath() + "/gateway";
        var packageDir = (project.packageName() + ".gateway").replace(".", "/");
        // the human tasks' worklist (EventConductor's forms app) under /_forms, with who is signed in
        model.put("forms", hasHumanTasks());
        if (hasHumanTasks()) {
            createFile(gatewayDir, model, "gateway-identity-bridge.ftl",
                    "src/main/java/" + packageDir + "/IdentityBridge.java");
        }
        createFile(gatewayDir, model, "gateway-pom.ftl", "pom.xml");
        createFile(gatewayDir, model, "gateway-application.ftl",
                "src/main/java/" + packageDir + "/ApiGatewayApplication.java");
        createFile(gatewayDir, model, "gateway-yaml.ftl", "src/main/resources/application.yaml");
        if (proxies.stream().anyMatch(p -> (int) p.get("ttl") > 0)) {
            createFile(gatewayDir, model, "gateway-proxy-cache.ftl",
                    "src/main/java/" + packageDir + "/ProxyCacheFilter.java");
        }
    }

    /**
     * Every proxy that fronts an API some deployed service implements becomes a gateway route —
     * its public path to that service's REST — with the proxy's cache, when it declares one.
     */
    private List<Map<String, Object>> gatewayProxies(List<ServiceEntity> services) {
        var out = new java.util.ArrayList<Map<String, Object>>();
        for (var proxy : repository.findAllOfType(ProxyApiEntity.class)) {
            if (proxy.targetApiId() == null) continue;
            var api = repository.findById(proxy.targetApiId(), ApiEntity.class).orElse(null);
            if (api == null || api.implementedByBoundedContextIds() == null) continue;
            var service = services.stream()
                    .filter(sv -> deployedUnits(sv).stream().anyMatch(bc -> api.implementedByBoundedContextIds().contains(bc.id())))
                    .findFirst().orElse(null);
            if (service == null) continue;
            var slug = proxy.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
            var path = proxy.path() != null && !proxy.path().isBlank()
                    ? "/" + proxy.path().replaceAll("^/+|/+$", "") : "/public/" + slug;
            out.add(Map.of(
                    "slug", slug,
                    "name", proxy.name(),
                    "path", path,
                    "segments", path.split("/").length - 1,
                    "svc", serviceName(service).toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"),
                    "port", service.port() != null ? service.port() : 8080,
                    "ttl", proxy.cacheTtlSeconds() != null ? proxy.cacheTtlSeconds() : 0));
        }
        return out;
    }

    // ─── UI Shells ────────────────────────────────────────────────────────────

    private void generateUiShell(ProjectEntity project, UiShellEntity shell) {
        var shellSlug = shell.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
        var shellDir = project.outputPath() + "/" + shellSlug;
        var shellPackage = project.packageName() + "." + shell.name().toLowerCase().replaceAll("[^a-z0-9]", "");
        var shellClassName = toClassName(shell.name());
        var packageDir = shellPackage.replace(".", "/");

        createDir(shellDir, "");
        createDir(shellDir, "src/main/java/" + packageDir + "/infra/in/ui");
        createDir(shellDir, "src/main/java/" + packageDir + "/infra/config");
        createDir(shellDir, "src/main/resources/static/images");
        createDir(shellDir, "src/test/java");

        // The shell's @Logo/@FavIcon point here: the mateu logo when the model names none.
        copyClasspathResource("/static-assets/logo.svg",
                shellDir + "/src/main/resources/static/images/logo.svg");

        // resolve serviceIds → ServiceEntity maps (name + the app path its remote menu answers to)
        var resolvedServices = (shell.serviceIds() != null ? shell.serviceIds() : List.<String>of()).stream()
                .map(id -> repository.findById(id, ServiceEntity.class).orElse(null))
                .filter(s -> s != null)
                .map(s -> {
                    var map = new HashMap<String, Object>();
                    map.putAll(fromJson(toJson(s)));
                    var adapters = adaptersOf(s);
                    var appPath = adapters.stream()
                            .map(UiAdapterEntity::path)
                            .filter(p -> p != null && !p.isBlank())
                            .findFirst()
                            .orElse("/" + s.name().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-"));
                    map.put("appPath", appPath);
                    // the gateway route of an app is /_{its path} (gateway-yaml): the remote menu goes through it
                    map.put("route", appRoute(appPath));
                    // one menu entry per app of the service (a service may hold several)
                    var apps = new java.util.ArrayList<Map<String, Object>>();
                    for (var a : adapters) {
                        if (a.path() == null || a.path().isBlank()) continue;
                        apps.add(Map.of(
                                "field", (s.name() + "_" + a.name()).toLowerCase().replaceAll("[^a-z0-9]", "_"),
                                "label", a.title() != null && !a.title().isBlank() ? a.title() : a.name(),
                                "path", a.path(),
                                "route", appRoute(a.path())));
                    }
                    map.put("apps", apps);
                    return (Map<String, Object>) map;
                })
                .toList();

        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("shell", fromJson(toJson(shell)));
        model.put("shellPackage", shellPackage);
        model.put("shellClassName", shellClassName);
        model.put("resolvedServices", resolvedServices);
        model.put("tasks", hasHumanTasks());
        idpFor(project).ifPresent(idp -> model.put("idp", idp));

        createFile(shellDir, model, "uishell-pom.ftl", "pom.xml");
        createFile(shellDir, model, "uishell-application.ftl",
                "src/main/java/" + packageDir + "/" + shellClassName + "Application.java");
        createFile(shellDir, model, "uishell-home.ftl",
                "src/main/java/" + packageDir + "/infra/in/ui/" + shellClassName + "Home.java");
        var shellRoles = repository.findAllOfType(RoleEntity.class).stream()
                .filter(r -> inProject(r.projectId(), project)).map(r -> fromJson(toJson(r))).toList();
        model.put("roles", shellRoles);
        createFile(shellDir, model, "uishell-security.ftl",
                "src/main/java/" + packageDir + "/infra/config/SecurityConfig.java");
        if (!shellRoles.isEmpty() || idpFor(project).isPresent()) {
            model.put("securityPackage", shellPackage + ".infra.config");
            createFile(shellDir, model, "auth-cookie.ftl",
                    "src/main/java/" + packageDir + "/infra/config/ModuxAuthCookie.java");
        }
        createFile(shellDir, model, "uishell-yaml.ftl",
                "src/main/resources/application.yaml");
    }

    // ─── Projections ──────────────────────────────────────────────────────────

    private void generateProjection(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                    String boundedContextDir, String boundedContextPackageDir, ProjectionEntity projection) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/projection");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("projection", fromJson(toJson(projection)));

        var className = projectionClassName(projection);
        model.put("className", className);
        // only ever appended to, like a history: every event is a row of its own
        model.put("appendOnly", projection.handlers() != null && projection.handlers().stream()
                .allMatch(h -> h.type() != null && "Create".equals(h.type().name())));

        ModelEntity rmModelEntity = null;
        if (projection.readModelId() != null && !projection.readModelId().isBlank()) {
            var rm = repository.findById(projection.readModelId(), ReadModelEntity.class).orElse(null);
            if (rm != null) {
                var typeName = toTypeName(rm.name());
                var rmClassName = typeName.endsWith("ReadModel") ? typeName : typeName + "ReadModel";
                Map<String, Object> rmModel = new HashMap<>();
                rmModel.put("className", rmClassName);
                rmModel.put("entityClassName", rmClassName + "Entity");
                rmModel.put("name", rm.name());
                if (rm.modelId() != null && !rm.modelId().isBlank()) {
                    rmModelEntity = repository.findById(rm.modelId(), ModelEntity.class).orElse(null);
                    if (rmModelEntity != null && rmModelEntity.fields() != null) {
                        rmModel.put("fields", toFieldMaps(rmModelEntity.fields()));
                    }
                }
                model.put("readModel", rmModel);
            }
        }

        // fed from outside: an external system's operation or a legacy table, polled and mirrored
        var poll = pollSourceOf(projection);
        if (poll != null && model.get("readModel") != null && rmModelEntity != null && rmModelEntity.fields() != null) {
            model.put("poll", poll);
            model.put("fields", toFieldMaps(rmModelEntity.fields()));
            createFile(boundedContextDir, model, "projection-poller.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/infra/in/projection/" + className + ".java");
            return;
        }

        // Enrich each handler with payload fields + field mapping for auto-deserialization
        var enrichedHandlers = new java.util.ArrayList<Map<String, Object>>();
        if (projection.handlers() != null) {
            for (var h : projection.handlers()) {
                Map<String, Object> handler = new HashMap<>();
                handler.put("id", h.id());
                handler.put("name", h.name());
                handler.put("type", h.type() != null ? h.type().name() : null);
                handler.put("modelMappingId", h.modelMappingId());
                handler.put("domainEventId", h.domainEventId());

                if (h.domainEventId() != null) {
                    var ev = repository.findById(h.domainEventId(), DomainEventEntity.class).orElse(null);
                    if (ev != null && ev.modelId() != null) {
                        var payloadModel = repository.findById(ev.modelId(), ModelEntity.class).orElse(null);
                        if (payloadModel != null && payloadModel.fields() != null) {
                            var payloadFields = payloadModel.fields();
                            payloadFields.stream()
                                    .filter(ModelFieldEntity::basicType)
                                    .findFirst()
                                    .map(ModelFieldEntity::name)
                                    .ifPresent(idField -> handler.put("idField", idField));
                            if (rmModelEntity != null && rmModelEntity.fields() != null) {
                                var payloadNames = payloadFields.stream()
                                        .map(ModelFieldEntity::name)
                                        .collect(java.util.stream.Collectors.toSet());
                                var matched = new java.util.ArrayList<Map<String, Object>>();
                                var unmatched = new java.util.ArrayList<String>();
                                for (var rmf : rmModelEntity.fields()) {
                                    if (payloadNames.contains(rmf.name())) {
                                        Map<String, Object> mf = new HashMap<>();
                                        mf.put("name", rmf.name());
                                        mf.put("basicType", rmf.basicType());
                                        mf.put("type", rmf.type() != null ? rmf.type().name() : null);
                                        matched.add(mf);
                                    } else {
                                        unmatched.add(rmf.name());
                                    }
                                }
                                handler.put("matchedFields", matched);
                                handler.put("unmatchedFields", unmatched);
                            }
                        }
                    }
                }
                enrichedHandlers.add(handler);
            }
        }
        model.put("enrichedHandlers", enrichedHandlers);

        createFile(boundedContextDir, model, "projection.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/projection/" + className + ".java");
    }

    private List<Map<String, Object>> toFieldMaps(List<ModelFieldEntity> fields) {
        var out = new java.util.ArrayList<Map<String, Object>>();
        for (var f : fields) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", f.name());
            m.put("basicType", f.basicType());
            m.put("type", f.type() != null ? f.type().name() : null);
            out.add(m);
        }
        return out;
    }

    // ─── Shared step enrichment ───────────────────────────────────────────────

    private Map<String, Object> enrichStep(String id, String name, String type,
                                           String aggregateId, String operationId,
                                           String gatewayId, String gatewayOperationId,
                                           String domainEventId, String useCaseId, String modelMappingId) {
        var stepMap = new HashMap<String, Object>();
        stepMap.put("id", id);
        stepMap.put("name", name);
        stepMap.put("type", type);

        switch (type) {
            case "ReadAggregate", "CallAggregateOperation", "SaveAggregate" -> {
                if (aggregateId != null) {
                    var agg = repository.findById(aggregateId, AggregateEntity.class).orElse(null);
                    if (agg != null) {
                        stepMap.put("aggregate", fromJson(toJson(agg)));
                        if ("CallAggregateOperation".equals(type) && operationId != null && agg.operations() != null) {
                            agg.operations().stream()
                                    .filter(op -> op.id().equals(operationId))
                                    .findFirst()
                                    .ifPresent(op -> stepMap.put("operation", fromJson(toJson(op))));
                        }
                    }
                }
            }
            case "CallGateway" -> {
                if (gatewayId != null) {
                    var gw = repository.findById(gatewayId, GatewayEntity.class).orElse(null);
                    if (gw != null) {
                        stepMap.put("gateway", named(fromJson(toJson(gw)), gw.name()));
                        if (gatewayOperationId != null && gw.operations() != null) {
                            gw.operations().stream()
                                    .filter(op -> op.id().equals(gatewayOperationId))
                                    .findFirst()
                                    .ifPresent(op -> stepMap.put("gatewayOperation", fromJson(toJson(op))));
                        }
                    }
                }
            }
            case "PublishDomainEvent" -> {
                if (domainEventId != null) {
                    var event = repository.findById(domainEventId, DomainEventEntity.class).orElse(null);
                    if (event != null) {
                        stepMap.put("domainEvent", named(fromJson(toJson(event)), event.name()));
                        // an event another service consumes travels by its integration publisher:
                        // that one writes to the topic the subscribers listen on
                        if (repository.findAllOfType(IntegrationEventEntity.class).stream()
                                .anyMatch(integration -> event.name().equals(integration.name()))) {
                            stepMap.put("integrationClass", toTypeName(event.name()));
                        }
                    }
                }
            }
            case "CallUseCase" -> {
                if (useCaseId != null) {
                    var calledUC = repository.findById(useCaseId, UseCaseEntity.class).orElse(null);
                    if (calledUC != null) stepMap.put("useCase", named(fromJson(toJson(calledUC)), calledUC.name()));
                }
            }
            case "ApplyModelMapping" -> {
                if (modelMappingId != null) {
                    var mapping = repository.findById(modelMappingId, ModelMappingEntity.class).orElse(null);
                    if (mapping != null) stepMap.put("modelMapping", fromJson(toJson(mapping)));
                }
            }
        }
        return stepMap;
    }

    /** A named element's map with its safe Java type name precomputed (names may contain spaces). */
    private Map<String, Object> named(Map<String, Object> map, String name) {
        map.put("className", toTypeName(name));
        return map;
    }

    // ─── Domain events / Subscriptions / Scheduled triggers ──────────────────

    private Map<String, Object> buildBaseModel(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));
        model.put("module", boundedContextToMap(boundedContext));
        return model;
    }

    private void generateDomainEvent(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                     String boundedContextDir, String boundedContextPackageDir, DomainEventEntity event) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/domain/events");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        if (event.modelId() != null && !event.modelId().isBlank()) {
            var modelEntity = repository.findById(event.modelId(), ModelEntity.class).orElse(null);
            model.put("eventModel", modelEntity != null ? fromJson(toJson(modelEntity)) : null);
        }
        model.put("event", fromJson(toJson(event)));
        var schemaVersion = schemaVersionOf(event.schemaVersion());
        model.put("schemaVersion", schemaVersion);

        createFile(boundedContextDir, model, "domain-event.ftl",
                "src/main/java/" + boundedContextPackageDir + "/domain/events/" + event.name() + "Event.java");

        // when the event has evolved past v1, scaffold a two-zone upcaster hook to migrate older payloads
        if (schemaVersion > 1) {
            model.put("upcasterClass", event.name() + "EventUpcaster");
            model.put("upcasterPackage", project.packageName() + "." + boundedContextSlug(boundedContext.name()) + ".domain.events");
            model.put("eventLabel", event.name() + "Event");
            createFile(boundedContextDir, model, "event-upcaster.ftl",
                    "src/main/java/" + boundedContextPackageDir + "/domain/events/" + event.name() + "EventUpcaster.java");
            var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
            createCustomFile(customDir, model, "event-upcaster-default.ftl",
                    "src/main/java/" + project.packageName().replace(".", "/")
                            + "/custom/Default" + event.name() + "EventUpcaster.java");
        }
    }

    private void generateSubscription(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                      String boundedContextDir, String boundedContextPackageDir, SubscriptionEntity subscription) {
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/async");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("subscription", fromJson(toJson(subscription)));

        // Resolve subscription's input model (payload schema)
        ModelEntity payloadModel = null;
        if (subscription.inputModelId() != null && !subscription.inputModelId().isBlank()) {
            payloadModel = repository.findById(subscription.inputModelId(), ModelEntity.class).orElse(null);
        }
        var payloadNames = payloadModel != null && payloadModel.fields() != null
                ? payloadModel.fields().stream().map(ModelFieldEntity::name).collect(java.util.stream.Collectors.toSet())
                : java.util.Collections.<String>emptySet();

        var enrichedActions = new java.util.ArrayList<Map<String, Object>>();
        if (subscription.actions() != null) {
            for (var a : subscription.actions()) {
                Map<String, Object> action = new HashMap<>();
                action.put("id", a.id());
                action.put("name", a.name());
                action.put("type", a.type() != null ? a.type().name() : null);
                action.put("useCaseId", a.useCaseId());
                action.put("projectionId", a.projectionId());
                action.put("sagaId", a.sagaId());
                action.put("modelMappingId", a.modelMappingId());

                if (a.type() != null && "CallUseCase".equals(a.type().name()) && a.useCaseId() != null) {
                    var uc = repository.findById(a.useCaseId(), UseCaseEntity.class).orElse(null);
                    if (uc != null) {
                        var ucName = capitalize(uc.name());
                        var ucSlug = uc.name().toLowerCase().replaceAll("[^a-z0-9]", "");
                        action.put("useCaseName", uc.name());
                        action.put("useCaseClassName", ucName + "UseCase");
                        action.put("commandClassName", ucName + "Command");
                        action.put("useCaseFieldName", uncapitalize(uc.name()) + "UseCase");
                        action.put("useCaseSlug", ucSlug);

                        if (uc.inputModelId() != null && !uc.inputModelId().isBlank()) {
                            var commandModel = repository.findById(uc.inputModelId(), ModelEntity.class).orElse(null);
                            if (commandModel != null && commandModel.fields() != null) {
                                var matched = new java.util.ArrayList<Map<String, Object>>();
                                var unmatched = new java.util.ArrayList<String>();
                                for (var cf : commandModel.fields()) {
                                    if (payloadNames.contains(cf.name())) {
                                        Map<String, Object> m = new HashMap<>();
                                        m.put("name", cf.name());
                                        m.put("basicType", cf.basicType());
                                        m.put("type", cf.type() != null ? cf.type().name() : null);
                                        matched.add(m);
                                    } else {
                                        unmatched.add(cf.name());
                                    }
                                }
                                action.put("commandFields", toFieldMaps(commandModel.fields()));
                                action.put("matchedFields", matched);
                                action.put("unmatchedFields", unmatched);
                            }
                        }
                    }
                }
                enrichedActions.add(action);
            }
        }
        model.put("enrichedActions", enrichedActions);

        createFile(boundedContextDir, model, "subscription.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/async/" + capitalize(subscription.name()) + "Subscription.java");
    }

    private void generateScheduledTrigger(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                          String boundedContextDir, String boundedContextPackageDir, ScheduledTriggerEntity trigger) {
        // A trigger fires a use case; one that names none has nothing to run (validate flags it).
        var useCase = trigger.useCaseId() == null ? null
                : repository.findById(trigger.useCaseId(), UseCaseEntity.class).orElse(null);
        if (useCase == null) return;
        createDir(boundedContextDir, "src/main/java/" + boundedContextPackageDir + "/infra/in/scheduler");

        Map<String, Object> model = buildBaseModel(project, service, boundedContext);
        model.put("trigger", fromJson(toJson(trigger)));
        var uc = new HashMap<String, Object>();
        uc.put("className", toTypeName(useCase.name()));
        uc.put("slug", useCase.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
        // a scheduled run carries no input: every command field is passed empty
        var inputFields = useCase.inputModelId() == null || useCase.inputModelId().isBlank() ? 1
                : repository.findById(useCase.inputModelId(), ModelEntity.class)
                        .map(m -> m.fields() == null ? 0 : m.fields().size()).orElse(0);
        uc.put("commandArity", inputFields);
        model.put("useCase", uc);
        model.put("triggerClass", toTypeName(trigger.name()) + "Scheduler");

        createFile(boundedContextDir, model, "scheduled-trigger.ftl",
                "src/main/java/" + boundedContextPackageDir + "/infra/in/scheduler/" + toTypeName(trigger.name()) + "Scheduler.java");
    }

    // ─── createFile overloads ─────────────────────────────────────────────────

    @SneakyThrows
    private void createFile(String baseDir, ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                            AggregateEntity aggregate, String template, String destFile) {
        createFile(baseDir, aggregateModel(project, service, boundedContext, aggregate), template, destFile);
    }

    /** Custom (write-once) variant of the aggregate-model file generation. */
    private void createCustomFile(String baseDir, ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                  AggregateEntity aggregate, String template, String destFile) {
        createCustomFile(baseDir, aggregateModel(project, service, boundedContext, aggregate), template, destFile);
    }

    /** What an aggregate operation receives: its input model, when it has fields (else it takes none). */
    private Map<String, Object> operationInputOf(String inputModelId) {
        if (inputModelId == null || inputModelId.isBlank()) return null;
        return repository.findById(inputModelId, ModelEntity.class)
                .filter(m -> m.fields() != null && !m.fields().isEmpty())
                .map(m -> fromJson(toJson(m)))
                .orElse(null);
    }

    private Map<String, Object> aggregateModel(ProjectEntity project, ServiceEntity service, BoundedContextEntity boundedContext,
                                               AggregateEntity aggregate) {
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));
        model.put("module", boundedContextToMap(boundedContext));
        model.put("aggregate", aggregateToMap(aggregate));
        model.put("dataAccess", dataAccessOf(project, aggregate));
        // drawn into a read model somewhere: its repository publishes the state on every change
        if (flowStoreMaterializer.stateProjections().isStateSource(aggregate.id())) {
            model.put("stateTopic", AggregateStateProjections.topicOf(AggregateStateProjections.stateEventName(aggregate.name())));
            model.put("deletedTopic", AggregateStateProjections.topicOf(AggregateStateProjections.deletedEventName(aggregate.name())));
        }
        return model;
    }

    /**
     * The effective data-access strategy for an aggregate: its own override wins, then
     * the project's, then STORED_PROCEDURE (stored proc with JDBC fallback) as the default.
     */
    private String dataAccessOf(ProjectEntity project, AggregateEntity aggregate) {
        var raw = aggregate != null && aggregate.dataAccess() != null && !aggregate.dataAccess().isBlank()
                ? aggregate.dataAccess()
                : project.dataAccess();
        if (raw == null || raw.isBlank()) return "STORED_PROCEDURE";
        var v = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        return switch (v) {
            case "JPA" -> "JPA";
            case "JDBC" -> "JDBC";
            default -> "STORED_PROCEDURE"; // STORED_PROCEDURE / STORED_PROC / PROC / unknown → proc
        };
    }

    // ─── Model mappers ────────────────────────────────────────────────────────

    private ProjectEntity withOutputPath(ProjectEntity p, String outputPath) {
        return p.toBuilder().outputPath(outputPath).build();
    }

    private Map<String, Object> projectToMap(ProjectEntity project) {
        var map = new HashMap<String, Object>();
        map.putAll(fromJson(toJson(project)));
        var services = project.serviceIds().stream()
                .map(id -> repository.findById(id, ServiceEntity.class).orElseThrow())
                .map(this::serviceToMap)
                .toList();
        map.put("services", services);
        return map;
    }

    /**
     * The service's declared URLs resolved to ingress rules (host + path). A bare
     * host (no scheme) is accepted; entries that don't parse to a host are skipped.
     */
    private List<Map<String, Object>> ingressUrls(ServiceEntity service) {
        return (service.urlIds() == null ? List.<String>of() : service.urlIds()).stream()
                .map(id -> repository.findById(id, UrlEntity.class).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(u -> {
                    var raw = u.url() != null && !u.url().isBlank() ? u.url().trim() : u.name().trim();
                    var withScheme = raw.matches("^[a-z][a-z0-9+.-]*://.*") ? raw : "https://" + raw;
                    try {
                        var uri = java.net.URI.create(withScheme);
                        if (uri.getHost() == null) return null;
                        Map<String, Object> m = new HashMap<>();
                        m.put("host", uri.getHost());
                        m.put("path", uri.getPath() == null || uri.getPath().isBlank() ? "/" : uri.getPath());
                        return m;
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private Map<String, Object> serviceToMap(ServiceEntity service) {
        var map = new HashMap<String, Object>();
        map.putAll(fromJson(toJson(service)));
        map.put("modules", deployedUnits(service).stream()
                .map(this::boundedContextToMap)
                .toList());
        return map;
    }

    /**
     * The service's deployed modules, each as a generation unit: a bounded-context
     * view named after the module and restricted to the elements the module
     * actually packages. For a main module alone, that is the whole context.
     */
    private List<BoundedContextEntity> deployedUnits(ServiceEntity service) {
        var allModules = repository.findAllOfType(ModuleEntity.class);
        return (service.moduleIds() == null ? List.<String>of() : service.moduleIds()).stream()
                .map(id -> repository.findById(id, ModuleEntity.class).orElseThrow(
                        () -> new IllegalArgumentException("Unknown module: " + id)))
                .map(module -> restrictedTo(module, allModules))
                .toList();
    }

    private BoundedContextEntity restrictedTo(ModuleEntity module, List<ModuleEntity> allModules) {
        var boundedContext = repository.findById(module.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Module " + module.id() + " distributes an unknown bounded context: " + module.boundedContextId()));
        var keep = ModuleTopology.effectiveElementIds(allModules, boundedContext, module);
        return boundedContext.toBuilder()
                .name(module.name())
                .aggregateIds(retain(boundedContext.aggregateIds(), keep))
                .entityIds(retain(boundedContext.entityIds(), keep))
                .valueObjectIds(retain(boundedContext.valueObjectIds(), keep))
                .useCaseIds(retain(boundedContext.useCaseIds(), keep))
                .domainEventIds(retain(boundedContext.domainEventIds(), keep))
                .projectionIds(retain(boundedContext.projectionIds(), keep))
                .readModelIds(retain(boundedContext.readModelIds(), keep))
                .subscriptionIds(retain(boundedContext.subscriptionIds(), keep))
                .sagaIds(retain(boundedContext.sagaIds(), keep))
                .scheduledTriggerIds(retain(boundedContext.scheduledTriggerIds(), keep))
                .decisionIds(retain(boundedContext.decisionIds(), keep))
                .applicationEventIds(retain(boundedContext.applicationEventIds(), keep))
                .domainServiceIds(retain(boundedContext.domainServiceIds(), keep))
                .uiAdapterIds(retain(boundedContext.uiAdapterIds(), keep))
                .build();
    }

    private static List<String> retain(List<String> ids, java.util.Set<String> keep) {
        return ids == null ? List.of() : ids.stream().filter(keep::contains).toList();
    }

    private Map<String, Object> boundedContextToMap(BoundedContextEntity boundedContext) {
        var map = new HashMap<String, Object>();
        map.putAll(fromJson(toJson(boundedContext)));

        var aggregates = (boundedContext.aggregateIds() != null ? boundedContext.aggregateIds() : List.<String>of()).stream()
                .map(aggregateId -> repository.findById(aggregateId, AggregateEntity.class).orElseThrow())
                .map(this::aggregateToMap)
                .toList();

        map.put("aggregates", aggregates);
        map.put("slug", boundedContextSlug(boundedContext.name()));
        return map;
    }

    private Map<String, Object> aggregateToMap(AggregateEntity aggregate) {
        var map = new HashMap<String, Object>();
        map.putAll(fromJson(toJson(aggregate)));

        // Use cases that surface as row actions on this aggregate's CRUD listing (their
        // command is the row id). E.g. RelanzarCompra on CompraHotel: the waiting queue.
        map.put("rowActionUseCases", repository.findAllOfType(UseCaseEntity.class).stream()
                .filter(uc -> aggregate.id().equals(uc.rowActionForAggregateId()))
                .filter(uc -> uc.inputModelId() == null || uc.inputModelId().isBlank())
                .map(uc -> {
                    var action = new HashMap<String, Object>();
                    action.put("className", capitalize(uc.name()));
                    action.put("fieldName", uncapitalize(capitalize(uc.name())));
                    action.put("slug", uc.name().toLowerCase().replaceAll("[^a-z0-9]", ""));
                    action.put("title", uc.title() != null && !uc.title().isBlank() ? uc.title() : uc.name());
                    return (Object) action;
                })
                .toList());

        if (!map.containsKey("operations") || map.get("operations") == null) {
            map.put("operations", List.of());
        } else {
            map.put("operations", aggregate.operations().stream()
                    .filter(operation -> operation.type() != null && "CUSTOM".equals(operation.type()))
                    .map(operationEntity -> new OperationDto(
                            operationEntity.id(),
                            operationEntity.name(),
                            operationEntity.inputModelId(),
                            operationEntity.outputModelId(),
                            splitCsv(operationEntity.preconditions()),
                            listFromJson(operationEntity.sets(), FieldValueSettingDto.class),
                            splitCsv(operationEntity.emits()),
                            OperationType.valueOf(operationEntity.type()),
                            operationEntity.paginated(),
                            operationEntity.defaultPageSize(),
                            operationEntity.intent()
                    ))
                    .map(op -> {
                        var opMap = fromJson(toJson(op));
                        // the operation's Input record exists only when its model has fields
                        opMap.put("hasInput", operationInputOf(op.inputModelId()) != null);
                        // the lifecycle's transitions this operation makes: from which states, to which
                        opMap.put("transitions", aggregate.lifecycle() == null ? List.of()
                                : aggregate.lifecycle().transitions().stream()
                                        .filter(t -> op.id() != null && op.id().equals(t.operationId()))
                                        .filter(t -> t.toState() != null && !t.toState().isBlank())
                                        .filter(t -> t.fromState() != null && !t.fromState().isBlank())
                                        // one target per origin: the first declared wins
                                        .collect(java.util.stream.Collectors.toMap(LifecycleTransitionEntity::fromState,
                                                LifecycleTransitionEntity::toState, (a, b) -> a, java.util.LinkedHashMap::new))
                                        .entrySet().stream()
                                        .map(t -> Map.of("from", t.getKey(), "to", t.getValue()))
                                        .toList());
                        return opMap;
                    })
                    .toList());
        }
        // The explicit state machine: where it is born, which operations move it, when it can be edited
        if (aggregate.lifecycle() != null && aggregate.lifecycle().initialState() != null
                && !aggregate.lifecycle().initialState().isBlank()) {
            var lc = new HashMap<String, Object>();
            var stateField = aggregate.lifecycle().stateField() != null && !aggregate.lifecycle().stateField().isBlank()
                    ? aggregate.lifecycle().stateField() : "status";
            lc.put("stateField", stateField);
            lc.put("initialState", aggregate.lifecycle().initialState());
            lc.put("editableStates", aggregate.lifecycle().editableStates());
            map.put("lifecycle", lc);
        } else {
            map.remove("lifecycle");
        }
        // With operations the aggregate has behaviour: it changes through them, never by a
        // generic update that would overwrite its state and skip their rules.
        // unless it is declared editable too (a draft written freely, moved on by operations).
        map.put("behavioural", map.get("operations") instanceof List<?> ops && !ops.isEmpty()
                && !Boolean.TRUE.equals(aggregate.editable()));

        if (!map.containsKey("invariants") || map.get("invariants") == null) {
            map.put("invariants", List.of());
        }

        if (aggregate.modelId() != null && !aggregate.modelId().isBlank()) {
            var modelEntity = repository.findById(aggregate.modelId(), ModelEntity.class).orElse(null);
            if (modelEntity != null && modelEntity.fields() != null) {
                var fields = modelEntity.fields().stream()
                        .map(f -> {
                            var fieldMap = new HashMap<String, Object>();
                            fieldMap.put("name", f.name());
                            fieldMap.put("columnName", snakeCase("col_" + f.name()));
                            fieldMap.put("basicType", f.basicType());
                            fieldMap.put("searchable", true);
                            fieldMap.put("visible", true);
                            fieldMap.put("mandatory", f.validations() != null && f.validations().stream()
                                    .anyMatch(v -> List.of("NotNull", "NotEmpty", "NotBlank").contains(String.valueOf(v.type()))));
                            // kept by the system (a state, a number, who asked): read-only in the form,
                            // and the generic update keeps what is stored
                            fieldMap.put("readonly", Boolean.TRUE.equals(f.readOnly()));
                            fieldMap.put("label", f.label());
                            fieldMap.put("priority", f.priority());
                            fieldMap.put("identifier", Boolean.TRUE.equals(f.identifier()));
                            // how Mateu shows it (richText, html, markdown, textarea…)
                            fieldMap.put("stereotype", f.stereotype() != null ? f.stereotype().name() : null);
                            // a list of another model has no class of its own: the aggregate keeps it as JSON,
                            // which is what the form's inline grid hands the command
                            var jsonList = !f.basicType() && f.modelId() != null && !f.modelId().isBlank()
                                    && f.type() == FieldDataType.array;
                            if (f.basicType() || jsonList) {
                                fieldMap.put("type", "Wrapper");
                                fieldMap.put("primitiveType", jsonList ? "json" : mapFieldDataType(f.type()));
                                if (jsonList) {
                                    // the CRUD form edits it as an inline grid of this row class
                                    fieldMap.put("modelId", f.modelId());
                                    repository.findById(f.modelId(), ModelEntity.class).ifPresent(gm ->
                                            fieldMap.put("gridClass", toTypeName(gm.name()) + "Fila"));
                                }
                                // money and number are both decimals; a listing shows money with 2 decimals
                                fieldMap.put("money", f.type() == FieldDataType.money);
                            } else {
                                fieldMap.put("type", "ValueObject");
                                fieldMap.put("primitiveType", null);
                            }
                            fieldMap.put("isEnum",
                                    !f.basicType() && f.enumId() != null && !f.enumId().isBlank());
                            return (Object) fieldMap;
                        })
                        .toList();
                map.put("fields", fields);
            } else {
                map.put("fields", List.of());
            }
        } else {
            map.put("fields", List.of());
        }

        // the screens' create/update/delete honour the roles modelled on the aggregate's CRUD use cases
        var crudIds = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold.CrudUseCases.idsOf(aggregate.id());
        var crudRoles = new HashMap<String, List<String>>();
        for (var i = 0; i < 3; i++) {
            var role = List.of("create", "update", "delete").get(i);
            crudRoles.put(role, repository.findById(crudIds.get(i), UseCaseEntity.class)
                    .map(UseCaseEntity::allowedRoles).orElse(null) instanceof List<String> roles ? roles : List.of());
        }
        map.put("crudRoles", crudRoles);
        customDeleteOf(aggregate).ifPresent(useCase -> map.put("customDelete", Map.of(
                "className", toTypeName(useCase.name()),
                "slug", useCase.name().toLowerCase().replaceAll("[^a-z0-9]", ""))));
        map.put("tableName", aggregateTableName(aggregate));

        return map;
    }

    private String mapFieldDataType(FieldDataType type) {
        if (type == null) return "string";
        return switch (type) {
            case integer -> "integer";
            case number, money -> "decimal";
            case date -> "date";
            case time -> "time";
            case dateTime -> "datetime";
            case bool -> "bool";
            case file -> "file";
            default -> "string";
        };
    }

    // ─── File I/O ─────────────────────────────────────────────────────────────

    /** Generates the developer-owned custom boundedContext: structure is generated, contents scaffolded once. */
    private void generateCustomBoundedContext(ProjectEntity project, ServiceEntity service, String serviceDir, String serviceName) {
        var customDir = serviceDir + "/" + serviceName + "-custom";
        var packageDir = project.packageName().replace(".", "/");
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));

        createDir(customDir, "");
        createFile(customDir, model, "custom-pom.ftl", "pom.xml");
        createDir(customDir, "src/main/java/" + packageDir + "/custom");
        createFile(customDir, model, "custom-package-info.ftl",
                "src/main/java/" + packageDir + "/custom/package-info.java");
    }

    /** Writes a developer-owned file only if it does not already exist (scaffold once, never overwrite). */
    private void createCustomFile(String baseDir, Map<String, Object> model, String template, String destFile) {
        var file = new File(baseDir + "/" + destFile);
        if (file.exists()) {
            return; // developer-owned: never overwritten, not tracked in the manifest
        }
        renderFile(file, model, template);
    }

    private void createFile(String baseDir, Map<String, Object> model, String template, String destFile) {
        var file = new File(baseDir + "/" + destFile);
        warnIfTampered(file);
        renderFile(file, model, template);
        recordGenerated(file);
    }

    /** Copies a generator classpath resource verbatim into the generated tree (static assets). */
    @SneakyThrows
    private void copyClasspathResource(String resource, String destPath) {
        try (var in = this.getClass().getResourceAsStream(resource)) {
            if (in == null) throw new IllegalStateException("Missing generator resource " + resource);
            var dest = new File(destPath);
            if (dest.getParentFile() != null) dest.getParentFile().mkdirs();
            java.nio.file.Files.write(dest.toPath(), in.readAllBytes());
        }
    }

    @SneakyThrows
    private void renderFile(File file, Map<String, Object> model, String template) {
        var cfg = new freemarker.template.Configuration(freemarker.template.Configuration.VERSION_2_3_32);
        cfg.setClassForTemplateLoading(this.getClass(), "/templates");
        cfg.setDefaultEncoding("UTF-8");

        var t = cfg.getTemplate(template);
        var parent = file.getParentFile();
        if (parent != null) {
            parent.mkdirs();
        }

        try (var out = new PrintWriter(file)) {
            t.process(model, out);
        }

        formatIfJava(file);
    }

    // ─── Generated-zone integrity (manifest) ───────────────────────────────────

    private String relPath(File file) {
        return generationRoot.relativize(file.toPath().toAbsolutePath().normalize()).toString();
    }

    private void warnIfTampered(File file) {
        if (generationRoot == null || !file.exists()) {
            return;
        }
        // a file written twice in one generation (a UI's home replacing the service's default one)
        // already holds this run's first version: only its first write compares with the last run
        if (currentManifest.containsKey(relPath(file))) {
            return;
        }
        var prev = previousManifest.get(relPath(file));
        if (prev != null && !prev.equals(hashFile(file))) {
            log.warn("Generated file was edited by hand and is being overwritten: {} — put custom logic in the *-custom boundedContext instead.",
                    relPath(file));
        }
    }

    private void recordGenerated(File file) {
        if (generationRoot != null) {
            currentManifest.put(relPath(file), hashFile(file));
        }
    }

    @SneakyThrows
    private String hashFile(File file) {
        var digest = java.security.MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file.toPath()));
        var sb = new StringBuilder();
        for (var b : digest) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @SneakyThrows
    private Map<String, String> loadManifest() {
        var path = generationRoot.resolve(".modux/generated-manifest.json");
        if (!Files.exists(path)) {
            return Map.of();
        }
        @SuppressWarnings("unchecked")
        Map<String, String> m = new com.fasterxml.jackson.databind.ObjectMapper().readValue(path.toFile(), Map.class);
        return m;
    }

    @SneakyThrows
    private void saveManifest() {
        var path = generationRoot.resolve(".modux/generated-manifest.json");
        Files.createDirectories(path.getParent());
        Files.writeString(path, new com.fasterxml.jackson.databind.ObjectMapper()
                .writerWithDefaultPrettyPrinter().writeValueAsString(new java.util.TreeMap<>(currentManifest)));
    }

    /**
     * The generated zone is fully owned by the generator, so files the model no longer produces
     * are deleted on regeneration — otherwise stale adapters (an async consumer whose use case
     * went REST, say) linger and keep compiling against the new code. Safety valve: a file whose
     * content no longer matches what we generated (hand-edited despite the contract) is left in
     * place with a warning instead of being destroyed.
     */
    private void reportOrphanedGeneratedFiles() {
        previousManifest.entrySet().stream()
                .filter(e -> !currentManifest.containsKey(e.getKey()))
                .forEach(e -> {
                    var file = generationRoot.resolve(e.getKey());
                    if (!Files.exists(file)) {
                        return;
                    }
                    if (!e.getValue().equals(hashFile(file.toFile()))) {
                        log.warn("Orphaned generated file was edited by hand, NOT deleting it: {}", e.getKey());
                        return;
                    }
                    try {
                        Files.delete(file);
                        log.info("Deleted generated file no longer produced by the model: {}", e.getKey());
                    } catch (java.io.IOException ex) {
                        log.warn("Could not delete orphaned generated file {}: {}", e.getKey(), ex.getMessage());
                    }
                });
    }

    /**
     * google-java-format needs jdk.compiler internals opened up; a JVM launched without
     * the --add-exports flags (an IDE run config, typically) can't format AT ALL —
     * probe once, warn once with the fix, and generate unformatted quietly after that.
     */
    private static volatile Boolean formatterAvailable;

    private void formatIfJava(File file) {
        if (Boolean.FALSE.equals(formatterAvailable) || !file.getName().endsWith(".java")) {
            return;
        }
        try {
            var source = Files.readString(file.toPath());
            var formatted = new Formatter().formatSource(source);
            Files.writeString(file.toPath(), formatted);
            formatterAvailable = Boolean.TRUE;
        } catch (NoClassDefFoundError | IllegalAccessError e) {
            formatterAvailable = Boolean.FALSE;
            log.warn("""
                    The generated-code formatter cannot start on this JVM — the .java files \
                    are generated UNFORMATTED. Add to the JVM startup options (VM options):
                    --add-exports jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
                    --add-exports jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED \
                    --add-exports jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED \
                    --add-exports jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED \
                    --add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED \
                    --add-exports jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED \
                    --add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED""");
        } catch (Throwable e) {
            log.warn("Could not format generated file {}", file.getAbsolutePath(), e);
        }
    }

    private void createDir(String baseDir, String dir) {
        new File(baseDir + "/" + dir).mkdirs();
    }

    /** Null/blank-safe CSV split: returns an empty list instead of NPE-ing on null. */
    private List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.asList(value.split(","));
    }

    /**
     * The modeled body of an operation as a template model: its explicit {@code steps}, or the
     * desugaring of its legacy {@code preconditions}/{@code sets}/{@code emits} (operation-body.md
     * §7) — so both flavours drive the same scaffold. Recursive, mirroring control-flow nesting.
     */
    private List<Map<String, Object>> operationStepsModel(OperationEntity operation) {
        return stepsToModel(OperationBodyDesugar.effectiveSteps(operation));
    }

    /**
     * Generates a domain service (operation-body.md Phase 4): a stateless coordinator interface in
     * the owning bounded context, plus a developer-owned {@code Default…} impl in the custom zone
     * whose operation bodies carry the modeled steps as a guided scaffold. Unlike an aggregate
     * operation, a domain service has no {@code OperationContext} — leaf logic and dependencies are
     * the developer's to add. Executable structure-with-hooks for domain services is a follow-up.
     */
    private void generateDomainService(ProjectEntity project, ServiceEntity service,
            BoundedContextEntity boundedContext, String boundedContextDir, String boundedContextPackageDir,
            DomainServiceEntity domainService) {
        var typeName = toTypeName(domainService.name());
        var operations = new ArrayList<Map<String, Object>>();
        for (var op : (domainService.operations() == null ? List.<OperationEntity>of() : domainService.operations())) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", op.name());
            if (op.intent() != null) m.put("intent", op.intent());
            m.put("steps", operationStepsModel(op));
            operations.add(m);
        }
        Map<String, Object> model = new HashMap<>();
        model.put("project", projectToMap(project));
        model.put("service", serviceToMap(service));
        model.put("module", boundedContextToMap(boundedContext));
        model.put("domainService", Map.of("name", typeName));
        model.put("operations", operations);

        createFile(boundedContextDir, model, "domain-service.ftl",
                "src/main/java/" + boundedContextPackageDir + "/domain/services/" + typeName + ".java");

        var customDir = project.outputPath() + "/" + serviceName(service) + "/" + serviceName(service) + "-custom";
        createCustomFile(customDir, model, "domain-service-operation-default.ftl",
                "src/main/java/" + project.packageName().replace(".", "/") + "/custom/Default" + typeName + ".java");
    }

    /**
     * The executable-body model of an operation with an explicit modeled body (operation-body.md
     * §5, Phase 3b). Generates real control-flow structure — {@code if}, {@code for},
     * precondition guards — that delegates every leaf (predicate, collection, effect) to a typed
     * {@code (context, loopVars…)} hook the developer implements. Always compiles: the structure is
     * closed and the hooks are stubbed. Returns {@code {body, hooks}} for the template.
     */
    private Map<String, Object> executableBodyModel(OperationEntity operation) {
        var hooks = new java.util.LinkedHashMap<String, Map<String, Object>>();
        var body = executableSteps(operation.steps(), List.of(), hooks, new HashSet<>());
        return Map.of("body", body, "hooks", new ArrayList<>(hooks.values()));
    }

    private List<Map<String, Object>> executableSteps(List<OperationStepEntity> steps,
            List<String> loopVars, Map<String, Map<String, Object>> hooks, java.util.Set<String> usedNames) {
        if (steps == null || steps.isEmpty()) return List.of();
        var out = new ArrayList<Map<String, Object>>();
        for (var step : steps) {
            var type = step.type();
            var name = uniqueHookName(step, usedNames);
            var call = "context" + loopVars.stream().map(v -> ", " + v).reduce("", String::concat);
            Map<String, Object> node = new HashMap<>();
            node.put("name", name);
            node.put("call", call);
            node.put("label", (type == null ? "step" : type.name()) + (step.name() != null ? " " + step.name() : ""));
            if (type == UseCaseStepType.CheckPrecondition) {
                node.put("render", "precondition");
                registerHook(hooks, name, "boolean", loopVars);
            } else if (type == UseCaseStepType.If) {
                node.put("render", "if");
                registerHook(hooks, name, "boolean", loopVars);
                node.put("then", executableSteps(step.then(), loopVars, hooks, usedNames));
                if (step.elseSteps() != null && !step.elseSteps().isEmpty()) {
                    node.put("elseBranch", executableSteps(step.elseSteps(), loopVars, hooks, usedNames));
                }
            } else if (type == UseCaseStepType.ForEach) {
                node.put("render", "foreach");
                registerHook(hooks, name, "Iterable<Object>", loopVars);
                var itemVar = (step.itemVar() == null || step.itemVar().isBlank())
                        ? "item" + (loopVars.size() + 1) : sanitizeIdentifier(step.itemVar());
                node.put("itemVar", itemVar);
                var inner = new ArrayList<>(loopVars);
                inner.add(itemVar);
                node.put("body", executableSteps(step.body(), inner, hooks, usedNames));
            } else {
                // Every leaf (mutation, event, call, custom) is a typed two-zone hook: the developer
                // writes the body with the right types/imports. Inlining a free-text value/expression
                // is not compile-safe (type of the context setter, imports) — dogfooding confirmed it.
                node.put("render", "call");
                registerHook(hooks, name, "void", loopVars);
            }
            out.add(node);
        }
        return out;
    }

    private void registerHook(Map<String, Map<String, Object>> hooks, String name, String returnType,
            List<String> params) {
        Map<String, Object> hook = new HashMap<>();
        hook.put("name", name);
        hook.put("returnType", returnType);
        hook.put("params", new ArrayList<>(params));
        hooks.put(name, hook);
    }

    /** A unique Java identifier for a step's hook, so no two hooks collide on name or arity. */
    private String uniqueHookName(OperationStepEntity step, java.util.Set<String> used) {
        var base = sanitizeIdentifier(step.name());
        if (base.isEmpty()) {
            base = step.type() == null ? "step" : uncapitalize(step.type().name());
        }
        var name = base;
        var i = 1;
        while (used.contains(name)) {
            name = base + "_" + (++i);
        }
        used.add(name);
        return name;
    }

    private String sanitizeIdentifier(String raw) {
        if (raw == null) return "";
        var cleaned = raw.replaceAll("[^A-Za-z0-9]", "");
        if (cleaned.isEmpty()) return "";
        var first = Character.toLowerCase(cleaned.charAt(0));
        return first + cleaned.substring(1);
    }

    private List<Map<String, Object>> stepsToModel(List<OperationStepEntity> steps) {
        if (steps == null || steps.isEmpty()) return List.of();
        var out = new ArrayList<Map<String, Object>>();
        for (var step : steps) {
            Map<String, Object> m = new HashMap<>();
            m.put("type", step.type() == null ? null : step.type().name());
            m.put("name", step.name());
            if (step.intent() != null) m.put("intent", step.intent());
            if (step.fieldName() != null) m.put("fieldName", step.fieldName());
            if (step.value() != null) m.put("value", step.value());
            if (step.condition() != null) m.put("condition", step.condition());
            if (step.collection() != null) m.put("collection", step.collection());
            if (step.itemVar() != null) m.put("itemVar", step.itemVar());
            var thenModel = stepsToModel(step.then());
            if (!thenModel.isEmpty()) m.put("then", thenModel);
            var elseModel = stepsToModel(step.elseSteps());
            if (!elseModel.isEmpty()) m.put("elseBranch", elseModel);
            var bodyModel = stepsToModel(step.body());
            if (!bodyModel.isEmpty()) m.put("body", bodyModel);
            out.add(m);
        }
        return out;
    }

    /**
     * The IdP the project's app authenticates against: the first UI adapter declaring
     * one WITH an issuer (an issuer-less IdP cannot configure OIDC — the SecurityConfig
     * stays permissive until the ficha declares it).
     */
    private java.util.Optional<Map<String, Object>> idpFor(ProjectEntity project) {
        return repository.findAllOfType(UiAdapterEntity.class).stream()
                .filter(a -> inProject(a.projectId(), project))
                // the store iterates unordered: sort so two adapters with different IdPs
                // don't make the chosen one flip between generations
                .sorted(java.util.Comparator.comparing(UiAdapterEntity::name,
                        java.util.Comparator.nullsLast(String::compareTo)))
                .map(UiAdapterEntity::identityProviderId)
                .filter(id -> id != null && !id.isBlank())
                .flatMap(id -> repository.findById(id, IdentityProviderEntity.class).stream())
                .filter(idp -> idp.issuer() != null && !idp.issuer().isBlank())
                .findFirst()
                .map(idp -> {
                    var map = new HashMap<String, Object>();
                    map.put("name", idp.name());
                    map.put("slug", idp.name().toLowerCase().replaceAll("[^a-z0-9]+", "-"));
                    var issuer = idp.issuer().trim();
                    map.put("issuer", issuer);
                    // A keycloak-style issuer (https://host/realms/<realm>) splits into the
                    // pieces @KeycloakSecured and the local keycloak provisioning need.
                    var realmsIdx = issuer.indexOf("/realms/");
                    if (realmsIdx > 0) {
                        map.put("url", issuer.substring(0, realmsIdx));
                        map.put("realm", issuer.substring(realmsIdx + "/realms/".length()).replaceAll("/.*$", ""));
                    } else {
                        map.put("url", issuer);
                        map.put("realm", "master");
                    }
                    map.put("type", idp.type() == null ? "CORPORATE" : idp.type());
                    return map;
                });
    }

    /** Every node of a content tree, depth-first. */
    private static java.util.stream.Stream<UiComponentNodeEntity> flattenContent(List<UiComponentNodeEntity> nodes) {
        if (nodes == null) return java.util.stream.Stream.empty();
        return nodes.stream().flatMap(n -> java.util.stream.Stream.concat(
                java.util.stream.Stream.of(n), flattenContent(n.children())));
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase() + value.substring(1);
    }

    /** A safe Java type name from a model name: strip non-identifier chars and capitalize. */
    private String typeName(String value) {
        if (value == null || value.isBlank()) {
            return "Object";
        }
        var cleaned = value.replaceAll("[^A-Za-z0-9]", "");
        if (cleaned.isEmpty()) {
            return "Object";
        }
        return cleaned.substring(0, 1).toUpperCase() + cleaned.substring(1);
    }

    private String uncapitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toLowerCase() + value.substring(1);
    }

    /** Converts an arbitrary name to a PascalCase Java type name (alphanumerics only). */
    private String toTypeName(String name) {
        if (name == null || name.isBlank()) return "Type";
        var sb = new StringBuilder();
        boolean upperNext = true;
        for (var c : name.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                sb.append(upperNext ? Character.toUpperCase(c) : c);
                upperNext = false;
            } else {
                upperNext = true;
            }
        }
        var result = sb.toString();
        if (result.isEmpty()) return "Type";
        if (Character.isDigit(result.charAt(0))) result = "_" + result;
        return result;
    }

    /** Converts "booking service" or "booking-service" to "booking-service" (kebab-case slug) */
    private String serviceName(ServiceEntity service) {
        return service.name().toLowerCase().replaceAll("[\\s_]+", "-");
    }

    /** Converts "My BoundedContext" or "my-boundedContext" to "myboundedContext" (no separator, lower) */
    private String boundedContextSlug(String name) {
        return name.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    /** Converts "booking service" or "booking-service" to "BookingService" (PascalCase) */
    private String toClassName(String name) {
        if (name == null || name.isBlank()) return "App";
        // Mirrors the class-name logic in application.ftl (cap-first per word, preserving internal case)
        return Arrays.stream(name.replace("-", " ").replace("_", " ").split("\\s+"))
                .map(w -> w.isEmpty() ? "" : Character.toUpperCase(w.charAt(0)) + w.substring(1))
                .collect(java.util.stream.Collectors.joining());
    }
}
