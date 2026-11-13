package io.mateu.modux.modeldrivengenerator.infra.out.persistence.home;

import io.mateu.modux.modeldrivengenerator.application.out.ProjectStorePort;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.repository.Repository;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Opens the project a repository points at. A folder repository is used in place;
 * a git repository gets a working checkout under ~/.modux/checkouts/&lt;id&gt; (cloned
 * on first open). The store inside is the folder's model-driven-store.yaml when
 * present, or the folder itself as a granular store (authoring from scratch).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RepositoryStoreOpener implements ProjectStorePort {

    final ModuxHomeStore home;
    final CommonFileRepository repository;

    @Override
    @SneakyThrows
    public Path open(Repository repo) {
        if (repo.getType() == io.mateu.modux.modeldrivengenerator.domain.aggregates.repository.vo.RepositoryType.DATABASE) {
            return openDatabase(repo);
        }
        var location = resolveLocation(repo);
        Files.createDirectories(location);
        var monolithic = location.resolve("model-driven-store.yaml");
        var storePath = Files.exists(monolithic) ? monolithic : location;
        repository.loadFrom(storePath.toString());
        home.saveCurrentRepositoryId(repo.getId().id());
        // A project selection from another repository does not survive the switch.
        selectProject(home.loadCurrentProjectId().orElse(null));
        adoptOrphans();
        log.info("project opened from repository {} at {}", repo.getName().name(), storePath);
        return storePath;
    }

    @Override
    public Optional<String> currentRepositoryId() {
        return home.loadCurrentRepositoryId();
    }

    @Override
    public Optional<String> currentProjectId() {
        return home.loadCurrentProjectId();
    }

    @Override
    public void selectProject(String projectId) {
        var projects = repository.findAllOfType(
                io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity.class);
        var resolved = projects.stream()
                .filter(pr -> pr.id().equals(projectId))
                .findFirst()
                .or(() -> projects.stream().findFirst())
                .map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity::id)
                .orElse(null);
        home.saveCurrentProjectId(resolved);
        // The store scopes the CRUD listings to the selection and stamps new elements with it.
        repository.setCurrentProjectId(resolved);
    }

    /** Elements predating project scoping get adopted by the working project on open. */
    private void adoptOrphans() {
        currentProjectId().ifPresent(projectId -> {
            var claimed = repository.claimOrphans(projectId);
            if (claimed > 0) {
                log.info("{} project-less elements adopted by project '{}'", claimed, projectId);
            }
        });
    }

    /** A DATABASE repository: the catalog loads from rows. */
    private Path openDatabase(Repository repo) {
        var db = new io.mateu.modux.modeldrivengenerator.infra.out.db.JdbcModelDatabase(
                repo.getJdbcUrl(),
                System.getenv().getOrDefault("MODUX_DB_USER", ""),
                System.getenv().getOrDefault("MODUX_DB_PASSWORD", ""));
        repository.openDatabase(db);
        home.saveCurrentRepositoryId(repo.getId().id());
        selectProject(home.loadCurrentProjectId().orElse(null));
        adoptOrphans();
        log.info("project opened from DATABASE repository {} ({})",
                repo.getName().name(), repo.getJdbcUrl());
        return home.homeDir();
    }

    private Path resolveLocation(Repository repo) {
        if (repo.getType() == io.mateu.modux.modeldrivengenerator.domain.aggregates.repository.vo.RepositoryType.GIT) {
            return checkoutOf(repo);
        }
        return expandTilde(repo.getFolder());
    }

    @SneakyThrows
    private Path checkoutOf(Repository repo) {
        var dir = home.homeDir().resolve("checkouts").resolve(repo.getId().id());
        if (Files.exists(dir.resolve(".git"))) return dir;
        Files.createDirectories(dir.getParent());
        var command = new java.util.ArrayList<>(java.util.List.of("git", "clone"));
        if (repo.getBranch() != null && !repo.getBranch().isBlank()) {
            command.addAll(java.util.List.of("--branch", repo.getBranch()));
        }
        command.addAll(java.util.List.of(repo.getGitUrl(), dir.toString()));
        log.info("cloning {} into {}", repo.getGitUrl(), dir);
        var process = new ProcessBuilder(command).redirectErrorStream(true).start();
        var output = new String(process.getInputStream().readAllBytes());
        if (!process.waitFor(120, TimeUnit.SECONDS) || process.exitValue() != 0) {
            throw new IllegalStateException("Could not clone " + repo.getGitUrl() + ": " + output);
        }
        return dir;
    }

    private static Path expandTilde(String folder) {
        var trimmed = folder.trim();
        if (trimmed.startsWith("~")) {
            return Path.of(System.getProperty("user.home") + trimmed.substring(1));
        }
        return Path.of(trimmed);
    }
}
