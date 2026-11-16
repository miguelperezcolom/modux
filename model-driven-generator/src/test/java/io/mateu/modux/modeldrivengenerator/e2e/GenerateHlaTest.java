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

    /**
     * The Tickets model (the promo video's): four contexts, flows Sales ⇄ Payments, outbox on Sales
     * and Payments, two external systems, state projections out of Catalog and Sales, a deployment.
     * The document must say what actually travels between contexts, and only blame the services
     * that publish. Pass -DhlaTicketsOut=<path> to also write the document.
     */
    @Test
    void the_tickets_document_says_what_leaves_each_context() throws Exception {
        repository.loadFrom(copyOfTickets().toAbsolutePath().toString());

        var md = generateHla.render();
        var out = System.getProperty("hlaTicketsOut");
        if (out != null && !out.isBlank()) Files.writeString(Path.of(out), md);

        // 1. events: what the flows carry and the state the projections copy, not "0 published"
        assertFalse(md.contains("0 published as integration events"), md);
        assertTrue(md.contains("PurchasePlaced (Sales → Payments)"), md);
        assertTrue(md.contains("PaymentAccepted (Payments → Sales)"), md);
        assertTrue(md.contains("Concert (Catalog → Sales, Analytics)"), md);
        assertTrue(md.contains("Purchase (Sales → Analytics)"), md);
        // 2. outbox: natural plural, and only the services that publish (Analytics publishes nothing)
        assertTrue(md.contains("- **Outbox**: Sales and Payments store each event"), md);
        assertTrue(md.contains("Catalog publishes directly"), md);
        var outboxLine = md.lines().filter(l -> l.startsWith("- **Outbox**")).findFirst().orElseThrow();
        assertFalse(outboxLine.contains("Analytics"), outboxLine);
        // 3. structural view: external systems, projections and the Analytics app are connected
        assertTrue(md.contains("bc_payments -->|charge| ext_paygate"), md);
        assertTrue(md.contains("ext_legacy ==>|Venues| bc_catalog"), md);
        assertTrue(md.contains("bc_catalog ==>|Concerts| bc_sales"), md);
        assertTrue(md.contains("bc_catalog ==>|AnalyticsConcerts| bc_analytics"), md);
        assertTrue(md.contains("ui_analytics --> bc_analytics"), md);
        assertTrue(md.contains("bc_sales -->|LookupPrice| bc_catalog"), md);
        // 4. sections numbered without gaps (no business processes here), contexts as subsections
        var headings = md.lines().filter(l -> l.matches("## \\d+\\. .*")).toList();
        for (int i = 0; i < headings.size(); i++) {
            assertTrue(headings.get(i).startsWith("## " + (i + 1) + ". "), headings.toString());
        }
        assertTrue(md.contains("### 4.1 Catalog") && md.contains("### 4.4 Analytics"), md);
        // 5. Analytics is not an empty heading: its read models and its dashboard
        var analytics = md.substring(md.indexOf("### 4.4 Analytics"), md.indexOf("## 5. "));
        assertTrue(analytics.contains("PurchaseView") && analytics.contains("Dashboard"), analytics);
        // 6. the deployment the model declares
        assertTrue(md.contains("Deployment\n"), md);
        assertTrue(md.contains("cloudfleet-hetzner"), md);
    }

    /** The same document for a Spanish project: the event and outbox lines agree in number in Spanish too. */
    @Test
    void the_tickets_document_in_spanish() throws Exception {
        var model = copyOfTickets();
        var project = model.resolve("projects").resolve("tickets.yaml");
        Files.writeString(project, Files.readString(project) + "defaultLocale: \"es\"\n");
        repository.loadFrom(model.toAbsolutePath().toString());

        var md = generateHla.render();

        assertTrue(md.contains("Los flujos llevan 3 de ellos por Kafka, cada uno con DLQ: PurchasePlaced (Sales → Payments)"), md);
        assertTrue(md.contains("Las proyecciones copian el estado de 2 agregados: Concert (Catalog → Sales, Analytics)"), md);
        assertTrue(md.contains("Los otros 9 se quedan en su contexto."), md);
        assertTrue(md.contains("- **Outbox**: Sales y Payments guardan cada evento"), md);
        assertTrue(md.contains("Catalog publica directamente"), md);
        assertTrue(md.contains("### 4.4 Analytics") && md.contains("**Modelos de lectura**"), md);
        assertTrue(md.contains("## 8. Despliegue") && md.contains("## 9. Puntos abiertos"), md);
        for (var englishWord : java.util.List.of("Responsibilities", "Read models", "Queries", "Deployment",
                "publishes directly", "state of", "Arrows:", "Every environment")) {
            assertFalse(md.contains(englishWord), "still in English: " + englishWord);
        }
    }

    /** A copy of the Tickets model (the promo video's), so that loading it never touches the original. */
    private static Path copyOfTickets() throws java.io.IOException {
        var source = Path.of("..", "media", "promo-video", "app", "modux");
        var temp = Files.createTempDirectory("hla-doc-test-tickets").resolve("modux");
        try (var walk = Files.walk(source)) {
            for (var path : walk.toList()) {
                var target = temp.resolve(source.relativize(path).toString());
                if (Files.isDirectory(path)) Files.createDirectories(target);
                else Files.copy(path, target);
            }
        }
        return temp;
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
