package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.ImportOpenApiCommand;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.ImportOpenApiUseCase;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

@Mojo(name = "import-openapi")
public class ImportOpenApiMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    /** Deprecated: the model a build reads is {@code modelPath}, as for the other goals. Still honoured when set. */
    @Parameter(property = "modux.specFile")
    private String specFile;

    @Parameter(property = "modux.serviceId")
    private String serviceId;

    @Parameter(property = "modux.filePath", required = true)
    private String filePath;

    @Override
    public void execute() throws MojoExecutionException {
        getLog().info("Modux import-openapi: " + filePath);
        if (specFile != null && !specFile.isBlank()) {
            getLog().warn("Modux: modux.specFile is deprecated; use modux.modelPath (default: the project's modux/ or .modux/)");
        }
        var model = ModuxModel.modelFile(modelPath, specFile);
        getLog().info("Modux import-openapi: into " + model);
        System.setProperty("modux.model-file", model.toString());

        try (var ctx = ModuxContext.create()) {
            ctx.getBean(ImportOpenApiUseCase.class)
               .handle(new ImportOpenApiCommand(serviceId, filePath));
        } catch (Exception e) {
            throw new MojoExecutionException("OpenAPI import failed: " + e.getMessage(), e);
        }
    }
}
