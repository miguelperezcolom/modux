package io.mateu.modux.modeldrivengenerator.application.usecases.project.importfigma;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * A file made with the CURRENT Mateu library: params set in Figma's properties panel (TEXT/BOOLEAN
 * component properties) and content dragged into native slots (children of type SLOT). The fixture
 * is mateu's {@code design/figma/to-yaml/test/fixtures/native.figma.json}, copied verbatim — it is
 * synthetic, because Figma does not document the REST shape of slot content yet
 * (figma/rest-api-spec#88).
 */
class FigmaNativeSlotsTest {

    static JsonNode file;
    static FigmaToModel mapper;
    static PageEntity order;

    @BeforeAll
    static void importTheNativeFile() throws Exception {
        try (InputStream in = FigmaNativeSlotsTest.class.getResourceAsStream("/figma/native.figma.json")) {
            file = new ObjectMapper().readTree(in);
        }
        mapper = new FigmaToModel(FigmaContract.load(null));
        List<PageEntity> pages = mapper.map(file);
        assertThat(pages).extracting(PageEntity::id).containsExactly("order");
        order = pages.get(0);
    }

    @Test
    void noWarnings() {
        assertThat(mapper.warnings()).isEmpty();
    }

    @Test
    void propertiesAreReadAndUntouchedPlaceholdersAreNot() {
        UiComponentNodeEntity customer = field("customer");
        assertThat(customer.label()).isEqualTo("Customer");
        assertThat(customer.params()).containsEntry("required", "true").doesNotContainKey("placeholder");
        assertThat(field("product").params()).doesNotContainKey("required");
        UiComponentNodeEntity root = order.content().get(0);
        assertThat(root.params()).containsEntry("template", "ItemOverviewPage")
                .containsEntry("avatar.initials", "${state.initials}");
        assertThat(root.title()).isEqualTo("${state.number}");
        UiComponentNodeEntity header = flatten(order.content()).stream()
                .filter(n -> "pageHeader".equals(n.kind())).findFirst().orElseThrow();
        assertThat(header.params()).doesNotContainKey("overline");
        assertThat(header.children()).extracting(UiComponentNodeEntity::label).containsExactly("Back to orders", "Edit");
        assertThat(header.children().get(0).params()).containsEntry("actionId", "backToList").containsEntry("route", "orders");
    }

    @Test
    void slotContentIsReadFromSlotNodesByNameOrByProperty_andTheOldSectionFallbackStillWorks() {
        List<UiComponentNodeEntity> sections = flatten(order.content()).stream()
                .filter(n -> "section".equals(n.kind())).toList();
        assertThat(sections).extracting(UiComponentNodeEntity::title).containsExactly("Lines", "Delivery", "Notes");
        assertThat(sections.get(0).children()).extracting(UiComponentNodeEntity::fieldId).containsExactly("product", "quantity");
        assertThat(sections.get(1).children()).extracting(UiComponentNodeEntity::fieldId).containsExactly("address");
        assertThat(sections.get(2).children()).extracting(UiComponentNodeEntity::fieldId).containsExactly("note");
    }

    @Test
    void aPropertyWinsOverConfigAndAnUnknownOneOrLayerTypeIsAWarning() throws Exception {
        JsonNode copy = file.deepCopy();
        // the toolbar's first Button: an old #config naming another action, and an unknown property
        ObjectNode button = (ObjectNode) copy.at("/document/children/0/children/0/children/0/children/3/children/0");
        ((com.fasterxml.jackson.databind.node.ArrayNode) button.withArray("children")).addObject()
                .put("type", "TEXT").put("name", "#config").put("characters", "actionId=old");
        button.with("componentProperties").putObject("colour#9:9").put("type", "TEXT").put("value", "red");
        ((com.fasterxml.jackson.databind.node.ArrayNode) copy.at("/document/children/0/children/0").withArray("children"))
                .addObject().put("type", "WIDGET").put("name", "Poll").put("id", "7:7");
        FigmaToModel m = new FigmaToModel(FigmaContract.load(null));
        PageEntity page = m.map(copy).get(0);
        UiComponentNodeEntity header = flatten(page.content()).stream()
                .filter(n -> "pageHeader".equals(n.kind())).findFirst().orElseThrow();
        assertThat(header.children().get(0).params()).containsEntry("actionId", "backToList");
        assertThat(m.warnings()).anyMatch(w -> w.contains("property \"colour\" is not a param"));
        assertThat(m.warnings()).anyMatch(w -> w.contains("a WIDGET layer is not read"));
    }

    private static UiComponentNodeEntity field(String id) {
        return flatten(order.content()).stream().filter(n -> id.equals(n.fieldId())).findFirst().orElseThrow();
    }

    static List<UiComponentNodeEntity> flatten(List<UiComponentNodeEntity> nodes) {
        List<UiComponentNodeEntity> out = new ArrayList<>();
        for (UiComponentNodeEntity n : nodes) {
            out.add(n);
            if (n.children() != null) out.addAll(flatten(n.children()));
        }
        return out;
    }
}
