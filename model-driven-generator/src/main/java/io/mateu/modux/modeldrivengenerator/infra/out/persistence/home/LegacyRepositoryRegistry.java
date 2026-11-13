package io.mateu.modux.modeldrivengenerator.infra.out.persistence.home;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReferencedProjectEntity;
import lombok.extern.slf4j.Slf4j;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads {@code ~/.modux/repositories.yaml} for the sole purpose of not losing what it said.
 *
 * <p>Project references used to point at an entry in that file — a registry that lived on one
 * machine and outside version control, so the same model meant different things to different
 * people, or nothing at all. The pointer is a coordinate stored in the model now (§4.7), and this
 * class is the one-way door between the two: read once, on load, converted, and never consulted
 * again. It is deliberately static and dependency-free — nothing should grow a reliance on the
 * home directory through it.
 */
@Slf4j
public final class LegacyRepositoryRegistry {

    private LegacyRepositoryRegistry() {}

    private record HomeRepositories(List<RepositoryEntity> repositories) {
        HomeRepositories {
            repositories = repositories != null ? repositories : List.of();
        }
    }

    /**
     * Every registry entry as a coordinate, by the id references used to carry. Empty — never
     * absent — when there is no registry, which is the normal case on any machine but the one it
     * was written on. That emptiness is the point: a model whose references were already
     * migrated, or that arrived from someone else, must load exactly the same.
     *
     * @param modelRoot the referencing model's root, so a local folder becomes a relative path
     */
    public static Map<String, ReferencedProjectEntity> coordinatesById(Path modelRoot) {
        var file = registryFile();
        if (!Files.exists(file)) return Map.of();
        var coordinates = new HashMap<String, ReferencedProjectEntity>();
        try {
            var mapper = YAMLMapper.builder()
                    .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .build();
            for (var repo : mapper.readValue(Files.readString(file), HomeRepositories.class).repositories()) {
                if (repo.id() == null) continue;
                coordinates.put(repo.id(), coordinateOf(repo, modelRoot));
            }
        } catch (Exception e) {
            log.warn("could not read {} to migrate the project references: {}",
                    file, e.getMessage());
            return Map.of();
        }
        return coordinates;
    }

    private static ReferencedProjectEntity coordinateOf(RepositoryEntity repo, Path modelRoot) {
        return ReferencedProjectEntity.builder()
                .gitUrl(blank(repo.gitUrl()) ? null : repo.gitUrl().trim())
                .branch(blank(repo.branch()) ? null : repo.branch().trim())
                .path(pathOf(repo, modelRoot))
                .build();
    }

    /**
     * A local folder, expressed relative to the referencing model when they share an ancestor.
     * That is what turns a machine path into something a teammate can also resolve — and when
     * they do not share one, the absolute path is still better than losing the pointer.
     */
    private static String pathOf(RepositoryEntity repo, Path modelRoot) {
        if (blank(repo.folder())) return null;
        var folder = repo.folder().trim();
        var absolute = folder.startsWith("~")
                ? Path.of(System.getProperty("user.home") + folder.substring(1))
                : Path.of(folder);
        absolute = absolute.toAbsolutePath().normalize();
        if (modelRoot == null) return absolute.toString();
        try {
            return modelRoot.toAbsolutePath().normalize().relativize(absolute).toString();
        } catch (IllegalArgumentException e) {
            return absolute.toString(); // different roots — nothing relative to say
        }
    }

    private static Path registryFile() {
        return Path.of(System.getProperty("modux.home",
                System.getProperty("user.home") + "/.modux")).resolve("repositories.yaml");
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
