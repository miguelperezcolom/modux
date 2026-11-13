package io.mateu.modux.modeldrivengenerator.application.usecases.project.registry;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DeploymentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;

/**
 * ONE resolution for the image registry, shared by generation (the manifests must
 * reference the image the pipeline pushes) and deployment:
 *
 * <ol>
 *   <li>{@code dockerImageRegistry} on the service;
 *   <li>{@code dockerRegistry} on the project;
 *   <li>the {@code modux.docker.registry} system property / {@code MODUX_DOCKER_REGISTRY};
 *   <li>a LOCAL registry answering at {@code localhost:5000} — the zero-config default
 *       for the local loop: push and pull never leave the machine (k3s allows it as an
 *       insecure registry). Useless for a REMOTE cluster, which cannot see your
 *       localhost: declare a real registry on the project when you target one.
 * </ol>
 */
@Service
@Slf4j
@lombok.RequiredArgsConstructor
public class ImageRegistryResolver {

    private final io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore repository;

    public static final String LOCAL_REGISTRY = "localhost:5000";

    private static final Duration PROBE_TIMEOUT = Duration.ofMillis(800);
    private static final Duration PROBE_TTL = Duration.ofSeconds(30);

    private volatile boolean localReachable;
    private volatile long probedAt;

    /** The registry to build/push/reference images with, or empty when nothing applies. */
    public Optional<String> resolve(ServiceEntity service, ProjectEntity project) {
        if (service.dockerImageRegistry() != null && !service.dockerImageRegistry().isBlank()) {
            return Optional.of(trimSlash(service.dockerImageRegistry()));
        }
        var projectRegistry = deploymentOf(project).dockerRegistry();
        if (projectRegistry != null && !projectRegistry.isBlank()) {
            return Optional.of(trimSlash(projectRegistry));
        }
        var property = System.getProperty("modux.docker.registry", System.getenv("MODUX_DOCKER_REGISTRY"));
        if (property != null && !property.isBlank()) {
            return Optional.of(trimSlash(property));
        }
        if (localRegistryReachable()) {
            return Optional.of(LOCAL_REGISTRY);
        }
        return Optional.empty();
    }

    /** Is a registry answering at localhost:5000? Probed cheaply, cached briefly. */
    public boolean localRegistryReachable() {
        var now = System.currentTimeMillis();
        if (now - probedAt > PROBE_TTL.toMillis()) {
            localReachable = probe();
            probedAt = now;
        }
        return localReachable;
    }

    private boolean probe() {
        try (var client = HttpClient.newBuilder().connectTimeout(PROBE_TIMEOUT).build()) {
            var response = client.send(
                    HttpRequest.newBuilder(URI.create("http://" + LOCAL_REGISTRY + "/v2/"))
                            .timeout(PROBE_TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.discarding());
            // 200 or 401 both mean "a registry lives here"
            return response.statusCode() == 200 || response.statusCode() == 401;
        } catch (Exception e) {
            log.debug("no local registry at {}: {}", LOCAL_REGISTRY, e.getMessage());
            return false;
        }
    }

    /** The project's deployment element, falling back to a not-yet-migrated project's own fields. */
    private DeploymentEntity deploymentOf(ProjectEntity project) {
        return repository.findById(DeploymentEntity.idFor(project.id()), DeploymentEntity.class)
                .orElseGet(() -> DeploymentEntity.isCarriedBy(project)
                        ? DeploymentEntity.fromLegacy(project)
                        : DeploymentEntity.emptyFor(project.id()));
    }

    private static String trimSlash(String s) {
        var trimmed = s.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
