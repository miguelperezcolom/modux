package io.mateu.modux.plugin;

import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Deploys the generated system to an environment of the model: {@code -Dmodux.env=local} (the
 * compose on the local Docker) or one of the deployment's environments (dev, staging, prod), on
 * the Kubernetes context it names. Run it after {@code modux:generate}.
 */
@Mojo(name = "deploy")
public class DeployMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    @Parameter(property = "modux.outputPath")
    private String outputPath;

    @Parameter(property = "modux.env", defaultValue = "local")
    private String environment;

    /** The image tag; by default the moment of the deploy, so each one is a new image. */
    @Parameter(property = "modux.tag")
    private String tag;

    /** Skip `mvn install` of the generated projects (they are already built). */
    @Parameter(property = "modux.skipBuild", defaultValue = "false")
    private boolean skipBuild;

    /** The nodes' architecture, for images pushed to a registry. */
    @Parameter(property = "modux.platform", defaultValue = "linux/amd64")
    private String platform;

    @Override
    public void execute() throws MojoExecutionException {
        try {
            var model = ModuxModel.read(ModuxModel.locate(modelPath));
            var output = outputPath != null && !outputPath.isBlank()
                    ? outputPath : model.projectString("outputPath").orElse("generated");
            var theTag = tag != null && !tag.isBlank() ? tag
                    : LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
            var urls = new Deployer(DeployMojo::run, getLog()::info, System::getenv)
                    .deploy(Path.of(output).toAbsolutePath(), new Deployer.Settings(environment, theTag, !skipBuild, platform));
            getLog().info("Modux: desplegado «" + environment + "» (" + theTag + ")");
            urls.forEach(u -> getLog().info("Modux:   " + u));
        } catch (Exception e) {
            throw new MojoExecutionException("Deploy failed: " + e.getMessage(), e);
        }
    }

    static String run(List<String> command, Path dir, String stdin) throws IOException, InterruptedException {
        var process = new ProcessBuilder(command).directory(dir.toFile()).redirectErrorStream(true).start();
        if (stdin != null) {
            try (var in = process.getOutputStream()) {
                in.write(stdin.getBytes(StandardCharsets.UTF_8));
            }
        } else {
            process.getOutputStream().close();
        }
        var out = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (process.waitFor() != 0) {
            throw new IOException(String.join(" ", command) + " falló:\n" + out.substring(Math.max(0, out.length() - 2000)));
        }
        return out;
    }
}
