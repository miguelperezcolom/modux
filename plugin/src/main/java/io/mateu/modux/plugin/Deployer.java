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

    public record Settings(String environment, String tag, boolean build, String platform) {}

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
            throw new IllegalArgumentException("No hay un entorno «" + settings.environment() + "» en el modelo; hay: "
                    + String.join(", ", names));
        }
        if (settings.build()) {
            for (var dir : targets.path("builds")) {
                log.accept("Modux: compilando " + dir.asText());
                shell.run(List.of("mvn", "-q", "-DskipTests", "install"), output.resolve(dir.asText()), null);
            }
        }
        if ("DOCKER".equals(target.path("target").asText())) {
            log.accept("Modux: levantando el sistema en Docker");
            shell.run(List.of("docker", "compose", "-f", target.path("compose").asText(), "up", "-d", "--build"), output, null);
            return List.of("http://localhost:8088");
        }
        return kubernetes(output, target, settings);
    }

    private List<String> kubernetes(Path output, JsonNode target, Settings settings) throws IOException, InterruptedException {
        var context = target.path("context").asText();
        var namespace = target.path("namespace").asText();
        var kind = context.startsWith("kind-") ? context.substring("kind-".length()) : null;

        for (var image : target.path("images")) {
            var ref = image.path("image").asText() + ":" + settings.tag();
            var dir = output.resolve(image.path("dir").asText());
            if (kind != null) {
                log.accept("Modux: imagen " + ref + " → kind " + kind);
                shell.run(List.of("docker", "build", "-q", "-t", ref, "."), dir, null);
                shell.run(List.of("kind", "load", "docker-image", ref, "--name", kind), output, null);
            } else {
                log.accept("Modux: imagen " + ref + " (" + settings.platform() + ") → registro");
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
            log.accept("Modux: creado el secreto " + secret);
        }
        var manifest = Files.readString(output.resolve(target.path("manifest").asText())).replace("__TAG__", settings.tag());
        log.accept("Modux: aplicando " + target.path("manifest").asText() + " en " + context + "/" + namespace);
        shell.run(concat(kubectl, "apply", "-f", "-"), output, manifest);
        for (var image : target.path("images")) {
            log.accept("Modux: esperando a " + image.path("name").asText());
            shell.run(concat(kubectl, "-n", namespace, "rollout", "status", "deploy/" + image.path("name").asText(),
                    "--timeout=600s"), output, null);
        }

        var urls = new ArrayList<String>();
        var hosts = target.path("hosts");
        if (hosts.isEmpty()) {
            var front = target.path("images").get(target.path("images").size() - 1).path("name").asText();
            log.accept("Modux: el entorno no declara URLs. Para entrar: kubectl --context=" + context + " -n "
                    + namespace + " port-forward svc/gateway 8088 (o svc/" + front + ")");
            return urls;
        }
        var address = ingressAddress(kubectl, namespace, output);
        var provider = target.path("dnsProvider").asText(null);
        for (var host : hosts) {
            var h = host.asText();
            urls.add("https://" + h);
            if (resolvesTo(h, address)) {
                log.accept("Modux: " + h + " ya resuelve a " + address);
            } else if (provider == null || provider.isBlank()) {
                log.accept("Modux: AVISO: " + h + " no resuelve a " + address + " y el entorno no tiene dnsProvider");
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
        throw new IOException("El ingress no ha publicado dirección en 5 minutos: ¿hay un controlador de ingress?");
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
