package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatehla.GenerateHlaUseCase;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.nio.file.Path;

/** Writes the project's high-level architecture document, derived from its model. */
@Mojo(name = "hla", threadSafe = true)
public class HlaMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    @Parameter(property = "modux.hla.output", defaultValue = "${project.basedir}/HLA.generated.md")
    private String output;

    @Override
    public void execute() throws MojoExecutionException {
        try {
            System.setProperty("modux.model-file", ModuxModel.locate(modelPath).toAbsolutePath().toString());
            try (var ctx = ModuxContext.create()) {
                var written = ctx.getBean(GenerateHlaUseCase.class).writeTo(Path.of(output));
                getLog().info("Modux: HLA en " + written);
            }
        } catch (Exception e) {
            throw new MojoExecutionException("HLA generation failed: " + e.getMessage(), e);
        }
    }
}
