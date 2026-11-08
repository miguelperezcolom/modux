package io.mateu.modux.modeldrivengenerator.application.usecases.project.importfigma;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.ComponentTreeJava;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * The v2 design contract, read from the io.mateu:mateu-uidl artifact, against mateu's own Figma
 * fixture ({@code design/figma/to-yaml/test/fixtures/starwars.figma.json}, copied verbatim): page
 * templates and their {@code slot:<name>} frames — inside the template instance or beside it in
 * the screen frame — land on modux kinds, and nothing the contract can produce is a kind modux
 * rejects.
 */
class FigmaPageTemplatesTest {

    static FigmaContract contract;
    static FigmaToModel mapper;
    static Map<String, PageEntity> pages;

    @BeforeAll
    static void importTheStarWarsFile() throws Exception {
        contract = FigmaContract.load(null);
        JsonNode file;
        try (InputStream in = FigmaPageTemplatesTest.class.getResourceAsStream("/figma/starwars.figma.json")) {
            file = new ObjectMapper().readTree(in);
        }
        mapper = new FigmaToModel(contract);
        pages = mapper.map(file).stream().collect(Collectors.toMap(PageEntity::id, Function.identity(),
                (a, b) -> a, java.util.LinkedHashMap::new));
    }

    @Test
    void theContractComesFromTheMateuArtifactAndIsV2() {
        assertThat(contract.version()).isGreaterThanOrEqualTo(2);
        assertThat(contract.byFigmaName("Mateu/Page Templates/ItemOverviewPage")).isNotNull();
        assertThat(contract.byFigmaName("Mateu/Page Templates/ItemOverviewPage").slots())
                .contains("toolbar", "body", "footer", "content");
        assertThat(contract.byFigmaName("Mateu/Field/Number").defaults()).containsEntry("dataType", "number");
    }

    @Test
    void everyContractKindIsAKindModuxAccepts() {
        assertThat(contract.entries()).extracting(FigmaContract.Entry::kind)
                .allSatisfy(kind -> assertThat(UiComponentNodeEntity.KINDS).as("kind " + kind).contains(kind));
    }

    @Test
    void everyComposedTemplateIsInTheContract() {
        assertThat(FigmaToModel.COMPOSED_TEMPLATES).allSatisfy(template ->
                assertThat(contract.byFigmaName("Mateu/Page Templates/" + template)).as(template).isNotNull());
    }

    @Test
    void screensAreFramesAndTopLevelTemplateInstancesButNotUnderscoredOnes() {
        assertThat(pages.keySet()).containsExactly(
                "welcome", "person", "dashboard", "species", "starship-new", "fleet", "about-this-demo");
    }

    @Test
    void producedKindsAreAllValidAndNoTemplateKindSurvives() {
        for (PageEntity page : pages.values()) {
            for (UiComponentNodeEntity n : flatten(page.content())) {
                assertThat(UiComponentNodeEntity.KINDS).as(page.id() + " " + n.kind()).contains(n.kind());
                assertThat(n.kind()).isNotIn(FigmaContract.PAGE_TEMPLATE, FigmaContract.TEMPLATE_PART);
            }
        }
    }

    @Test
    void welcomePageOwnsItsHeaderAsAHeroWithTheCtas() {
        UiComponentNodeEntity root = root("welcome");
        assertThat(root.params()).containsEntry("template", "WelcomePage").containsEntry("backgroundColor", "dark-slate");
        assertThat(pages.get("welcome").title()).isEqualTo("Star Wars");
        UiComponentNodeEntity hero = root.children().get(0);
        assertThat(hero.kind()).isEqualTo("hero");
        assertThat(hero.title()).isEqualTo("Star Wars");
        assertThat(hero.text()).startsWith("Characters, planets");
        assertThat(hero.params()).containsEntry("overline", "A Mateu demo");
        assertThat(hero.children()).extracting(UiComponentNodeEntity::label)
                .containsExactly("Browse the characters", "Explore the planets");
        assertThat(hero.children().get(0).params()).containsEntry("route", "people").doesNotContainKey("actionId");
        UiComponentNodeEntity tiles = root.children().get(1);
        assertThat(tiles.kind()).isEqualTo("dashboardLayout");
        assertThat(tiles.params()).containsEntry("columns", "3");
        assertThat(tiles.children()).extracting(UiComponentNodeEntity::kind).containsExactly("dashboardPanel", "dashboardPanel");
        assertThat(tiles.children().get(0).title()).isEqualTo("Characters");
        assertThat(tiles.children().get(0).children()).extracting(UiComponentNodeEntity::kind).containsExactly("text", "button");
    }

