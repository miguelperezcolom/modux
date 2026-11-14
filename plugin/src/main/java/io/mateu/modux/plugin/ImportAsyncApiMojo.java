package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi.ImportAsyncApiCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi.ImportAsyncApiUseCase;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

@Mojo(name = "import-asyncapi")
public class ImportAsyncApiMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    /** Deprecated: the model a build reads is {@code modelPath}, as for the other goals. Still honoured when set. */
    @Parameter(property = "modux.specFile")
    private String specFile;

    @Parameter(property = "modux.boundedContextId")
    private String boundedContextId;

    @Parameter(property = "modux.filePath", required = true)
    private String filePath;

    @Override
    public void execute() throws MojoExecutionException {
        getLog().info("Modux import-asyncapi: " + filePath);
        if (specFile != null && !specFile.isBlank()) {
            getLog().warn("Modux: modux.specFile is deprecated; use modux.modelPath (default: the project's modux/ or .modux/)");
        }
        var model = ModuxModel.modelFile(modelPath, specFile);
        getLog().info("Modux import-asyncapi: into " + model);
        System.setProperty("modux.model-file", model.toString());

        try (var ctx = ModuxContext.create()) {
            ctx.getBean(ImportAsyncApiUseCase.class)
               .handle(new ImportAsyncApiCommand(boundedContextId, filePath));
        } catch (Exception e) {
            throw new MojoExecutionException("AsyncAPI import failed: " + e.getMessage(), e);
        }
    }
}
