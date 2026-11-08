package io.mateu.modux.figma;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * End-to-end over the fixture (the same mini check-in the modux importer is tested with): the
 * reader maps the Figma JSON through the bundled contract and each emitter produces a compilable
 * -looking view with the sections, fields and notices designed in Figma.
 */
class EmittersTest {

    private Screen screen() throws Exception {
        Path fixture = Path.of(getClass().getResource("/figma/checkin-file.json").toURI());
        var screens = new FigmaScreenReader(null).read(fixture);
        assertThat(screens).hasSize(1);
        return screens.get(0);
    }

    @Test
    void javaEmitterProducesTheDesignedView() throws Exception {
        String source = new JavaEmitter().emit(screen(), "com.acme.ui");
        assertThat(source)
                .contains("package com.acme.ui;")
                .contains("@UI(\"/check-in\")")
                .contains("@Title(\"Check In\")")
                .contains("@Section(value = \"Documento\", propertyList = true, frameless = true)")
                .contains("@Label(\"Email\")")
                .contains("String email;")
                .contains("@Notice(theme = \"danger\", slim = true)")
                .contains("2 quejas pendientes")
                .contains("TODO wizard frame");
    }

    @Test
    void csharpEmitterProducesTheDesignedView() throws Exception {
        String source = new CSharpEmitter().emit(screen(), "Acme.Ui");
        assertThat(source)
                .contains("namespace Acme.Ui;")
                .contains("[UI(\"check-in\"), Title(\"Check In\")]")
                .contains("[Section(\"Documento\", PropertyList = true, Frameless = true)]")
                .contains("public string? Email { get; set; }")
                .contains("TODO notice");
    }

    @Test
    void pythonEmitterProducesTheDesignedView() throws Exception {
        String source = new PythonEmitter().emit(screen());
        assertThat(source)
                .contains("@ui(\"check-in\")")
                .contains("class CheckIn:")
                .contains("Section(\"Documento\", property_list=True, frameless=True)")
                .contains("email: Annotated[str | None,");
    }

    @Test
    void generatedJavaHasBalancedBraces() throws Exception {
        String source = new JavaEmitter().emit(screen(), "com.acme.ui");
        long open = source.chars().filter(c -> c == '{').count();
        long close = source.chars().filter(c -> c == '}').count();
        assertThat(open).isEqualTo(close);
        // and it round-trips to disk without mangling
        Path tmp = Files.createTempFile("figma-gen", ".java");
        Files.writeString(tmp, source);
        assertThat(Files.readString(tmp)).isEqualTo(source);
        Files.delete(tmp);
    }

    // ── v2 contract (from mateu-uidl) over mateu's own Star Wars fixture ──────────────────────

    private java.util.Map<String, Screen> starWars() throws Exception {
        Path fixture = Path.of(getClass().getResource("/figma/starwars.figma.json").toURI());
        var screens = new FigmaScreenReader(null).read(fixture);
        var byName = new java.util.LinkedHashMap<String, Screen>();
        screens.forEach(s -> byName.put(s.name(), s));
        return byName;
    }

    @Test
    void pageTemplatesAreRecognizedAndTheirSlotsWalked() throws Exception {
        var screens = starWars();
        assertThat(screens.keySet()).containsExactly(
                "welcome", "person", "dashboard", "species", "starship-new", "Fleet", "About this demo");
        assertThat(screens.get("person").template()).isEqualTo("ItemOverviewPage");
        assertThat(screens.get("welcome").template()).isEqualTo("WelcomePage");
        assertThat(screens.get("starship-new").template()).isEqualTo("GuidedProcessPage");
        assertThat(screens.get("About this demo").template()).isNull();
        var person = screens.get("person").content().get(0);
        assertThat(person.kind()).isEqualTo("pageTemplate");
        assertThat(person.title()).isEqualTo("${state.name}");
        assertThat(person.children()).extracting(n -> n.param("slot")).contains("toolbar", "body");
    }

    @Test
    void javaEmitterFlattensATemplatedScreensFields() throws Exception {
        String source = new JavaEmitter().emit(starWars().get("person"), "com.acme.ui");
        assertThat(source)
                .contains("// Page template ItemOverviewPage")
                .contains("@Label(\"Height (cm)\")")
                .contains("Integer height;")
                .contains("Double mass;")
                .contains("String gender;")
                .contains("@Section(value = \"Physique\", propertyList = true)");
        String wizard = new JavaEmitter().emit(starWars().get("starship-new"), "com.acme.ui");
        assertThat(wizard).contains("String name;").contains("Integer mglt;").contains("void create()");
        assertThat(new CSharpEmitter().emit(starWars().get("person"), "Acme.Ui")).contains("public int Height");
        assertThat(new PythonEmitter().emit(starWars().get("person"))).contains("height: Annotated[int | None");
    }
}
