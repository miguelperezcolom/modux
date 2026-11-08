package io.mateu.modux.figma;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * A file made with the CURRENT Mateu library — TEXT/BOOLEAN component properties and content in
 * native slots (children of type SLOT). Fixture: mateu's
 * {@code design/figma/to-yaml/test/fixtures/native.figma.json}, copied verbatim (synthetic: Figma
 * does not document the REST shape of slot content yet, figma/rest-api-spec#88).
 */
class NativeSlotsTest {

    @Test
    void propertiesAndNativeSlotsAreRead() throws Exception {
        FigmaScreenReader reader = new FigmaScreenReader(null);
        List<Screen> screens = reader.read(Path.of(getClass().getResource("/figma/native.figma.json").toURI()));
        assertThat(reader.warnings()).isEmpty();
        assertThat(screens).hasSize(1);
        Screen order = screens.get(0);
        assertThat(order.template()).isEqualTo("ItemOverviewPage");

        List<Screen.Node> all = flatten(order.content());
        Screen.Node root = order.content().get(0);
        assertThat(root.title()).isEqualTo("${state.number}");
        assertThat(root.params()).containsEntry("avatar.initials", "${state.initials}").doesNotContainKey("overline");

        Screen.Node customer = all.stream().filter(n -> "customer".equals(n.fieldId())).findFirst().orElseThrow();
        assertThat(customer.label()).isEqualTo("Customer");
        assertThat(customer.params()).containsEntry("required", "true").doesNotContainKey("placeholder");

        List<Screen.Node> sections = all.stream().filter(n -> "section".equals(n.kind())).toList();
        assertThat(sections).extracting(Screen.Node::title).containsExactly("Lines", "Delivery", "Notes");
        assertThat(sections.get(0).children()).extracting(Screen.Node::fieldId).containsExactly("product", "quantity");
        assertThat(sections.get(1).children()).extracting(Screen.Node::fieldId).containsExactly("address");
        // an old-library Section (empty slot frame) takes the field that follows it
        assertThat(sections.get(2).children()).extracting(Screen.Node::fieldId).containsExactly("note");

        Screen.Node toolbar = all.stream().filter(n -> "slot".equals(n.kind()) && "toolbar".equals(n.param("slot")))
                .findFirst().orElseThrow();
        assertThat(toolbar.children()).extracting(Screen.Node::label).containsExactly("Back to orders", "Edit");
        assertThat(toolbar.children().get(0).params()).containsEntry("actionId", "backToList");
    }

    @Test
    void theJavaEmitterGeneratesTheFieldsOfANativeFile() throws Exception {
        Screen order = new FigmaScreenReader(null)
                .read(Path.of(getClass().getResource("/figma/native.figma.json").toURI())).get(0);
        String source = new JavaEmitter().emit(order, "com.acme.ui");
        assertThat(source).contains("customer").contains("quantity").contains("address").contains("note");
    }

    private static List<Screen.Node> flatten(List<Screen.Node> nodes) {
        List<Screen.Node> out = new ArrayList<>();
        for (Screen.Node n : nodes) {
            out.add(n);
            out.addAll(flatten(n.children()));
        }
        return out;
    }
}
