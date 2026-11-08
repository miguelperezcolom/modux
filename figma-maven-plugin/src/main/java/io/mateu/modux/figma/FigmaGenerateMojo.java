package io.mateu.modux.figma;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.project.MavenProject;

/**
 * {@code figma:generate} — turns Figma files designed with the Mateu component library into Mateu
 * view sources. Scans {@code figmaDir} for {@code *.json} (the REST {@code GET /v1/files/:key}
 * payload, downloaded e.g. with {@code curl -H "X-Figma-Token: $FIGMA_TOKEN"
 * https://api.figma.com/v1/files/KEY > src/main/figma/screens.json}) and emits one class per
 * designed frame, in every requested language.
 *
 * <pre>{@code
 * <plugin>
 *   <groupId>io.mateu.modux</groupId>
 *   <artifactId>figma-maven-plugin</artifactId>
 *   <version>0.1.0-SNAPSHOT</version>
 *   <executions><execution><goals><goal>generate</goal></goals></execution></executions>
 *   <configuration>
 *     <basePackage>com.acme.frontoffice.ui</basePackage>
 *     <languages><language>java</language></languages>
 *   </configuration>
 * </plugin>
 * }</pre>
 */
@Mojo(name = "generate", defaultPhase = LifecyclePhase.GENERATE_SOURCES)
public class FigmaGenerateMojo extends AbstractMojo {

    /** Directory holding the downloaded Figma file JSONs. */
    @Parameter(property = "figma.dir", defaultValue = "${project.basedir}/src/main/figma")
    private File figmaDir;

    /** Where the sources land (java goes under a package subfolder and joins the build). */
    @Parameter(property = "figma.output", defaultValue = "${project.build.directory}/generated-sources/figma")
    private File outputDir;

    /** Languages to emit: java, csharp, python. */
    @Parameter(property = "figma.languages")
    private List<String> languages;

    /** Package (java) / namespace (csharp) of the generated classes. */
    @Parameter(property = "figma.basePackage", defaultValue = "generated.figma")
    private String basePackage;

    /** Overrides the Mateu design contract (default: the one published in io.mateu:mateu-uidl). */
    @Parameter(property = "figma.contract")
    private File contract;

    @Parameter(defaultValue = "${project}", readonly = true)
    private MavenProject project;

    @Override
    public void execute() throws MojoExecutionException {
        if (!figmaDir.isDirectory()) {
            getLog().info("No Figma directory at " + figmaDir + " — nothing to generate");
            return;
        }
        List<String> targetLanguages = languages == null || languages.isEmpty() ? List.of("java") : languages;
        try {
            FigmaScreenReader reader = new FigmaScreenReader(contract == null ? null : contract.toPath());
            JavaEmitter java = new JavaEmitter();
            CSharpEmitter csharp = new CSharpEmitter();
            PythonEmitter python = new PythonEmitter();
            int generated = 0;
            try (Stream<Path> files = Files.list(figmaDir.toPath())) {
                for (Path file : files.filter(p -> p.toString().endsWith(".json")).sorted().toList()) {
                    List<Screen> screens = reader.read(file);
                    reader.warnings().forEach(w -> getLog().warn("figma:generate (" + file.getFileName() + "): " + w));
                    for (Screen screen : screens) {
                        String className = Names.pascal(screen.name());
                        if (targetLanguages.contains("java")) {
                            Path dir = outputDir.toPath().resolve("java").resolve(basePackage.replace('.', '/'));
                            write(dir.resolve(className + ".java"), java.emit(screen, basePackage));
                            generated++;
                        }
                        if (targetLanguages.contains("csharp")) {
                            write(outputDir.toPath().resolve("csharp").resolve(className + ".cs"),
                                    csharp.emit(screen, basePackage));
                            generated++;
                        }
                        if (targetLanguages.contains("python")) {
                            write(outputDir.toPath().resolve("python").resolve(Names.snake(screen.name()) + ".py"),
                                    python.emit(screen));
                            generated++;
                        }
                        getLog().info("Generated " + className + " from frame '" + screen.name() + "' (" + file.getFileName() + ")");
                    }
                }
            }
            if (targetLanguages.contains("java") && project != null) {
                project.addCompileSourceRoot(outputDir.toPath().resolve("java").toString());
            }
            getLog().info("figma:generate — " + generated + " source file(s)");
        } catch (Exception e) {
            throw new MojoExecutionException("Figma generation failed", e);
        }
    }

    private static void write(Path path, String content) throws Exception {
        Files.createDirectories(path.getParent());
        Files.writeString(path, content);
    }
}
