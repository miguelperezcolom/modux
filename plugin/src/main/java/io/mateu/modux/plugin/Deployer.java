package io.mateu.modux.plugin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * Deploys a generated system to one of the targets of {@code deploy/targets.json}: the local Docker
 * compose, or a Kubernetes context (a kind cluster gets its images loaded; any other, pushed to
 * the registry, built for linux/amd64). Then it points the DNS of the environment's hosts at the
 * ingress, with the provider the model names.
 */
public class Deployer {

    /** Runs a command in a directory, feeding it {@code stdin} when given; returns its output. */
    public interface Shell {
        String run(List<String> command, Path dir, String stdin) throws IOException, InterruptedException;
    }

    /**
     * @param composeProject the Compose project to deploy the local stack as, overriding the choice
     *                       {@link #chooseComposeProject} makes (null: let it choose)
     */
    public record Settings(String environment, String tag, boolean build, String platform, String composeProject) {
        public Settings(String environment, String tag, boolean build, String platform) {
            this(environment, tag, build, platform, null);
        }
    }

    /** Where the deploy docs explain the Compose project name and how to move a stack to it. */
    static final String COMPOSE_DOCS = "https://modux.mateu.io/manual/deploying/#the-compose-project-name";

    private final Shell shell;
    private final Consumer<String> log;
    private final Function<String, String> env;

    public Deployer(Shell shell, Consumer<String> log, Function<String, String> env) {
        this.shell = shell;
        this.log = log;
        this.env = env;
    }

    public List<String> deploy(Path output, Settings settings) throws IOException, InterruptedException {
        var targets = new ObjectMapper().readTree(output.resolve("deploy/targets.json").toFile());
        JsonNode target = null;
        var names = new ArrayList<String>();
        for (var t : targets.path("targets")) {
            names.add(t.path("name").asText());
            if (t.path("name").asText().equalsIgnoreCase(settings.environment())) target = t;
        }
        if (target == null) {
            throw new IllegalArgumentException("No environment '" + settings.environment() + "' in the model; available: "
                    + String.join(", ", names));
        }
        if (settings.build()) {
            for (var dir : targets.path("builds")) {
                log.accept("Modux: building " + dir.asText());
                shell.run(List.of("mvn", "-q", "-DskipTests", "install"), output.resolve(dir.asText()), null);
            }
        }
        if ("DOCKER".equals(target.path("target").asText())) {
            return docker(output, target, settings);
        }
        return kubernetes(output, target, settings);
    }

    private List<String> docker(Path output, JsonNode target, Settings settings) throws IOException, InterruptedException {
        var command = new ArrayList<>(List.of("docker", "compose"));
        var fresh = target.path("composeProject").asText(null);
        // a targets.json from before the project name: Compose names it after the folder, as it always did
        if (fresh != null && !fresh.isBlank()) {
            var legacy = legacyComposeName(output);
            var override = settings.composeProject() != null && !settings.composeProject().isBlank()
                    ? settings.composeProject() : env.apply("COMPOSE_PROJECT_NAME");
            var pinned = readPin(output);
            ComposeState state = null;
            if (blank(override) && blank(pinned) && !fresh.equals(legacy)) {
                state = new ComposeState(
                        hasComposeResources(fresh, output),
                        lines(shell.run(List.of("docker", "ps", "-a", "--filter", "label=" + PROJECT_LABEL + "=" + legacy,
                                "--format", "{{.Label \"" + WORKING_DIR_LABEL + "\"}}"), output, null)),
                        !lines(shell.run(List.of("docker", "volume", "ls", "-q", "--filter",
                                "label=" + PROJECT_LABEL + "=" + legacy), output, null)).isEmpty());
            }
            var choice = chooseComposeProject(fresh, legacy, output, override, pinned, state);
            pin(output, choice.name().equals(fresh) ? null : choice.name());
            if (choice.note() != null) log.accept("Modux: " + choice.note());
            command.addAll(List.of("-p", choice.name()));
        }
        log.accept("Modux: starting the system in Docker");
        command.addAll(List.of("-f", target.path("compose").asText(), "up", "-d", "--build"));
        shell.run(command, output, null);
        var urls = new ArrayList<String>();
        target.path("urls").forEach(u -> urls.add(u.asText()));
        // a targets.json from before the URLs were written: the gateway it always assumed
        return urls.isEmpty() && !target.has("urls") ? List.of("http://localhost:8088") : urls;
    }

    // ─── The Compose project name ─────────────────────────────────────────────

    static final String PROJECT_LABEL = "com.docker.compose.project";
    static final String WORKING_DIR_LABEL = "com.docker.compose.project.working_dir";
    private static final String PIN_KEY = "COMPOSE_PROJECT_NAME";
    private static final String PIN_COMMENT = "# written by mvn modux:deploy: the Compose project that holds this system's volumes; see ";

