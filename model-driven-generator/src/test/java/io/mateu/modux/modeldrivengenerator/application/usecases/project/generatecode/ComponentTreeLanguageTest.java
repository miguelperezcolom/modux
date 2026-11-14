package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * The placeholder content a designed page gets for what the model leaves empty speaks the
 * project's language: English unless the project says Spanish (and Spanish stays as it was).
 */
class ComponentTreeLanguageTest {

    private static UiComponentNodeEntity node(String kind) {
        return UiComponentNodeEntity.builder().id(kind).kind(kind).build();
    }

    private static final List<UiComponentNodeEntity> PAGE = List.of(
            node("section"), node("pageHeader"), node("toolbar"), node("scoreboard"), node("statusList"),
            node("checklist"), node("timeline"), node("kanban"), node("gantt"), node("funnel"),
            node("featureGrid"), node("faq"), node("commentThread"), node("pricingTable"),
            node("paymentPicker"), node("button"), node("menuBar"), node("appContext"),
            node("taskProgress"), node("chat"), node("form"));

    private static String render(boolean spanish) {
        return ComponentTreeJava.of(PAGE, null, null, spanish).expression();
    }

    @Test
    void an_english_project_gets_english_placeholders() {
        var java = render(false);
        for (var english : List.of("\"Section\"", "\"Page title\"", "\"Action\"", "\"Another KPI\"",
                "\"Operational\"", "\"Pending\"", "\"2 days ago\"", "\"To do\"", "\"In progress\"",
                "\"Analysis\"", "\"Visits\"", "\"Fast\"", "\"How do I start?\"", "\"This is almost ready\"",
                "\"Choose\"", "\"Confirm and pay\"", "\"Button\"", "\"Home\"", "\"Options\"",
                "\"Context ▾\"", "\"Tasks\"", "The chat needs its SSE URL", "assign a model to the form")) {
            assertTrue(java.contains(english), english + " missing in:\n" + java);
        }
        for (var spanish : List.of("Sección", "Título de la página", "Acción", "Otro KPI", "hace 2 días",
                "Por hacer", "Confirmar y pagar", "Botón", "Inicio", "Opciones", "Tareas", "Contexto",
                "El chat necesita", "asigna un model")) {
            assertFalse(java.contains(spanish), spanish + " leaked into:\n" + java);
        }
        // ids are identifiers, not words: they never change with the language
        assertTrue(java.contains("id(\"todo\")") && java.contains("id(\"doing\")") && java.contains("id(\"done\")"), java);
    }

    @Test
    void a_spanish_project_keeps_its_spanish_placeholders() {
        var java = render(true);
        for (var spanish : List.of("\"Sección\"", "\"Título de la página\"", "\"Acción\"", "\"Otro KPI\"",
                "\"hace 2 días\"", "\"Por hacer\"", "\"En curso\"", "\"Confirmar y pagar\"", "\"Botón\"",
                "\"Inicio\"", "\"Opciones\"", "\"Tareas\"", "\"Contexto ▾\"",
                "El chat necesita su URL SSE: añade el parámetro sseUrl al nodo",
                "asigna un model al formulario en el diseñador")) {
            assertTrue(java.contains(spanish), spanish + " missing in:\n" + java);
        }
        assertFalse(java.contains("\"Page title\""), java);
    }

    @Test
    void without_a_language_flag_the_tree_speaks_english() {
        assertTrue(ComponentTreeJava.of(List.of(node("section"))).expression().contains("\"Section\""));
    }

    @Test
    void the_chat_with_its_url_has_no_placeholder() {
        var chat = UiComponentNodeEntity.builder().id("c").kind("chat").params(Map.of("sseUrl", "/sse")).build();
        assertTrue(ComponentTreeJava.of(List.of(chat), null, null, false).expression().contains("sseUrl(\"/sse\")"));
    }
}
