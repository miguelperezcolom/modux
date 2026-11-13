package io.mateu.modux.modeldrivengenerator.infra.out.persistence.home;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

/**
 * The user's machine-local modux configuration, at ~/.modux (overridable with
 * -Dmodux.home for tests). Holds what must NEVER travel with a model store —
 * today the repository catalog (local folders / git URLs where files live).
 */
@Service
@Slf4j
public class ModuxHomeStore {

    /** ~/.modux/repositories.yaml — the only file so far. */
    record HomeRepositories(List<RepositoryEntity> repositories) {
        HomeRepositories {
            repositories = repositories != null ? repositories : List.of();
        }
    }

    private final YAMLMapper yaml = YAMLMapper.builder()
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .serializationInclusion(JsonInclude.Include.NON_NULL)
            .build();

    public Path homeDir() {
        return Path.of(System.getProperty("modux.home",
                System.getProperty("user.home") + "/.modux"));
    }

    private Path repositoriesFile() {
        return homeDir().resolve("repositories.yaml");
    }

    @SneakyThrows
    public synchronized List<RepositoryEntity> loadRepositories() {
        var file = repositoriesFile();
        if (!Files.exists(file)) return List.of();
        return yaml.readValue(Files.readString(file), HomeRepositories.class).repositories();
    }

    private Path currentFile() {
        return homeDir().resolve("current.yaml");
    }

    /** ~/.modux/current.yaml — which repository is open, and which of its projects. */
    record CurrentProject(String repositoryId, String projectId) {}

    @SneakyThrows
    private CurrentProject loadCurrent() {
        var file = currentFile();
        if (!Files.exists(file)) return new CurrentProject(null, null);
        return yaml.readValue(Files.readString(file), CurrentProject.class);
    }

    @SneakyThrows
    private synchronized void saveCurrent(CurrentProject current) {
        Files.createDirectories(homeDir());
        Files.writeString(currentFile(), yaml.writeValueAsString(current));
    }

    public synchronized Optional<String> loadCurrentRepositoryId() {
        return Optional.ofNullable(loadCurrent().repositoryId());
    }

    public synchronized void saveCurrentRepositoryId(String repositoryId) {
        saveCurrent(new CurrentProject(repositoryId, loadCurrent().projectId()));
    }

    public synchronized Optional<String> loadCurrentProjectId() {
        return Optional.ofNullable(loadCurrent().projectId());
    }

    public synchronized void saveCurrentProjectId(String projectId) {
        saveCurrent(new CurrentProject(loadCurrent().repositoryId(), projectId));
    }

    @SneakyThrows
    public synchronized void saveRepositories(List<RepositoryEntity> repositories) {
        var file = repositoriesFile();
        Files.createDirectories(file.getParent());
        Files.writeString(file, yaml.writeValueAsString(new HomeRepositories(repositories)));
        log.info("repositories saved to {}", file.toAbsolutePath());
    }
}
