package io.mateu.modux.modeldrivengenerator.e2e;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatehla.GenerateHlaUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CommonFileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The design document (HLA) is generated FROM the model: prose, ADR table and derived mermaid
 * diagrams. Validated against the HLA booking sample — the document the dev team receives is a
 * report of the spec, so it cannot drift. Pass -DhlaOut=<path> to also write the showcase file.
 */
@SpringBootTest
class GenerateHlaTest {

    static {
        System.setProperty("modux.model-file",
                new java.io.File("../sample/hla-booking/model-driven-store.yaml").getAbsolutePath());
    }

    @Autowired
    CommonFileRepository repository;

    @Autowired
    GenerateHlaUseCase generateHla;

    @Test
    void hla_document_is_derived_from_the_booking_spec() throws Exception {
        var temp = Files.createTempDirectory("hla-doc-test").resolve("model-driven-store.yaml");
        Files.copy(Path.of("..", "sample", "hla-booking", "model-driven-store.yaml"), temp);
        repository.loadFrom(temp.toAbsolutePath().toString());

        var md = generateHla.render();

        // §1 prose from project.objective
        assertTrue(md.contains("## 1. Contexto y objetivo"));
        assertTrue(md.contains("strangler fig"));
        // §2 the ADR table carries the resolved hold decision
        assertTrue(md.contains("**Sin hold de cupo (book atómico)**"));
        // §3 structural view: services as subgraphs, external systems, relations
        assertTrue(md.contains("flowchart LR"));
        assertTrue(md.contains("OPEN_HOST_SERVICE"));
        assertTrue(md.contains("rumbo · PMS (Oracle)"));
        // §5 the booking process becomes a sequence diagram with its steps
        assertTrue(md.contains("sequenceDiagram"));
        assertTrue(md.contains("BookFolio"));
        assertTrue(md.contains("tarea 'RevisarReservaFallida' (plazo PT4H)"));
        // §6 the lifecycle becomes a state diagram, with operations as labels and terminal states
        assertTrue(md.contains("stateDiagram-v2"));
        assertTrue(md.contains("Pending --> Confirmed: Confirmar"));
        assertTrue(md.contains("Cancelled --> [*]"));
        // §7 transversals derived from flags
        assertTrue(md.contains("BookHotel (clave `bookingReference`)"));
        assertTrue(md.contains("Reserva.holderEmail (PII → CRYPTO_SHRED)"));
        assertTrue(md.contains("**Tenancy**: NONE"));
        // §8 exposed contracts
        assertTrue(md.contains("Reservas.Book"));
        // §9 no open points (all decisions ACCEPTED)
        assertTrue(md.contains("## 9. Puntos abiertos"));
        assertTrue(md.contains("_Ninguno"));

        var out = System.getProperty("hlaOut");
        if (out != null && !out.isBlank()) {
            generateHla.writeTo(Path.of(out));
        }
    }

    /** The document's own words follow the project's language: English unless it speaks Spanish. */
    @Test
    void an_english_model_gets_an_english_document() throws Exception {
        var temp = Files.createTempDirectory("hla-doc-test-en").resolve("model-driven-store.yaml");
        var spanish = Files.readString(Path.of("..", "sample", "hla-booking", "model-driven-store.yaml"));
        assertTrue(spanish.contains("  defaultLocale: \"es\"\n"));
        Files.writeString(temp, spanish.replace("  defaultLocale: \"es\"\n", "  defaultLocale: \"en\"\n"));
        repository.loadFrom(temp.toAbsolutePath().toString());

        var md = generateHla.render();

        assertTrue(md.contains("> Document generated from the modux model"), md);
        assertTrue(md.contains("## 1. Context and objective"));
        assertTrue(md.contains("## 2. Decisions (ADR)") && md.contains("| # | Decision | Rationale | Status |"));
        assertTrue(md.contains("## 3. Structural view") && md.contains("[\"service "));
        assertTrue(md.contains("## 5. Business processes"));
        assertTrue(md.contains("task 'RevisarReservaFallida' (deadline PT4H)"));
        assertTrue(md.contains("BookHotel (key `bookingReference`)"));
        assertTrue(md.contains("## 9. Open points") && md.contains("_None"));
        for (var spanishWord : java.util.List.of("Contexto y objetivo", "Vista estructural", "Puntos abiertos",
                "Procesos de negocio", "Aspectos transversales", "Contratos expuestos", "tarea '", "(clave `",
                "no editar a mano")) {
            assertFalse(md.contains(spanishWord), "still in Spanish: " + spanishWord);
        }
    }
}
