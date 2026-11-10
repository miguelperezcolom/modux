import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType
import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "io.mateu.modux"
version = "0.3.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // Build against a local IDE install when one is configured — it avoids downloading a
        // whole SDK, and it is what a developer already has. Falls back to a pinned Community
        // release so CI and a fresh clone work with no configuration.
        val local = providers.gradleProperty("moduxIdeaLocalPath").orNull
        if (!local.isNullOrBlank()) local(local) else intellijIdeaCommunity("2025.2")
        testFramework(TestFrameworkType.Platform)
    }
    testImplementation("junit:junit:4.13.2")
}

tasks.test {
    useJUnit()
}

java {
    toolchain.languageVersion = JavaLanguageVersion.of(21)
}

intellijPlatform {
    // The plugin contributes no settings pages, so there is nothing to index — and the task
    // boots a headless IDE to find that out.
    buildSearchableOptions = false

    publishing {
        token = providers.environmentVariable("JETBRAINS_TOKEN")
    }

    pluginConfiguration {
        name = "Modux"
        ideaVersion {
            // 251 (2025.1) y no menos, MEDIDO con el Plugin Verifier: en 242 y 243 no existe
            // com.intellij.ui.jcef.utils.JBCefStreamResourceHandler, que es con lo que
            // EditorResources sirve el bundle del editor. Declarar 242 era prometer que el panel
            // abre en 2024.2, donde en realidad habría reventado nada más abrir un modelo.
            sinceBuild = "251"
            untilBuild = provider { null }
        }
        // Shown in the Marketplace listing and in the IDE's plugin updates dialog. HTML, and it
        // must be about THIS version — the full history belongs in the repository.
        changeNotes = """
            <h4>0.3.0</h4>
            <ul>
              <li>Release aligned with modux-maven-plugin 0.3.0: deploy to local Docker or Kubernetes, with DNS.</li>
              <li>The model's environments carry their deploy target, registry, DNS provider and certificate issuer.</li>
            </ul>
            <p>Code generation is the <code>modux-maven-plugin</code>, a separate artifact.</p>
        """.trimIndent()
    }

    /**
     * `since-build` is a promise, and this is what checks it — the same Plugin Verifier the
     * Marketplace runs during moderation, so failing here is strictly better than failing there.
     * It already earned its keep: the original claim of 2024.2 was false, and the floor measured
     * out at 2025.1 (see `ideaVersion` above). What is listed here is the range actually
     * claimed — the floor, and the version built against.
     *
     * Run with `./gradlew verifyPlugin`. It downloads the IDEs it checks against, so it is not
     * part of the normal build.
     */
    pluginVerification {
        ides {
            create(IntelliJPlatformType.IntellijIdeaCommunity, "2025.1")
            create(IntelliJPlatformType.IntellijIdeaCommunity, "2025.2")
        }
    }
}

/**
 * Build the editor bundle from `editor/`, so the plugin packages the sources it was built with
 * and not whatever `dist/` happened to hold. That is not hypothetical: `editor/dist` is
 * gitignored, and the first Marketplace upload shipped a blank editor because the copy step below
 * copied a month-old build. Depending on the build makes the bundle a function of the sources.
 *
 * Incremental: gradle skips it unless the editor sources, its config, or its lockfile changed, so
 * the normal case pays a hash, not an `npm run build`. Needs node/npm on PATH and the editor's
 * dependencies installed (`npm ci` in `editor/`); the build fails loudly if either is missing.
 */
val buildEditor by tasks.registering(Exec::class) {
    val editorDir = rootProject.file("../editor")
    workingDir = editorDir
    val npm = if (System.getProperty("os.name").startsWith("Windows")) "npm.cmd" else "npm"
    commandLine(npm, "run", "build")

    inputs.dir(editorDir.resolve("src")).withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.files(
        editorDir.resolve("package.json"),
        editorDir.resolve("package-lock.json"),
        editorDir.resolve("tsconfig.json"),
        editorDir.resolve("vite.config.ts"),
    )
    outputs.dir(editorDir.resolve("dist"))
}

/**
 * The editor bundle is built by `editor/` and copied in as a plugin resource. The plugin does
 * not vendor a second copy: one editor, two hosts.
 */
val editorBundle by tasks.registering(Copy::class) {
    dependsOn(buildEditor)
    from(rootProject.file("../editor/dist")) {
        include("*.js")
    }
    into(layout.buildDirectory.dir("editor-bundle/modux-editor"))
}

sourceSets.main {
    resources.srcDir(layout.buildDirectory.dir("editor-bundle"))
}

tasks.processResources {
    dependsOn(editorBundle)
}

/**
 * `-PmoduxRunProject=/path/to/a/repo` opens that project straight away in the sandbox IDE,
 * instead of landing on the welcome screen. The point of the plugin is what happens when you
 * open a model, so getting there should not need clicking.
 *
 * `-PmoduxOpenFile=/path/to/a.modux-view.yaml` additionally opens that file, so a view document
 * (and the graphical editor it brings up) can be reached without navigating the tree.
 */
tasks.named<JavaExec>("runIde") {
    val project = providers.gradleProperty("moduxRunProject")
    val open = providers.gradleProperty("moduxOpenFile")
    argumentProviders.add(CommandLineArgumentProvider {
        listOfNotNull(project.orNull, open.orNull)
    })
    // The sandbox opens throwaway projects; skip the "trust this project?" gate so a passed file
    // opens straight away instead of waiting behind a dialog.
    jvmArgs("-Didea.trust.all.projects=true")
    jvmArgs("-Dide.browser.jcef.debug.port=9222")
}
