package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AllData;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.GranularYamlStorageFormat;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.MonolithicYamlStorageFormat;

import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

/**
 * Locates and reads the model a build generates from.
 *
 * <p>A repository is a project: the model lives in one directory (<code>modux/</code> by
 * convention) and holds exactly one project element, so nothing here has to ask which project
 * is "current". See {@code docs/design/ide-plugin.md}.
 */
final class ModuxModel {

    /** Where a project keeps its model, relative to the module the build runs in. */
    static final String DEFAULT_PATH = "modux";

    /** The catalog directory the IDE plugin creates (its name is the marker, §12.3). */
    static final String CATALOG_DIR = ".modux";

    /**
     * The model directory a build should read. The parameter defaults to {@code modux/}, but a
     * repository initialised from the IDE plugin keeps its catalog in {@code .modux/}: when the
     * default is absent and the catalog is there, that is the model.
     */
    static Path locate(String configured) {
        var path = Path.of(configured);
        if (Files.exists(path) || !DEFAULT_PATH.equals(String.valueOf(path.getFileName()))) return path;
        var catalog = path.resolveSibling(CATALOG_DIR);
        return Files.isDirectory(catalog) ? catalog : path;
    }

    /**
     * The model a goal that predates {@code modelPath} writes to: the deprecated {@code specFile}
     * when one is given, the located {@code modelPath} otherwise.
     */
    static Path modelFile(String modelPath, String specFile) {
        return specFile != null && !specFile.isBlank() ? Path.of(specFile) : locate(modelPath);
    }

    private final Path root;
    private final AllData data;

    private ModuxModel(Path root, AllData data) {
        this.root = root;
        this.data = data;
    }

    /** Read the model at {@code path}, granular or monolithic. */
    static ModuxModel read(Path path) throws Exception {
        if (!Files.exists(path)) {
            throw new IllegalStateException(
                    "No model at " + path.toAbsolutePath()
                            + ". A repository is one project: the model goes in " + CATALOG_DIR + "/ (or " + DEFAULT_PATH + "/).");
        }
        var granular = new GranularYamlStorageFormat();
        var data = granular.handles(path)
                ? granular.load(path)
                : new MonolithicYamlStorageFormat().load(path);
        return new ModuxModel(path, data);
    }

    Path root() {
        return root;
    }

    AllData data() {
        return data;
    }

    /**
     * The project this repository holds. Fails loudly when there is none, and when there is
     * more than one — that is a store that predates one-project-per-repository and needs
     * splitting, not a case to guess at.
     */
    Object project() {
        var projects = listOf("projects");
        if (projects.isEmpty()) {
            throw new IllegalStateException("The model at " + root + " has no project");
        }
        if (projects.size() > 1) {
            throw new IllegalStateException(
                    "The model at " + root + " has " + projects.size() + " projects. "
                            + "A repository is one project: split them into separate repositories.");
        }
        return projects.get(0);
    }

    /** Read a property off the project element by accessor name. */
    Optional<String> projectString(String property) {
        try {
            var value = project().getClass().getMethod(property).invoke(project());
            return value == null || value.toString().isBlank()
                    ? Optional.empty()
                    : Optional.of(value.toString());
        } catch (ReflectiveOperationException e) {
            return Optional.empty();
        }
    }

    /** One of {@code AllData}'s lists, by record component name. */
    @SuppressWarnings("unchecked")
    List<Object> listOf(String component) {
        for (RecordComponent rc : AllData.class.getRecordComponents()) {
            if (!rc.getName().equals(component)) continue;
            try {
                var value = rc.getAccessor().invoke(data);
                return value == null ? List.of() : (List<Object>) value;
            } catch (ReflectiveOperationException e) {
                return List.of();
            }
        }
        return List.of();
    }

    /** Every element in the model, paired with the type bucket it came from. */
    List<Element> elements() {
        return java.util.Arrays.stream(AllData.class.getRecordComponents())
                .flatMap(rc -> listOf(rc.getName()).stream().map(e -> new Element(rc.getName(), e)))
                .toList();
    }

    record Element(String type, Object value) {}
}