    /**
     * What Docker holds under the two candidate names: whether the new project already has
     * containers or volumes; the working directories of the containers of the legacy project (the
     * folder's name), running or stopped; and whether that legacy project has volumes.
     */
    record ComposeState(boolean freshExists, List<String> legacyContainerDirs, boolean legacyVolumes) {}

    /** The project to deploy as, and a line to tell the user when the choice deserves one. */
    record ComposeChoice(String name, String note) {}

    /**
     * Which Compose project the local stack is deployed as. A system generated before it had its
     * own name ({@code fresh}, from the project id) was deployed as the folder's name
     * ({@code legacy}) and its data lives in volumes of that project: moving it silently to the new
     * name would bring it up on empty volumes. So the legacy name is kept when THIS folder's
     * containers are there; the new one is used when there is nothing, or what there is belongs to
     * another folder (another system that happened to share the folder name: reusing its volumes
     * is the bug this fixes). Volumes with no container left say nothing about whose they are, and
     * guessing either way risks someone's data: that asks the user.
     */
    static ComposeChoice chooseComposeProject(String fresh, String legacy, Path dir, String override, String pinned,
                                              ComposeState state) {
        if (!blank(override)) return new ComposeChoice(override, null);
        if (!blank(pinned)) {
            return new ComposeChoice(pinned, pinned.equals(legacy)
                    ? "this system stays the Compose project '" + legacy + "' (pinned in .env); to move it to '"
                      + fresh + "', see " + COMPOSE_DOCS
                    : null);
        }
        if (fresh.equals(legacy) || state == null || state.freshExists()) return new ComposeChoice(fresh, null);
        if (state.legacyContainerDirs().stream().anyMatch(d -> sameDir(d, dir))) {
            return new ComposeChoice(legacy, "this system keeps the Compose project '" + legacy
                    + "' it was deployed as, with its data (pinned in .env); to move it to '" + fresh + "', see " + COMPOSE_DOCS);
        }
        if (state.legacyContainerDirs().isEmpty() && state.legacyVolumes()) {
            throw new IllegalStateException("Docker has volumes of the Compose project '" + legacy
                    + "' (this folder's name) but no container that says which folder they belong to. If they hold THIS"
                    + " system's data, deploy with -Dmodux.composeProject=" + legacy + "; if they belong to another"
                    + " system, with -Dmodux.composeProject=" + fresh + ". See " + COMPOSE_DOCS);
        }
        return new ComposeChoice(fresh, null);
    }

    /** The name Compose gives a project after its folder: lowercased, only [a-z0-9_-], no leading - or _. */
    static String legacyComposeName(Path dir) {
        return String.valueOf(dir.toAbsolutePath().normalize().getFileName()).toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[^a-z0-9_-]", "")
                .replaceAll("^[-_]+", "");
    }

    private boolean hasComposeResources(String project, Path output) throws IOException, InterruptedException {
        var filter = "label=" + PROJECT_LABEL + "=" + project;
        return !lines(shell.run(List.of("docker", "ps", "-a", "-q", "--filter", filter), output, null)).isEmpty()
                || !lines(shell.run(List.of("docker", "volume", "ls", "-q", "--filter", filter), output, null)).isEmpty();
    }

    /** The project name pinned in the folder's .env, which Compose itself reads too. */
    static String readPin(Path output) throws IOException {
        var file = output.resolve(".env");
        if (!Files.isRegularFile(file)) return null;
        for (var line : Files.readAllLines(file)) {
            var l = line.trim();
            if (l.startsWith(PIN_KEY + "=")) {
                var v = l.substring(PIN_KEY.length() + 1).trim().replaceAll("^[\"']|[\"']$", "");
                return v.isBlank() ? null : v;
            }
        }
        return null;
    }

    /**
     * Pins the project name in the folder's .env (null: removes the pin), so a plain
     * {@code docker compose} there addresses the same stack the deploy brought up. The rest of
     * the file is left as it is.
     */
    static void pin(Path output, String name) throws IOException {
        var file = output.resolve(".env");
        var lines = Files.isRegularFile(file) ? new ArrayList<>(Files.readAllLines(file)) : new ArrayList<String>();
        var had = lines.removeIf(l -> l.trim().startsWith(PIN_KEY + "=") || l.startsWith(PIN_COMMENT));
        if (name == null && !had) return;
        if (name != null) {
            lines.add(PIN_COMMENT + COMPOSE_DOCS);
            lines.add(PIN_KEY + "=" + name);
        }
        if (lines.stream().allMatch(String::isBlank)) {
            Files.deleteIfExists(file);
        } else {
            Files.write(file, lines);
        }
    }

    private static boolean sameDir(String label, Path dir) {
        if (blank(label)) return false;
        try {
            var a = Path.of(label);
            if (Files.exists(a) && Files.exists(dir)) return Files.isSameFile(a, dir);
            return a.toAbsolutePath().normalize().equals(dir.toAbsolutePath().normalize());
        } catch (Exception e) {
            return false;
        }
    }

