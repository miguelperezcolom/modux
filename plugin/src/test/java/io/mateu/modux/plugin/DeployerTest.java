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
    final List<String> logs = new ArrayList<>();
    /** What the fake docker answers, by the start of the command line. */
    final java.util.Map<String, String> answers = new java.util.LinkedHashMap<>();

    Deployer deployer(boolean secretExists) {
        Deployer.Shell shell = (command, dir, stdin) -> {
            var line = String.join(" ", command);
            commands.add(line);
            if (stdin != null) stdins.add(stdin);
            if (line.contains("get secret") && !secretExists) throw new IOException("NotFound");
            return answers.entrySet().stream().filter(a -> line.startsWith(a.getKey()))
                    .map(java.util.Map.Entry::getValue).findFirst().orElse("");
        };
        return new Deployer(shell, logs::add, name -> null);
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
        assertTrue(commands.stream().anyMatch(c -> c.contains("--from-literal=auth=")), "the key of the single login");
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

    /** A system generated into a folder named {@code system}, with its own project name. */
    Path namedSystem(String urls) throws IOException {
        var dir = Files.createDirectories(output.resolve("system"));
        Files.createDirectories(dir.resolve("deploy"));
        Files.writeString(dir.resolve("deploy/targets.json"), """
                {"project": "library", "builds": [], "targets": [
                  {"name": "local", "target": "DOCKER", "compose": "docker-compose.yml",
                   "composeProject": "library", "urls": %s}]}
                """.formatted(urls));
        return dir;
    }

    static final String LEGACY_CONTAINERS = "docker ps -a --filter label=com.docker.compose.project=system --format";
    static final String LEGACY_VOLUMES = "docker volume ls -q --filter label=com.docker.compose.project=system";

    @Test
    void a_fresh_system_is_its_own_compose_project_and_prints_what_it_exposes() throws Exception {
        var dir = namedSystem("[\"http://localhost:8091/library\"]");
        var urls = deployer(true).deploy(dir, new Deployer.Settings("local", "t", false, "linux/amd64"));
        assertTrue(commands.contains("docker compose -p library -f docker-compose.yml up -d --build"), commands.toString());
        assertEquals(List.of("http://localhost:8091/library"), urls);
        assertFalse(Files.exists(dir.resolve(".env")), "nothing to pin");
    }

    @Test
    void another_folders_stack_of_the_same_name_is_left_alone() throws Exception {
        var dir = namedSystem("[\"http://localhost:8088\"]");
        answers.put(LEGACY_CONTAINERS, "/somewhere/else/system\n/somewhere/else/system\n");
        answers.put(LEGACY_VOLUMES, "system_postgres_data\n");
        deployer(true).deploy(dir, new Deployer.Settings("local", "t", false, "linux/amd64"));
        assertTrue(commands.contains("docker compose -p library -f docker-compose.yml up -d --build"), commands.toString());
    }

    @Test
    void a_stack_this_folder_deployed_before_keeps_its_name_and_its_data() throws Exception {
        var dir = namedSystem("[\"http://localhost:8088\"]");
        Files.writeString(dir.resolve(".env"), "NOTIFY_ADMIN=me@example.com\n");
        answers.put(LEGACY_CONTAINERS, dir + "\n");
        answers.put(LEGACY_VOLUMES, "system_postgres_data\n");
        deployer(true).deploy(dir, new Deployer.Settings("local", "t", false, "linux/amd64"));
        assertTrue(commands.contains("docker compose -p system -f docker-compose.yml up -d --build"), commands.toString());
        assertTrue(logs.stream().anyMatch(l -> l.contains("keeps the Compose project 'system'") && l.contains(Deployer.COMPOSE_DOCS)), logs.toString());
        // pinned, so a plain `docker compose` in the folder addresses the same stack; the rest of .env stays
        var env = Files.readString(dir.resolve(".env"));
        assertTrue(env.contains("NOTIFY_ADMIN=me@example.com"), env);
        assertEquals("system", Deployer.readPin(dir));

        // the next deploy honours the pin without asking docker again
        commands.clear();
        answers.clear();
        deployer(true).deploy(dir, new Deployer.Settings("local", "t", false, "linux/amd64"));
        assertEquals(List.of("docker compose -p system -f docker-compose.yml up -d --build"), commands);
    }

    @Test
    void choosing_the_new_name_explicitly_removes_the_pin() throws Exception {
        var dir = namedSystem("[]");
        Deployer.pin(dir, "system");
        deployer(true).deploy(dir, new Deployer.Settings("local", "t", false, "linux/amd64", "library"));
        assertEquals(List.of("docker compose -p library -f docker-compose.yml up -d --build"), commands);
        assertFalse(Files.exists(dir.resolve(".env")), "the .env held only the pin");
    }

    @Test
    void volumes_nobody_claims_are_not_guessed_at() throws Exception {
        var dir = namedSystem("[]");
        answers.put(LEGACY_VOLUMES, "system_postgres_data\n");
        var e = assertThrows(IllegalStateException.class,
                () -> deployer(true).deploy(dir, new Deployer.Settings("local", "t", false, "linux/amd64")));
        assertTrue(e.getMessage().contains("-Dmodux.composeProject=system") && e.getMessage().contains("-Dmodux.composeProject=library"),
                e.getMessage());
        assertFalse(commands.stream().anyMatch(c -> c.contains(" up ")), "nothing is started");
    }

    @Test
    void the_choice_of_compose_project() {
        var dir = output;
        var mine = List.of(dir.toString());
        var others = List.of("/elsewhere/system");
        // nothing deployed yet, or already deployed under the new name: the new name
        assertEquals("library", choose(dir, null, null, new Deployer.ComposeState(false, List.of(), false)));
        assertEquals("library", choose(dir, null, null, new Deployer.ComposeState(true, mine, true)));
        // this folder's legacy stack: kept, with a note
        var kept = Deployer.chooseComposeProject("library", "system", dir, null, null, new Deployer.ComposeState(false, mine, true));
        assertEquals("system", kept.name());
        assertTrue(kept.note() != null);
        // another folder's: not ours
        assertEquals("library", choose(dir, null, null, new Deployer.ComposeState(false, others, true)));
        // explicit and pinned choices win
        assertEquals("x", choose(dir, "x", "system", new Deployer.ComposeState(false, mine, true)));
        assertEquals("system", choose(dir, null, "system", null));
        // the same name either way: nothing to decide
        assertEquals("system", Deployer.chooseComposeProject("system", "system", dir, null, null,
                new Deployer.ComposeState(false, List.of(), true)).name());
    }

    static String choose(Path dir, String override, String pinned, Deployer.ComposeState state) {
        return Deployer.chooseComposeProject("library", "system", dir, override, pinned, state).name();
    }

    @Test
    void the_legacy_name_is_composes_folder_name() {
        assertEquals("system", Deployer.legacyComposeName(Path.of("/a/system")));
        assertEquals("myapp_1", Deployer.legacyComposeName(Path.of("/a/_My App_1")));
    }

    @Test
    void an_unknown_environment_says_which_ones_there_are() throws Exception {
        targets("kind-lab");
        var e = assertThrows(IllegalArgumentException.class,
                () -> deployer(true).deploy(output, new Deployer.Settings("staging", "t", false, "linux/amd64")));
        assertTrue(e.getMessage().contains("local, dev"), e.getMessage());
    }
}