    @Test
    void itemOverviewTakesItsSlotsFromTheSiblingsOfTheTemplateInstance() {
        UiComponentNodeEntity root = root("person");
        assertThat(root.params()).containsEntry("template", "ItemOverviewPage");
        UiComponentNodeEntity header = root.children().get(0);
        assertThat(header.kind()).isEqualTo("pageHeader");
        assertThat(header.title()).isEqualTo("${state.name}");
        assertThat(header.params()).containsEntry("subtitle", "Character").doesNotContainKey("overline"); // placeholder
        assertThat(header.children()).extracting(UiComponentNodeEntity::label).containsExactly("Back to People", "Edit");

        UiComponentNodeEntity row = root.children().get(1);
        assertThat(row.kind()).isEqualTo("horizontalLayout");
        UiComponentNodeEntity panel = row.children().get(0);
        assertThat(panel.kind()).isEqualTo("card");
        assertThat(panel.params()).containsEntry("avatar.src", "${state.image}");
        assertThat(panel.children()).extracting(UiComponentNodeEntity::fieldId)
                .containsExactly("gender", "birthYear", "homeworldName");
        assertThat(panel.children().get(0).params()).containsEntry("propertyRow", "true");

        // the Tabs instance beside the template is the template's content (the main slot)
        UiComponentNodeEntity main = row.children().get(1);
        assertThat(main.params()).containsEntry("slot", "item-overview-main");
        UiComponentNodeEntity tabs = main.children().get(0);
        assertThat(tabs.kind()).isEqualTo("tabs");
        UiComponentNodeEntity details = tabs.children().get(0);
        assertThat(details.kind()).isEqualTo("tab");
        assertThat(details.label()).isEqualTo("Details");
        // two sections with their own slot content: they do not absorb one another
        assertThat(details.children()).extracting(UiComponentNodeEntity::title).containsExactly("Physique", "Appearance");
        UiComponentNodeEntity physique = details.children().get(0);
        assertThat(physique.children()).extracting(UiComponentNodeEntity::fieldId).containsExactly("height", "mass");
        assertThat(physique.children().get(0).params()).containsEntry("dataType", "integer");
    }

    @Test
    void dashboardLandingPutsTheKpiSlotInAScoreboard() {
        UiComponentNodeEntity root = root("dashboard");
        assertThat(root.params()).containsEntry("template", "DashboardLandingPage");
        assertThat(root.children()).extracting(UiComponentNodeEntity::kind)
                .containsExactly("pageHeader", "scoreboard", "dashboardLayout");
        assertThat(root.children().get(1).children()).extracting(UiComponentNodeEntity::title)
                .containsExactly("Characters", "Planets", "Starships");
        assertThat(root.children().get(1).children().get(0).params()).containsEntry("value", "82");
        assertThat(root.children().get(2).children().get(0).params()).containsEntry("colSpan", "2");
    }

    @Test
    void collectionDetailIsAMasterDetailWithTheNoSelectionSlotAsDetail() {
        UiComponentNodeEntity root = root("species");
        assertThat(pages.get("species").type()).isEqualTo("crud"); // a Listing (kind crud) in the list slot
        UiComponentNodeEntity md = root.children().get(1);
        assertThat(md.kind()).isEqualTo("masterDetailLayout");
        UiComponentNodeEntity list = md.children().get(0);
        UiComponentNodeEntity partial = list.children().get(0);
        assertThat(partial.params()).containsEntry("partial", "species-list");
        UiComponentNodeEntity listing = partial.children().get(0);
        assertThat(listing.kind()).isEqualTo("crud");
        assertThat(listing.params()).containsEntry("rowsSource.ref", "swapi-species").containsEntry("pageSize", "12");
        assertThat(listing.children()).extracting(UiComponentNodeEntity::kind).containsExactly("gridColumn");
        assertThat(md.children().get(1).params()).containsEntry("slot", "noSelection");
        assertThat(md.children().get(1).children().get(0).title()).isEqualTo("Pick a species");
    }