    private static List<String> lines(String out) {
        return out == null ? List.of() : out.lines().map(String::trim).filter(l -> !l.isEmpty()).toList();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private List<String> kubernetes(Path output, JsonNode target, Settings settings) throws IOException, InterruptedException {
        var context = target.path("context").asText();
        var namespace = target.path("namespace").asText();
        var kind = context.startsWith("kind-") ? context.substring("kind-".length()) : null;

        for (var image : target.path("images")) {
            var ref = image.path("image").asText() + ":" + settings.tag();
            var dir = output.resolve(image.path("dir").asText());
            if (kind != null) {
                log.accept("Modux: image " + ref + " → kind " + kind);
                shell.run(List.of("docker", "build", "-q", "-t", ref, "."), dir, null);
                shell.run(List.of("kind", "load", "docker-image", ref, "--name", kind), output, null);
            } else {
                log.accept("Modux: image " + ref + " (" + settings.platform() + ") → registry");
                shell.run(List.of("docker", "buildx", "build", "--platform", settings.platform(), "-t", ref, "--push", "."), dir, null);
            }
        }

        var kubectl = List.of("kubectl", "--context=" + context);
        shell.run(concat(kubectl, "apply", "-f", "-"), output,
                "apiVersion: v1\nkind: Namespace\nmetadata:\n  name: " + namespace + "\n");
        // the database password: created once, random, and never written to the repository
        var secret = target.path("dbSecret").asText();
        try {
            shell.run(concat(kubectl, "-n", namespace, "get", "secret", secret), output, null);
        } catch (IOException missing) {
            var password = HexFormat.of().formatHex(new SecureRandom().generateSeed(18));
            // and the key that signs the system's single login when the model has no identity provider
            var auth = HexFormat.of().formatHex(new SecureRandom().generateSeed(32));
            shell.run(concat(kubectl, "-n", namespace, "create", "secret", "generic", secret,
                    "--from-literal=password=" + password, "--from-literal=auth=" + auth), output, null);
            log.accept("Modux: created secret " + secret);
        }
        var manifest = Files.readString(output.resolve(target.path("manifest").asText())).replace("__TAG__", settings.tag());
        log.accept("Modux: applying " + target.path("manifest").asText() + " to " + context + "/" + namespace);
        shell.run(concat(kubectl, "apply", "-f", "-"), output, manifest);
        for (var image : target.path("images")) {
            log.accept("Modux: waiting for " + image.path("name").asText());
            shell.run(concat(kubectl, "-n", namespace, "rollout", "status", "deploy/" + image.path("name").asText(),
                    "--timeout=600s"), output, null);
        }

        var urls = new ArrayList<String>();
        var hosts = target.path("hosts");
        if (hosts.isEmpty()) {
            var front = target.path("images").get(target.path("images").size() - 1).path("name").asText();
            log.accept("Modux: the environment declares no URLs. To reach it: kubectl --context=" + context + " -n "
                    + namespace + " port-forward svc/gateway 8088 (or svc/" + front + ")");
            return urls;
        }
        var address = ingressAddress(kubectl, namespace, output);
        var provider = target.path("dnsProvider").asText(null);
        for (var host : hosts) {
            var h = host.asText();
            urls.add("https://" + h);
            if (resolvesTo(h, address)) {
                log.accept("Modux: " + h + " already resolves to " + address);
            } else if (provider == null || provider.isBlank()) {
                log.accept("Modux: WARNING: " + h + " does not resolve to " + address + " and the environment has no dnsProvider");
            } else {
                log.accept("Modux: DNS " + DnsProviders.forName(provider, env).upsert(h, address));
            }
        }
        return urls;
    }

    /** The public address of the ingress, once the controller publishes it. */
    private String ingressAddress(List<String> kubectl, String namespace, Path output) throws IOException, InterruptedException {
        for (int i = 0; i < 60; i++) {
            var out = shell.run(concat(kubectl, "-n", namespace, "get", "ingress", "-o",
                    "jsonpath={.items[0].status.loadBalancer.ingress[0].ip}{.items[0].status.loadBalancer.ingress[0].hostname}"),
                    output, null).trim();
            if (!out.isBlank()) return out;
            Thread.sleep(5000);
        }
        throw new IOException("The ingress published no address within 5 minutes: is there an ingress controller?");
    }

    private static boolean resolvesTo(String host, String address) {
        try {
            for (var a : InetAddress.getAllByName(host)) {
                if (a.getHostAddress().equals(address)) return true;
            }
        } catch (IOException e) {
            return false;
        }
        return false;
    }

    private static List<String> concat(List<String> head, String... tail) {
        var all = new ArrayList<>(head);
        all.addAll(List.of(tail));
        return all;
    }
}
