package io.mateu.modux.plugin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** What the deploy runs for each kind of target, with a fake shell. */
class DeployerTest {

    @TempDir
    Path output;

    final List<String> commands = new ArrayList<>();
    final List<String> stdins = new ArrayList<>();

    Deployer deployer(boolean secretExists) {
        Deployer.Shell shell = (command, dir, stdin) -> {
            var line = String.join(" ", command);
            commands.add(line);
            if (stdin != null) stdins.add(stdin);
            if (line.contains("get secret") && !secretExists) throw new IOException("NotFound");
            return "";
        };
        return new Deployer(shell, message -> {}, name -> null);
    }

    void targets(String context) throws IOException {
        Files.createDirectories(output.resolve("deploy/k8s"));
        Files.writeString(output.resolve("deploy/k8s/dev.yaml"), "image: acme/tienda-pedidos:__TAG__\n");
        Files.writeString(output.resolve("deploy/targets.json"), """
                {"project": "tienda", "builds": ["pedidos"], "targets": [
                  {"name": "local", "target": "DOCKER", "compose": "docker-compose.yml"},
                  {"name": "dev", "target": "KUBERNETES", "context": "%s", "namespace": "tienda-dev",
                   "manifest": "deploy/k8s/dev.yaml", "dbSecret": "tienda-db", "hosts": [],
                   "images": [{"name": "pedidos", "dir": "pedidos", "image": "acme/tienda-pedidos"}]}]}
                """.formatted(context));
    }

    @Test
    void a_kind_cluster_gets_its_images_loaded_and_the_manifest_with_the_tag() throws Exception {
        targets("kind-lab");
        deployer(false).deploy(output, new Deployer.Settings("dev", "t1", true, "linux/amd64"));
        assertTrue(commands.contains("mvn -q -DskipTests install"), commands.toString());
        assertTrue(commands.contains("kind load docker-image acme/tienda-pedidos:t1 --name lab"), commands.toString());
        assertFalse(commands.stream().anyMatch(c -> c.contains("--push")), "nothing leaves the machine");
        assertTrue(commands.stream().anyMatch(c -> c.contains("create secret generic tienda-db --from-literal=password=")));
        assertTrue(stdins.contains("image: acme/tienda-pedidos:t1\n"), stdins.toString());
        assertTrue(commands.contains("kubectl --context=kind-lab -n tienda-dev rollout status deploy/pedidos --timeout=600s"));
    }

    @Test
    void any_other_cluster_gets_images_pushed_for_its_platform_and_keeps_its_secret() throws Exception {
        targets("cloudfleet-hetzner");
        deployer(true).deploy(output, new Deployer.Settings("dev", "t2", false, "linux/amd64"));
        assertTrue(commands.contains("docker buildx build --platform linux/amd64 -t acme/tienda-pedidos:t2 --push ."), commands.toString());
        assertFalse(commands.stream().anyMatch(c -> c.startsWith("mvn")), "skipBuild");
        assertFalse(commands.stream().anyMatch(c -> c.contains("create secret")), "a secret is created once");
    }

    @Test
    void local_is_the_compose() throws Exception {
        targets("kind-lab");
        var urls = deployer(true).deploy(output, new Deployer.Settings("local", "t3", false, "linux/amd64"));
        assertEquals(List.of("docker compose -f docker-compose.yml up -d --build"), commands);
        assertEquals(List.of("http://localhost:8088"), urls);
    }

    @Test
    void an_unknown_environment_says_which_ones_there_are() throws Exception {
        targets("kind-lab");
        var e = assertThrows(IllegalArgumentException.class,
                () -> deployer(true).deploy(output, new Deployer.Settings("staging", "t", false, "linux/amd64")));
        assertTrue(e.getMessage().contains("local, dev"), e.getMessage());
    }
}
