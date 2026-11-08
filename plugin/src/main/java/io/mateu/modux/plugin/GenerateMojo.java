package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.nio.file.Path;

/**
 * Generates the project's code from its model.
 *
 * <p>Everything defaults off the model itself: a repository is a project, so which project to
 * build, where its output goes and under what package are facts the model already carries. The
 * pom overrides them only when a build wants something other than what the model says.
 */
@Mojo(name = "generate", defaultPhase = LifecyclePhase.GENERATE_SOURCES, threadSafe = true)
public class GenerateMojo extends AbstractMojo {

    /** The model directory — the granular tree. A monolithic YAML file also works. */
    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    /** Overrides the project's own id. Only needed for a store that still holds several. */
    @Parameter(property = "modux.projectId")
    private String projectId;

    /** Overrides the output path declared in the model. */
    @Parameter(property = "modux.outputPath")
    private String outputPath;

    /** Overrides the package declared in the model. */
    @Parameter(property = "modux.packageName")
    private String packageName;

    @Parameter(property = "modux.sourceOnly", defaultValue = "false")
    private boolean sourceOnly;

    @Override
    public void execute() throws MojoExecutionException {
        try {
            var path = ModuxModel.locate(modelPath);
            var model = ModuxModel.read(path);

            var id = override(projectId, model.projectString("id")
                    .orElseThrow(() -> new IllegalStateException("El proyecto no tiene id")));
            var output = override(outputPath, model.projectString("outputPath").orElse("generated"));
            var pkg = override(packageName, model.projectString("packageName")
                    .orElseThrow(() -> new IllegalStateException(
                            "El proyecto no declara packageName y el pom no lo aporta")));

            getLog().info("Modux: generando '" + id + "' desde " + path + " → " + output);
            System.setProperty("modux.model-file", path.toAbsolutePath().toString());
            try (var ctx = ModuxContext.create()) {
                ctx.getBean(GenerateCodeUseCase.class)
                        .handle(new GenerateCodeCommand(id, output, pkg, sourceOnly));
            }
        } catch (Exception e) {
            throw new MojoExecutionException("Code generation failed: " + e.getMessage(), e);
        }
    }

    private static String override(String fromPom, String fromModel) {
        return fromPom != null && !fromPom.isBlank() ? fromPom : fromModel;
    }
}
