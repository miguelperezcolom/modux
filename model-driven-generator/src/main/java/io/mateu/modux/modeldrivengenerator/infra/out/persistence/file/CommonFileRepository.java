package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology;
import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;
import jakarta.annotation.PostConstruct;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class CommonFileRepository implements io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore {

    // Guarded by `this`: the editor fires commands, layout PUTs and reloads
    // concurrently — an unsynchronized map silently loses puts (seen in the wild:
    // an aggregate saved but never linked to its boundedContext).
    private final Map<String, Object> store = new HashMap<>();

    /** Directory that holds the resolved model store; generated schema is written next to it. */
    private Path dataDir = Path.of(".dev/data");

    /** The resolved model store path; persist writes back here (consistent with where it was read). */
    private Path storePath = Path.of(".dev/data/model-driven-store.yaml");

    private final io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.MonolithicYamlStorageFormat monolithicFormat;
    private final io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.GranularYamlStorageFormat granularFormat;
    private final ModelJsonSchemaGenerator schemaGenerator;
    /** The format the model was loaded with; persist writes back in the same format. */
    private io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.ModelStorageFormat activeFormat;

    /** True after a scoped (partial) load: only a slice of a granular model is in memory, so it is read-only. */
    private boolean scoped;

    /** Non-null when the open repository is DATABASE-backed: rows instead of files. */
    private io.mateu.modux.modeldrivengenerator.infra.out.db.JdbcModelDatabase jdbc;

    /** True when the store path did not exist at load time (authoring from scratch). */
    private boolean startedFromScratch;

    public CommonFileRepository(
            io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.MonolithicYamlStorageFormat monolithicFormat,
            io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.GranularYamlStorageFormat granularFormat,
            ModelJsonSchemaGenerator schemaGenerator) {
        this.monolithicFormat = monolithicFormat;
        this.granularFormat = granularFormat;
        this.schemaGenerator = schemaGenerator;
        this.activeFormat = monolithicFormat;
    }

    private String storeKey(String id, Class<?> type) {
        return type.getSimpleName() + ":" + id;
    }

    public synchronized <T> Optional<T> findById(String id, Class<T> type) {
        return Optional.ofNullable((T) store.get(storeKey(id, type)));
    }
    public synchronized void save(Identifiable o) {
        o = ProjectScope.stamped(o, currentProjectId);
        store.put(storeKey(o.id(), o.getClass()), o);
        // a bounded context is born with its main module, whoever saves it
        if (o instanceof BoundedContextEntity boundedContext) {
            var modules = findAllOfType(ModuleEntity.class);
            if (ModuleTopology.mainModuleOf(modules, boundedContext.id()) == null) {
                var main = ProjectScope.stamped(ModuleTopology.mainModuleFor(boundedContext), currentProjectId);
                store.put(storeKey(main.id(), main.getClass()), main);
            }
        }
        persist();
    }

    /**
     * The selected project: new elements are stamped with it on save, and the CRUD
     * listing (findAll) narrows to it. Kept here (pushed by the project selector)
     * so the store needs no dependency on the selection port.
     */
    private volatile String currentProjectId;

    public void setCurrentProjectId(String projectId) {
        this.currentProjectId = projectId;
    }

    /**
     * Adopts every element that predates project scoping: whatever has a projectId
     * component still null gets the given project. One persist for the whole sweep.
     */
    public synchronized int claimOrphans(String projectId) {
        if (projectId == null || projectId.isBlank()) return 0;
        var claimed = 0;
        for (var entry : new java.util.ArrayList<>(store.entrySet())) {
            var element = entry.getValue();
            if (element instanceof ProjectEntity) continue;
            var stampedElement = ProjectScope.stamped(element, projectId);
            if (stampedElement != element) {
                store.put(entry.getKey(), stampedElement);
                claimed++;
            }
        }
        if (claimed > 0) persist();
        return claimed;
    }

    /** Puts an entity into the in-memory store without persisting to disk (transient/derived data). */
    public synchronized void putTransient(Identifiable o) {
        store.put(storeKey(o.id(), o.getClass()), o);
    }

    public synchronized <T> List<T> findAllOfType(Class<T> type) {
        return (List<T>) store.values().stream()
                .filter(v -> v.getClass().equals(type))
                .toList();
    }

    /** Every catalog element currently loaded (all types), for whole-model passes like integrity checks. */
    public synchronized java.util.Collection<Object> allElements() {
        return new java.util.ArrayList<>(store.values());
    }

    public synchronized <T> void deleteAllById(List<String> list, Class<T> type) {
        list.forEach(id -> store.remove(storeKey(id, type)));
        persist();
    }

    /** The resolved store path (file, or directory for granular stores). */
    public Path storePath() {
        return storePath;
    }

    /**
     * True when no store existed at the given path — fine for authoring modes (MCP, UI, watch),
     * but validation/generation gates should refuse to run against a phantom empty model
     * (a typo'd path would otherwise pass green or fork the store).
     */
    public boolean startedFromScratch() {
        return startedFromScratch;
    }

    private String overrideModelFile;

    /** When WE last wrote the store — the file watcher must not mistake it for an external edit. */
    private volatile long lastPersistAt;

    public long lastPersistAt() {
        return lastPersistAt;
    }

    /** Loads the model from a specific store file (replacing whatever is loaded), then re-initialises. */
    public synchronized void loadFrom(String modelFilePath) {
        this.overrideModelFile = modelFilePath;
        // The selection belongs to the OLD store: whoever opens the new one selects
        // again (RepositoryStoreOpener does); a stale id would mis-stamp new elements.
        this.currentProjectId = null;
        init();
    }

    /** Re-read the catalog from the underlying persistence (files or database). */
    @Override
    public synchronized void reload() {
        if (jdbc != null) {
            loadIntoStore(jdbc.load(jdbc.getCurrentWorkspace()));
            return;
        }
        init();
    }

    /** Open a DATABASE-backed repository: the catalog loads from rows and persists to rows. */
    public synchronized void openDatabase(io.mateu.modux.modeldrivengenerator.infra.out.db.JdbcModelDatabase db) {
        this.jdbc = db;
        this.currentProjectId = null;
        this.scoped = false;
        this.startedFromScratch = false;
        loadIntoStore(db.load(db.getCurrentWorkspace()));
        log.info("spec store (JDBC) in workspace {}", db.getCurrentWorkspace());
    }

    @SneakyThrows
    @PostConstruct
    public synchronized void init() {
        var specFile = overrideModelFile != null ? overrideModelFile
                : System.getProperty("modux.model-file", ".dev/data/model-driven-store.yaml");
        jdbc = null;
        scoped = false;
        storePath = Path.of(specFile).toAbsolutePath().normalize();
        startedFromScratch = !Files.exists(storePath);
        activeFormat = granularFormat.handles(storePath) ? granularFormat : monolithicFormat;
        dataDir = activeFormat.dataDir(storePath);
        log.info("spec store ({}) in {}", activeFormat.getClass().getSimpleName(), storePath);

        AllData data = activeFormat.load(storePath);
        generateSchema();
        loadIntoStore(data);
    }

    /** Flatten an {@link AllData} into the in-memory catalog, keyed by (id, type), via reflection. */
    private synchronized void loadIntoStore(AllData data) {
        store.clear();
        for (var component : AllData.class.getRecordComponents()) {
            try {
                var list = (List<?>) component.getAccessor().invoke(data);
                if (list == null) continue;
                for (var element : list) {
                    if (element instanceof Identifiable identifiable) {
                        store.put(storeKey(identifiable.id(), element.getClass()), element);
                    }
                }
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("Could not read AllData component " + component.getName(), e);
            }
        }
        hoistLegacyProjectElements();
        // after the hoist: references live on external systems, which may have just moved out
        resolveLegacyProjectReferences();
        adoptEventConductorStepTypes();
        healMainModules();
    }

    /**
     * A workflow step says what KIND of step it is in EventConductor's words, because
     * EventConductor is what runs it.
     *
     * <p>The two vocabularies had drifted: modux said {@code TASK}/{@code JOIN}/{@code SPLIT}
     * while the engine's schema says {@code ACTION}/{@code JOIN}/{@code FORK}/{@code USER_TASK}
     * and seven more. The generator papered over it by emitting {@code "ACTION"} for every step,
     * which meant a human task — a step with a role and a form — was handed to the engine as an
     * automated one. Translating at the last moment is what let that go unnoticed for so long, so
     * the translation happens here instead, once, on the way in.
     *
     * <p>A step with a role is a {@code USER_TASK}: that is what having someone assigned MEANS.
     */
    private void adoptEventConductorStepTypes() {
        for (var workflow : findAllOfType(WorkflowEntity.class)) {
            var steps = workflow.steps();
            if (steps == null || steps.isEmpty()) continue;
            var adopted = steps.stream().map(CommonFileRepository::withEventConductorType).toList();
            if (adopted.equals(steps)) continue;
            putTransient(workflow.toBuilder().steps(adopted).build());
            log.info("adopted EventConductor step types in workflow {}", workflow.id());
        }
    }

    private static WorkflowStepEntity withEventConductorType(WorkflowStepEntity step) {
        var known = io.mateu.modux.modeldrivengenerator.application.usecases.workflow
                .EventConductorSchema.stepTypes();
        var current = step.type();
        if (current != null && known.contains(current)) return step;
        var adopted = switch (current == null ? "" : current) {
            case "SPLIT" -> "FORK";
            case "JOIN" -> "JOIN";
            // TASK, or nothing said: a step with somebody assigned is a human task
            default -> step.roleId() != null || step.formPageId() != null ? "USER_TASK" : "ACTION";
        };
        return step.toBuilder().type(adopted).build();
    }

    /**
     * A reference to another modux project used to be the id of an entry in
     * {@code ~/.modux/repositories.yaml} — a registry on one machine, outside version control, so
     * the same model resolved differently for everyone else and not at all for most. It is a
     * coordinate stored in the model now ({@code docs/design/ide-plugin.md} §4.7).
     *
     * <p>Converting it needs the old registry, so it can only happen on the machine that had one;
     * anywhere else there is nothing to convert and nothing is touched. An id that the registry
     * does not explain is LEFT ALONE rather than dropped: the reference still holds its snapshot,
     * which is what generation reads, and only refreshing it needs the coordinate.
     */
    @SuppressWarnings("deprecation")
    private void resolveLegacyProjectReferences() {
        var pending = findAllOfType(ExternalSystemEntity.class).stream()
                .filter(x -> x.referencedRepositoryId() != null && x.referencedProject() == null)
                .toList();
        if (pending.isEmpty()) return;
        var known = io.mateu.modux.modeldrivengenerator.infra.out.persistence.home
                .LegacyRepositoryRegistry.coordinatesById(modelRoot());
        for (var system : pending) {
            var coordinate = known.get(system.referencedRepositoryId());
            if (coordinate == null || coordinate.isEmpty()) {
                log.warn("the reference to project '{}' from {} does not say where it lives: the ~/.modux"
                                + " registry that resolved it is gone. The snapshot is kept;"
                                + " give it a git URL or a path to be able to refresh it.",
                        system.referencedRepositoryId(), system.id());
                continue;
            }
            putTransient(system.toBuilder()
                    .referencedProject(coordinate)
                    .referencedRepositoryId(null)
                    .build());
            log.info("migrated the reference of {} to a versioned coordinate", system.id());
        }
    }

    /** This model's root directory — a granular tree is one, a monolithic file lives in one. */
    private Path modelRoot() {
        var path = storePath.toAbsolutePath().normalize();
        return Files.isDirectory(path) ? path : path.getParent();
    }

    /**
     * Strategic relations and external systems used to live INSIDE the project element. They are
     * top-level elements now, so each one is its own file and drawing a relation stops touching
     * the project's file — see {@code docs/design/ide-plugin.md} §4.3.
     *
     * <p>A store written before that still carries them nested. Hoisting them here, rather than
     * letting Jackson drop the unknown fields, is what makes the change lossless: they persist in
     * the new shape with the next save, exactly like the healed main modules below.
     */
    @SuppressWarnings("deprecation")
    private void hoistLegacyProjectElements() {
        for (var project : findAllOfType(ProjectEntity.class)) {
            var relations = project.contextMap();
            var externals = project.externalSystems();
            if ((relations == null || relations.isEmpty()) && (externals == null || externals.isEmpty())) {
                continue;
            }
            if (relations != null) relations.forEach(this::putTransient);
            if (externals != null) externals.forEach(this::putTransient);
            putTransient(project.toBuilder().contextMap(List.of()).externalSystems(List.of()).build());
            // Read-only callers (the Maven plugin) load the model on every run and never save it, so
            // this is said on every run until the files change: say what to do, not "migrated".
            log.info("project {} still nests {} relation(s) and {} external system(s): they are read as their own"
                            + " elements; save the model from the editor, or move them to contextMapRelations/ and"
                            + " externalSystems/, and this note goes away",
                    project.id(), relations == null ? 0 : relations.size(),
                    externals == null ? 0 : externals.size());
        }
        hoistLegacyDeployment();
    }

    /**
     * The deployment settings — providers, environments, tenancy — were fields of the project too.
     * They answer a different question and change on a different rhythm, so they are their own
     * element now. Same lossless migration as above: read from the legacy fields, written back in
     * the new shape, source emptied.
     */
    @SuppressWarnings("deprecation")
    private void hoistLegacyDeployment() {
        for (var project : findAllOfType(ProjectEntity.class)) {
            if (findById(DeploymentEntity.idFor(project.id()), DeploymentEntity.class).isPresent()) continue;
            if (!DeploymentEntity.isCarriedBy(project)) continue;
            putTransient(DeploymentEntity.fromLegacy(project));
            putTransient(clearDeployment(project));
            log.info("migrated the deployment settings out of project {}", project.id());
        }
    }

    @SuppressWarnings("deprecation")
    private static ProjectEntity clearDeployment(ProjectEntity p) {
        return p.toBuilder()
                .database(null).dbMigrationTool(null).terraformProvider(null)
                .terraformProviderVersion(null).terraformBackendType(null).iamProvider(null)
                .messageBrokerType(null).tracingProvider(null).metricsProvider(null)
                .loggingProvider(null).llmProvider(null).cacheProvider(null)
                .fileStorageProvider(null).emailProvider(null).secretsProvider(null)
                .cicdProvider(null).dockerRegistry(null).environments(List.of())
                .tenancyStrategy(null)
                .build();
    }

    /**
     * The invariant every store must satisfy: a bounded context always has a main
     * module. Contexts loaded without one (hand-written stores) heal on first read;
     * the module persists with the next save, like the menus do.
     */
    private void healMainModules() {
        var modules = findAllOfType(ModuleEntity.class);
        findAllOfType(BoundedContextEntity.class).stream()
                .filter(bc -> ModuleTopology.mainModuleOf(modules, bc.id()) == null)
                .forEach(bc -> putTransient(ModuleTopology.mainModuleFor(bc)));
    }

    /** The loaded model as an {@link AllData} — a read-only snapshot of the catalog. */
    public synchronized AllData snapshot() {
        return buildAllData();
    }

    /** Replace the whole catalog with the given model and persist it (semantic merges). */
    @SneakyThrows
    public synchronized void replaceWith(AllData data) {
        loadIntoStore(data);
        persist();
    }

    /** Rebuild an {@link AllData} from the in-memory catalog (inverse of {@link #loadIntoStore}). */
    private synchronized AllData buildAllData() {
        var components = AllData.class.getRecordComponents();
        var args = new Object[components.length];
        for (var i = 0; i < components.length; i++) {
            var elementType = (Class<?>) ((java.lang.reflect.ParameterizedType) components[i].getGenericType())
                    .getActualTypeArguments()[0];
            args[i] = store.values().stream().filter(v -> v.getClass().equals(elementType)).toList();
        }
        try {
            var constructor = AllData.class.getDeclaredConstructors()[0];
            constructor.setAccessible(true);
            return (AllData) constructor.newInstance(args);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Could not build AllData from the catalog", e);
        }
    }

    /** Write the loaded model out as a granular file tree (one file per element). */
    @SneakyThrows
    public synchronized void splitTo(Path dir) {
        granularFormat.save(dir.toAbsolutePath().normalize(), buildAllData());
        log.info("model split into granular store at {}", dir.toAbsolutePath().normalize());
    }

    /** Write the loaded model out as a single monolithic YAML file. */
    @SneakyThrows
    public synchronized void mergeTo(Path file) {
        monolithicFormat.save(file.toAbsolutePath().normalize(), buildAllData());
        log.info("model merged into monolithic store at {}", file.toAbsolutePath().normalize());
    }

    @SneakyThrows
    private synchronized void persist() {
        lastPersistAt = System.currentTimeMillis();
        if (scoped) {
            throw new IllegalStateException("The model is partially loaded (a view scope) and is read-only. "
                    + "Load the full model before saving.");
        }
        if (jdbc != null) {
            jdbc.replaceAll(jdbc.getCurrentWorkspace(), buildAllData());
            return;
        }
        activeFormat.save(storePath, buildAllData());
    }

    /** Begin a partial (scoped) load on a granular store: clears the catalog and marks it read-only. */
    public synchronized void beginScopedLoad() {
        if (!(activeFormat instanceof io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.GranularYamlStorageFormat)) {
            throw new IllegalStateException("Partial loading needs a granular store. Run --modux.split first, "
                    + "and point modux.model-file at the model directory.");
        }
        store.clear();
        scoped = true;
    }

    /** Load all elements of one type (e.g. "views") into the catalog; returns them. */
    @SneakyThrows
    public synchronized java.util.List<Object> loadTypeIntoStore(String componentName) {
        var elements = granularFormat.loadType(storePath, componentName);
        for (var element : elements) {
            if (element instanceof Identifiable identifiable) {
                store.put(storeKey(identifiable.id(), element.getClass()), element);
            }
        }
        return elements;
    }

    /** Load a single element by id into the catalog (lazy); returns it, or null if not a stored element. */
    @SneakyThrows
    public synchronized Object loadElementIntoStore(String id) {
        var element = granularFormat.loadElement(storePath, id);
        if (element instanceof Identifiable identifiable) {
            store.put(storeKey(identifiable.id(), element.getClass()), element);
        }
        return element;
    }

    @SneakyThrows
    private void generateSchema() {
        lastPersistAt = System.currentTimeMillis();
        JsonNode schema = schemaGenerator.fullSchema();
        String schemaJson = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(schema);
        Path schemaPath = dataDir.resolve("model-driven-store-schema.json");
        Files.createDirectories(schemaPath.getParent());
        Files.writeString(schemaPath, schemaJson);
        log.info("JSON schema written to {}", schemaPath.toAbsolutePath());
    }

}
