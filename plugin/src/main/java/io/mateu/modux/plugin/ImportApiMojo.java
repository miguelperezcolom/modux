package io.mateu.modux.plugin;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.importapi.ImportApiEntityUseCase;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Imports an OpenAPI or WSDL contract as a FIRST-CLASS API of the model.
 *
 * <p>Not the same as {@code import-openapi}, and the difference is which way the arrow points:
 * that goal imports a contract as a <em>gateway</em> — something the system CALLS — while this one
 * imports it as an {@code apis} element, a published contract that sits on the map beside the
 * bounded contexts with its operations waiting to be wired to whoever implements them.
 *
 * <p>It is a build step and not an editing gesture: it reads a file and writes model elements, so
 * it belongs where it can run in CI and be re-run when the contract moves. Ids are deterministic,
 * so re-importing an evolved contract updates the operations in place and PRESERVES the wiring
 * already drawn — which is what makes «re-run it» a safe instruction.
 */
@Mojo(name = "import-api")
public class ImportApiMojo extends AbstractMojo {

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    /** The contract to import: an OpenAPI (JSON/YAML) or a WSDL. */
    @Parameter(property = "modux.filePath", required = true)
    private String filePath;

    /**
     * The API the operations land on. Left out, the API is created from the contract's own title —
     * which is what an import of a contract nobody has modelled yet should do.
     */
    @Parameter(property = "modux.apiId")
    private String apiId;

    @Override
    public void execute() throws MojoExecutionException {
        var contract = Path.of(filePath);
        if (!Files.isRegularFile(contract)) {
            throw new MojoExecutionException("No existe el contrato: " + contract.toAbsolutePath());
        }
        getLog().info("Modux import-api: " + contract);
        System.setProperty("modux.model-file", ModuxModel.locate(modelPath).toString());

        try (var ctx = ModuxContext.create()) {
            var content = Files.readString(contract);
            var imported = ctx.getBean(ImportApiEntityUseCase.class)
                    .handle(content, isWsdl(contract, content), apiId);
            getLog().info("Modux import-api: API '" + imported + "' importada en " + modelPath);
        } catch (Exception e) {
            throw new MojoExecutionException("La importación del contrato falló: " + e.getMessage(), e);
        }
    }

    /**
     * Whether the contract is a WSDL. The extension decides when it says so; otherwise the content
     * does — a contract that mentions neither {@code openapi} nor {@code swagger} but does declare
     * {@code definitions} is a WSDL, and asking rather than requiring a flag is one less thing to
     * get wrong in a pom.
     */
    static boolean isWsdl(Path file, String content) {
        var name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".wsdl")) return true;
        if (name.endsWith(".json") || name.endsWith(".yaml") || name.endsWith(".yml")) return false;
        return !content.contains("openapi") && !content.contains("swagger")
                && content.contains("definitions");
    }
}
