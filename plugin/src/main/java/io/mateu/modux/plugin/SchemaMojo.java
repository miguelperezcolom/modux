package io.mateu.modux.plugin;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelJsonSchemaGenerator;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Writes the model's JSON schema next to the model.
 *
 * <p>The schema is what defines the metamodel — what can be said at all — and it is what makes
 * hand and agent editing safe without a tool surface in front of the files. Emitting it into the
 * repository means it is versioned with the model it describes, and any editor or agent that
 * understands JSON schema gets completion and validation for free.
 */
@Mojo(name = "schema", defaultPhase = LifecyclePhase.GENERATE_RESOURCES, threadSafe = true)
public class SchemaMojo extends AbstractMojo {

    static final String SCHEMA_FILE = "model-driven-store-schema.json";

    @Parameter(property = "modux.modelPath", defaultValue = "${project.basedir}/" + ModuxModel.DEFAULT_PATH)
    private String modelPath;

    @Override
    public void execute() throws MojoExecutionException {
        try {
            var target = ModuxModel.locate(modelPath).resolve(SCHEMA_FILE);
            var schema = new ModelJsonSchemaGenerator().fullSchema();
            var json = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsString(schema);

            Files.createDirectories(target.getParent());
            if (Files.exists(target) && Files.readString(target).equals(json)) {
                getLog().info("Modux: el esquema ya estaba al día en " + target);
                return;
            }
            Files.writeString(target, json);
            getLog().info("Modux: esquema escrito en " + target);
        } catch (Exception e) {
            throw new MojoExecutionException("No se pudo escribir el esquema: " + e.getMessage(), e);
        }
    }
}
