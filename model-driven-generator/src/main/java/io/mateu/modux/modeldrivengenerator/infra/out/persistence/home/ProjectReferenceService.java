package io.mateu.modux.modeldrivengenerator.infra.out.persistence.home;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AllData;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReferencedProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.GranularYamlStorageFormat;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.storage.MonolithicYamlStorageFormat;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Reads ANOTHER project's store, read-only, to reference it as an external system.
 *
 * <p>Every project is a system, and with one project per repository (§4.6) naming another project
 * is naming another repository. What is read here is only ever a <em>snapshot</em>: the name and
 * the public surface are copied into this model and that copy is what generation uses. Losing
 * access to the other repository therefore breaks nothing — the build stays hermetic, and the
 * coordinate is consulted only when someone asks to refresh the reference (§4.7).
 */
@Service
@RequiredArgsConstructor
public class ProjectReferenceService {

    final CommonFileRepository repository;

    /** What another project shows to the outside: its name and public surface. */
    public record ProjectSummary(String name, List<Ref> useCases, List<Ref> apis) {}

    public record Ref(String id, String name) {}

    @SneakyThrows
    public ProjectSummary read(ReferencedProjectEntity coordinate) {
        var location = locate(coordinate);
        var monolithic = location.resolve("model-driven-store.yaml");
        var storePath = Files.exists(monolithic) ? monolithic : location;
        var data = loadStore(storePath);
        var fallback = coordinate.repositoryName();
        var name = data.projects().stream().findFirst()
                .map(p -> p.name() == null ? fallback : p.name())
                .orElse(fallback);
        var useCases = data.useCases().stream()
                .filter(uc -> uc.exposedAsRest() || uc.exposedAsGrpc() || uc.exposedAsMcp()
                        || uc.exposedAsAsync())
                .map(uc -> new Ref(uc.id(), uc.name()))
                .toList();
        var apis = data.apis().stream().map(a -> new Ref(a.id(), a.name())).toList();
        return new ProjectSummary(name, useCases, apis);
    }

    /**
     * Where the referenced model root is on this machine.
     *
     * <p>An explicit path wins. Otherwise the checkout is guessed from the repository's name,
     * beside this one — which is where it is while you work on both at once, and which is why the
     * git URL alone is usually enough. Guessing is a derivation, not a registry: nothing is
     * stored, nothing has to be configured, and nothing reaches the network.
     */
    Path locate(ReferencedProjectEntity coordinate) {
        var here = modelRoot();
        if (coordinate.path() != null && !coordinate.path().isBlank()) {
            var resolved = expand(coordinate.path().trim(), here);
            if (!Files.isDirectory(resolved)) {
                throw new IllegalArgumentException(
                        "The referenced project is not at " + resolved + " (the coordinate's path)");
            }
            return resolved;
        }
        var name = coordinate.repositoryName();
        if (name == null) {
            throw new IllegalArgumentException(
                    "The reference does not say where the project lives: it needs a git URL or a path");
        }
        for (var candidate : siblingCandidates(here, name)) {
            if (Files.isDirectory(candidate)) return candidate;
        }
        throw new IllegalArgumentException(
                "No checkout of " + name + " found next to this repository. Clone it alongside,"
                        + " or give the reference a path.");
    }

    /**
     * Where a sibling checkout of {@code name} would be. Both shapes are tried because a model
     * root is conventionally {@code <repo>/modux} (§4.6), but a bare model directory is also a
     * project.
     */
    private static List<Path> siblingCandidates(Path here, String name) {
        var repoRoot = here.getParent();
        var siblings = repoRoot == null ? null : repoRoot.getParent();
        if (siblings == null) return List.of();
        return List.of(
                siblings.resolve(name).resolve("modux"),
                siblings.resolve(name));
    }

    /** This model's root directory — a granular tree is one, a monolithic file lives in one. */
    private Path modelRoot() {
        var path = repository.storePath().toAbsolutePath().normalize();
        return Files.isDirectory(path) ? path : path.getParent();
    }

    private static Path expand(String path, Path base) {
        if (path.startsWith("~")) {
            return Path.of(System.getProperty("user.home") + path.substring(1)).normalize();
        }
        var candidate = Path.of(path);
        return (candidate.isAbsolute() ? candidate : base.resolve(candidate)).normalize();
    }

    @SneakyThrows
    private AllData loadStore(Path storePath) {
        var granular = new GranularYamlStorageFormat();
        if (granular.handles(storePath)) return granular.load(storePath);
        return new MonolithicYamlStorageFormat().load(storePath);
    }
}
