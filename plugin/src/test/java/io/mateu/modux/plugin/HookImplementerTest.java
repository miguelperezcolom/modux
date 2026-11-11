package io.mateu.modux.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HookImplementerTest {

    @TempDir Path dir;

    private static final String PENDING_HOOK = "class H { void a() { throw new UnsupportedOperationException(\"Pendiente de implementar a\"); } }";

    private Path hook(String name, String source) throws Exception {
        var file = dir.resolve("out/svc/svc-custom/src/main/java/x/" + name);
        Files.createDirectories(file.getParent());
        return Files.writeString(file, source);
    }

    private HookImplementer implementer(String answerBody, String build) throws Exception {
        var ai = Files.writeString(dir.resolve("ai.sh"), "cat > /dev/null\ncat <<'EOF'\n" + answerBody + "\nEOF\n");
        return new HookImplementer(new HookImplementer.Settings(
                List.of("sh", ai.toString()), List.of("sh", "-c", build), 1), s -> {});
    }

    @Test
    void writes_the_implementation_of_a_pending_hook() throws Exception {
        var hook = hook("H.java", PENDING_HOOK);
        implementer("===FILE: x/H.java\nclass H { void a() { } }\n===END", "exit 0").implementAll(dir.resolve("out"));
        assertEquals("class H { void a() { } }", Files.readString(hook));
    }

    @Test
    void leaves_implemented_hooks_alone() throws Exception {
        var done = hook("Done.java", "class Done { }");
        var written = implementer("nothing", "exit 0").implementAll(dir.resolve("out"));
        assertTrue(written.isEmpty());
        assertEquals("class Done { }", Files.readString(done));
    }

    @Test
    void restores_the_hooks_when_it_never_compiles() throws Exception {
        var hook = hook("H.java", PENDING_HOOK);
        assertThrows(IllegalStateException.class, () -> implementer(
                "===FILE: x/H.java\nbroken\n===END\n===FILE: x/Extra.java\nextra\n===END", "exit 1").implementAll(dir.resolve("out")));
        assertEquals(PENDING_HOOK, Files.readString(hook));
        assertFalse(Files.exists(hook.resolveSibling("Extra.java")));
    }

    @Test
    void refuses_to_write_outside_the_custom_zone() {
        assertThrows(IllegalStateException.class, () -> HookImplementer.parse(
                "===FILE: ../../../evil.java\nx\n===END", dir.resolve("root")));
    }

    @Test
    void the_read_side_and_the_use_case_are_contracts_a_hook_can_use() {
        var base = "ventas/ventas/src/main/java/es/x/ventas/";
        assertTrue(HookImplementer.isContract(Path.of(base + "application/query/ConciertoViewReadModelQueryService.java")));
        assertTrue(HookImplementer.isContract(Path.of(base + "application/usecases/comprar/ComprarUseCase.java")));
        assertTrue(HookImplementer.isContract(Path.of(base + "application/out/remote/ConsultarPrecioClient.java")));
        assertFalse(HookImplementer.isContract(Path.of(base + "infra/out/persistence/ConciertoViewReadModelEntityRepository.java")));
        assertFalse(HookImplementer.isContract(Path.of("ventas/ventas-custom/src/main/java/es/x/custom/DefaultComprarSteps.java")));
    }

    @Test
    void adapts_an_implemented_hook_the_model_changed_under_it() throws Exception {
        // implemented for the old signature: it no longer compiles, though nothing says it is pending
        var hook = hook("Old.java", "class Old { void a() { old(); } }");
        var build = "grep -q old " + hook + " && { echo '[ERROR] " + hook + ":[1,20] cannot find symbol'; exit 1; } || exit 0";
        var written = implementer("===FILE: x/Old.java\nclass Old { void a(int answer) { } }\n===END", build)
                .implementAll(dir.resolve("out"));
        assertEquals(List.of(hook), written);
        assertEquals("class Old { void a(int answer) { } }", Files.readString(hook));
    }

    @Test
    void finds_the_custom_sources_a_failed_build_points_at() throws Exception {
        var hook = hook("H.java", "class H { }");
        var root = dir.resolve("out/svc/svc-custom/src/main/java");
        var output = "[ERROR] /elsewhere/Generated.java:[3,1] x\n[ERROR] " + hook + ":[1,1] cannot find symbol";
        assertEquals(List.of(hook), HookImplementer.customFilesIn(output, root));
    }
}
