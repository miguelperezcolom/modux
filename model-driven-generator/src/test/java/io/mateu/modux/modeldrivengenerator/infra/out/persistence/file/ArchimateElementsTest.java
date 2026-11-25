package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ArchiMate elements modux has no concept for (a database, a topic, a node…) are part of the
 * model as documentation: the editor writes them one file each under {@code archimateElements/},
 * they load like any other element, and the JSON schema written next to the model admits them.
 */
@SpringBootTest
class ArchimateElementsTest {

    static {
        System.setProperty("modux.model-file",
                new java.io.File("src/test/resources/examples/hotel-checkin-store.yaml").getAbsolutePath());
    }

    @Autowired
    CommonFileRepository repository;

    @Autowired
    ModelJsonSchemaGenerator schemaGenerator;

    @Test
    void aGranularModelWithArchimateElementsLoads() throws Exception {
        var dir = Files.createTempDirectory("archimate-elements");
        Files.createDirectories(dir.resolve("archimateElements"));
        Files.writeString(dir.resolve("archimateElements").resolve("pagos-db.yaml"), """
                id: pagos-db
                name: pagos-db
                concept: SystemSoftware
                description: The payments database
                """);
        Files.createDirectories(dir.resolve("archimateRelations"));
        Files.writeString(dir.resolve("archimateRelations").resolve("ar-1.yaml"), """
                id: ar-1
                sourceId: pagos-db
                targetId: ctx-pagos
                type: serving
                """);

        repository.loadFrom(dir.toAbsolutePath().toString());

        var elements = repository.findAllOfType(ArchimateElementEntity.class);
        assertEquals(1, elements.size());
        assertEquals("SystemSoftware", elements.get(0).concept());
        assertEquals("The payments database", elements.get(0).description());
        assertEquals(1, repository.findAllOfType(ArchimateRelationEntity.class).size());
    }

    @Test
    void theModelSchemaAdmitsArchimateElements() {
        var schema = schemaGenerator.schemaFor(AllData.class).toString();
        assertTrue(schema.contains("archimateElements"), "the schema lists archimateElements");
        assertTrue(schema.contains("concept"), "an ArchiMate element carries its concept");
    }

}