    @Test
    void guidedProcessStepsBecomeTabsAndTheSiblingToolbarIsFlattened() {
        UiComponentNodeEntity root = root("starship-new");
        UiComponentNodeEntity header = root.children().get(0);
        assertThat(header.children()).extracting(UiComponentNodeEntity::label).containsExactly("Cancel", "Register");
        UiComponentNodeEntity steps = root.children().get(1);
        assertThat(steps.kind()).isEqualTo("tabLayout");
        assertThat(steps.children()).extracting(UiComponentNodeEntity::title).containsExactly("Identity", "Specifications");
        assertThat(steps.children().get(0).params()).containsEntry("id", "identity")
                .containsEntry("description", "What the ship is called").containsEntry("part", "GuidedProcessStep");
        UiComponentNodeEntity form = steps.children().get(0).children().get(0);
        assertThat(form.kind()).isEqualTo("formLayout");
        assertThat(form.children()).extracting(UiComponentNodeEntity::fieldId).containsExactly("name", "model");
        assertThat(form.children().get(0).params()).containsEntry("required", "true");
    }

    @Test
    void dataManagementDocksTheEndPanelBesideTheBody() {
        UiComponentNodeEntity root = root("fleet");
        UiComponentNodeEntity row = root.children().get(1);
        assertThat(row.kind()).isEqualTo("horizontalLayout");
        assertThat(row.children().get(0).children().get(0).kind()).isEqualTo("crud");
        UiComponentNodeEntity docked = row.children().get(1);
        assertThat(docked.kind()).isEqualTo("card");
        assertThat(docked.title()).isEqualTo("Fleet at a glance");
        assertThat(docked.params()).containsEntry("part", "DockedPanel").containsEntry("size", "20rem").containsEntry("slot", "end");
        assertThat(docked.children()).extracting(UiComponentNodeEntity::kind).containsExactly("metricCard", "metricCard");
    }

    @Test
    void aFreePageSkipsHiddenAndHashLayersAndKeepsFrames() {
        List<UiComponentNodeEntity> content = pages.get("about-this-demo").content();
        assertThat(content).extracting(UiComponentNodeEntity::kind)
                .containsExactly("pageHeader", "banner", "verticalLayout", "horizontalLayout");
        assertThat(content.get(0).children()).extracting(UiComponentNodeEntity::label).containsExactly("Home");
        assertThat(flatten(content)).extracting(UiComponentNodeEntity::text)
                .doesNotContain("not content", "designer notes are never content");
        assertThat(content.get(3).children()).extracting(UiComponentNodeEntity::kind).containsExactly("notice", "bulletedList");
    }

    @Test
    void theImportedPagesGenerateCode() {
        for (PageEntity page : pages.values()) {
            var tree = ComponentTreeJava.of(page.content());
            assertThat(tree.expression()).as(page.id()).isNotBlank();
        }
        assertThat(ComponentTreeJava.of(pages.get("welcome").content()).expression())
                .contains("HeroSection", "DashboardPanel");
        assertThat(ComponentTreeJava.of(pages.get("starship-new").content()).expression())
                .contains("TabLayout", "Identity");
    }

    @Test
    void theStarWarsFileNeedsNoWarnings() {
        assertThat(mapper.warnings()).isEmpty();
    }

    @Test
    void aJavaArchetypeFrameIsImportedAsAPlaceholderWithAWarning() throws Exception {
        JsonNode file = new ObjectMapper().readTree("""
                {"document":{"children":[{"type":"CANVAS","name":"Screens","children":[
                  {"type":"FRAME","name":"Todo","children":[
                    {"type":"INSTANCE","id":"1:2","name":"T","componentId":"c1","children":[
                      {"type":"TEXT","name":"Title","characters":"My tasks"}]}]}]}]},
                 "components":{"c1":{"name":"Mateu/Page Templates/To-do List"}},
                 "componentSets":{}}
                """);
        FigmaToModel m = new FigmaToModel(contract);
        var todo = m.map(file).get(0).content().get(0);
        assertThat(todo.kind()).isEqualTo("todoList");
        assertThat(todo.title()).isEqualTo("My tasks");
        assertThat(m.warnings()).singleElement().asString().contains("Java archetype", "todoList");
    }

    private static UiComponentNodeEntity root(String page) {
        List<UiComponentNodeEntity> content = pages.get(page).content();
        assertThat(content).as(page).hasSize(1);
        return content.get(0);
    }

    private static List<UiComponentNodeEntity> flatten(List<UiComponentNodeEntity> nodes) {
        List<UiComponentNodeEntity> out = new ArrayList<>();
        for (UiComponentNodeEntity n : nodes) {
            out.add(n);
            if (n.children() != null) out.addAll(flatten(n.children()));
        }
        return out;
    }
}
