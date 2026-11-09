package io.mateu.modux.plugin;

import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

/**
 * Implements the pending hooks of the custom zone with the developer's local AI command line, from
 * the intent the model wrote on them. Run it after {@code modux:generate}. It needs no API key, and
 * leaves alone every hook that is already implemented.
 */
@Mojo(name = "ai-complete")
public class AiCompleteMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    @Parameter(property = "modux.outputPath")
    private String outputPath;

    /** Reads the prompt on stdin and answers on stdout. */
    @Parameter(property = "modux.ai.command", defaultValue = "claude -p --output-format text")
    private String aiCommand;

    @Parameter(property = "modux.ai.build", defaultValue = "mvn -q compile -DskipTests")
    private String buildCommand;

    @Parameter(property = "modux.ai.timeoutMinutes", defaultValue = "15")
    private long timeoutMinutes;

    @Override
    public void execute() throws MojoExecutionException {
        try {
            var model = ModuxModel.read(ModuxModel.locate(modelPath));
            var output = outputPath != null && !outputPath.isBlank()
                    ? outputPath : model.projectString("outputPath").orElse("generated");
            var implementer = new HookImplementer(
                    new HookImplementer.Settings(words(aiCommand), words(buildCommand), timeoutMinutes),
                    getLog()::info);
            var written = implementer.implementAll(Path.of(output).toAbsolutePath());
            getLog().info("Modux: " + written.size() + " fichero(s) escritos en la zona custom. Revísalos antes de confirmarlos.");
        } catch (Exception e) {
            throw new MojoExecutionException("AI completion failed: " + e.getMessage(), e);
        }
    }

    private static List<String> words(String command) {
        return Arrays.asList(command.trim().split("\\s+"));
    }
}
