package io.mateu.modux.modeldrivengenerator.application.usecases.project.importfigma;

import com.fasterxml.jackson.databind.JsonNode;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure mapper from a Figma file (the REST {@code GET /v1/files/:key} JSON) to modux pages: every
 * top-level frame (or top-level page-template instance) on a canvas becomes a {@link PageEntity}
 * whose {@code content} is the tree of {@link UiComponentNodeEntity}s recognized through the Mateu
 * design contract.
 *
 * <p>Conventions (mateu {@code design/figma/contract.json} → {@code yamlConventions}; the same
 * reading as mateu's {@code design/figma/to-yaml}):
 *
 * <ul>
 *   <li>Instances of {@code Mateu/*} library components become nodes of the contract's
 *       {@code kind}; instances of anything else are ignored (with a warning).
 *   <li>The entry's fixed Mateu attributes ({@code mateu}: a Number field's {@code dataType}…),
 *       its variant values, the {@code #config} text layer ({@code "fieldId=email; actionId=save"},
 *       empty values not read) and the text layers named in its {@code texts} map become
 *       {@code params} (title/text/label/fieldId/stereotype land on the node's typed fields). A text
 *       layer still showing its own name is an unedited placeholder and is not read. The current
 *       library carries config and texts as TEXT/BOOLEAN component properties
 *       ({@code componentProperties}, keys {@code <name>#<id>}): they WIN over {@code #config}
 *       and the text layers; an unknown one is a warning.
 *   <li>A native Figma slot (a child of type {@code SLOT}, named after its frame or linked to the
 *       {@code slot:<name>} property) or a frame named {@code slot:<name>} holds the content of
 *       that slot of the instance it is in
 *       — or, beside a page-template instance in a screen frame, of that template's slot; the other
 *       siblings are the template's {@code content}. The {@code content} slot (or an entry's only
 *       slot) becomes the node's children; any other slot a child {@code verticalLayout} carrying
 *       {@code params.slot}.
 *   <li>Page templates ({@code Mateu/Page Templates/<FormTemplate>}) are laid out with modux's own
 *       kinds — the way Mateu's server lays a template's slots out for renderers that do not know
 *       it — inside a root {@code verticalLayout} whose {@code params.template} names the template.
 *       The Java-archetype entries of that category have no modux composition: they are imported
 *       as a node of their kind and reported in {@link #warnings()}.
 *   <li>Plain FRAMEs group children ({@code horizontalLayout}/{@code verticalLayout} by layout
 *       mode, or the layout their name says), {@code partial:<ref>} frames keep the ref in
 *       {@code params.partial}, hidden layers, {@code #…} layers and {@code _…} screens are skipped,
 *       and — like Mateu's own {@code @Section} semantics — a {@code section} node without slot
 *       content absorbs the siblings that follow it until the next section marker.
 * </ul>
 */
public class FigmaToModel {

    private static final Pattern SLOT = Pattern.compile("^slot:(.+)$");
    private static final Pattern PARTIAL = Pattern.compile("^partial:(.+)$");

    /** The FormTemplates modux lays out with its own kinds. */
    public static final Set<String> COMPOSED_TEMPLATES = Set.of(
            "ItemOverviewPage", "WelcomePage", "HeroSearchPage", "MultimediaContentPage",
            "DashboardLandingPage", "GeneralOverviewPage", "CollectionDetailPage", "FoldoutPage",
            "AdvancedCreateEditPage", "GuidedProcessPage", "DataManagementPage");

    private final FigmaContract contract;
    private final Map<String, String> componentNamesById = new LinkedHashMap<>();
    private final List<String> warnings = new ArrayList<>();

    public FigmaToModel(FigmaContract contract) {
        this.contract = contract;
    }

    /** What could not be mapped faithfully in the last {@link #map} call, one line per finding. */
    public List<String> warnings() {
        return List.copyOf(warnings);
    }

    public List<PageEntity> map(JsonNode figmaFile) {
        warnings.clear();
        componentNamesById.clear();
        indexComponents(figmaFile);
        List<PageEntity> pages = new ArrayList<>();
        for (JsonNode canvas : figmaFile.path("document").path("children")) {
            if (!"CANVAS".equals(canvas.path("type").asText())) continue;
            // skip the generated library pages when screens live in the same file
            if (canvas.path("name").asText().startsWith("Mateu ·")) continue;
            for (JsonNode screen : canvas.path("children")) {
                if (!isScreen(screen)) continue;
                pages.add(toPage(screen));
            }
        }
        return pages;
    }

    private static boolean isScreen(JsonNode node) {
        if (hidden(node) || node.path("name").asText().startsWith("_")) return false;
        return Set.of("FRAME", "INSTANCE", "SECTION", "GROUP").contains(node.path("type").asText());
    }

    /** file.components: componentId → name; variants resolve through file.componentSets. */
    private void indexComponents(JsonNode figmaFile) {
        JsonNode componentSets = figmaFile.path("componentSets");
        figmaFile.path("components").fields().forEachRemaining(entry -> {
            JsonNode component = entry.getValue();
            String setId = component.path("componentSetId").asText("");
            String name = !setId.isEmpty()
                    ? componentSets.path(setId).path("name").asText()
                    : component.path("name").asText();
            componentNamesById.put(entry.getKey(), name);
            if (!setId.isEmpty()) {
                // remember the variant string too (the component's own name, "theme=danger, …")
                componentNamesById.put(entry.getKey() + "#variant", component.path("name").asText());
            }
        });
    }

    private FigmaContract.Entry entryOf(JsonNode node) {
        if (!"INSTANCE".equals(node.path("type").asText())) return null;
        return contract.byFigmaName(componentNamesById.getOrDefault(node.path("componentId").asText(), ""));
    }

    private boolean isComposableTemplate(JsonNode node) {
        FigmaContract.Entry entry = entryOf(node);
        return entry != null && FigmaContract.PAGE_TEMPLATE.equals(entry.kind());
    }

    // ── screens ──────────────────────────────────────────────────────────────────────────────

    private PageEntity toPage(JsonNode screen) {
        String name = screen.path("name").asText();
        List<UiComponentNodeEntity> content;
        FigmaContract.Entry entry = entryOf(screen);
        if (entry != null) {
            UiComponentNodeEntity mapped = mapInstance(screen, new LinkedHashMap<>());
            content = mapped == null ? List.of() : List.of(mapped);
        } else {
            List<JsonNode> children = new ArrayList<>();
            screen.path("children").forEach(c -> { if (!hidden(c)) children.add(c); });
            JsonNode template = children.stream().filter(this::isComposableTemplate).findFirst().orElse(null);
            Map<String, List<JsonNode>> slots = new LinkedHashMap<>();
            List<JsonNode> rest = new ArrayList<>();
            for (JsonNode c : children) {
                if (c == template) continue;
                Matcher m = SLOT.matcher(c.path("name").asText());
                if (m.matches()) c.path("children").forEach(k -> slots.computeIfAbsent(m.group(1), x -> new ArrayList<>()).add(k));
                else rest.add(c);
            }
            if (template != null) {
                if (!rest.isEmpty()) slots.computeIfAbsent("content", x -> new ArrayList<>()).addAll(rest);
                UiComponentNodeEntity mapped = mapInstance(template, slots);
                content = mapped == null ? List.of() : List.of(mapped);
            } else {
                // a FREE page: its toolbar slot heads the content, the rest is the content
                List<UiComponentNodeEntity> free = new ArrayList<>();
                List<UiComponentNodeEntity> toolbar = flattenToolbar(mapAll(slots.getOrDefault("toolbar", List.of())));
                if (!toolbar.isEmpty()) free.add(node("toolbar", null, null, null, toolbar, Map.of()));
                free.addAll(foldSections(mapAll(rest)));
                free.addAll(foldSections(mapAll(slots.getOrDefault("content", List.of()))));
                for (String slot : slots.keySet()) {
                    if (!"toolbar".equals(slot) && !"content".equals(slot)) {
                        warn(screen, "a page without a page template has no slot \"" + slot + "\" — ignored");
                    }
                }
                content = free;
            }
        }
        String type = containsKind(content, "wizard") ? "wizard"
                : containsKind(content, "crud") ? "crud" : "form";
        PageEntity page = new PageEntity(
                kebab(name), name, "/" + kebab(name), type, null,
                null, List.of(), null,
                null, List.of(),
                List.of(), List.of(),
                List.of(), List.of(),
                List.of(), List.of(),
                List.of(), null,
                content, null,
                null, null, null, null);
        String title = content.size() == 1 && content.get(0).params() != null
                && content.get(0).params().containsKey("template") ? content.get(0).title() : null;
        return title == null ? page : page.toBuilder().title(title).build();
    }

    // ── nodes ────────────────────────────────────────────────────────────────────────────────

    private List<UiComponentNodeEntity> mapAll(List<JsonNode> nodes) {
        List<UiComponentNodeEntity> out = new ArrayList<>();
        for (JsonNode child : nodes) {
            UiComponentNodeEntity mapped = mapNode(child);
            if (mapped != null) out.add(mapped);
        }
        return out;
    }

    private List<UiComponentNodeEntity> mapChildren(JsonNode node) {
        List<JsonNode> children = new ArrayList<>();
        node.path("children").forEach(children::add);
        return mapAll(children);
    }

    private UiComponentNodeEntity mapNode(JsonNode node) {
        if (hidden(node) || node.path("name").asText().startsWith("#")) return null;
        String type = node.path("type").asText();
        String name = node.path("name").asText();
        Matcher partial = PARTIAL.matcher(name);
        if (partial.matches()) {
            List<UiComponentNodeEntity> children = foldSections(mapChildren(node));
            return node("verticalLayout", null, null, null, children, Map.of("partial", partial.group(1)));
        }
        if ("INSTANCE".equals(type)) {
            if (entryOf(node) == null) {
                warn(node, "instance of \"" + componentNamesById.getOrDefault(node.path("componentId").asText(), "?")
                        + "\" is not a Mateu component — ignored");
                return null;
            }
            return mapInstance(node, new LinkedHashMap<>());
        }
        // a SLOT out of its instance (a detached copy) groups like a frame
        if (Set.of("FRAME", "GROUP", "SECTION", "COMPONENT", "SLOT").contains(type)) {
            List<UiComponentNodeEntity> children = foldSections(mapChildren(node));
            if (children.isEmpty()) return null;
            Matcher slot = SLOT.matcher(name);
            String kind = switch (name) {
                case "FormLayout" -> "formLayout";
                case "HorizontalLayout" -> "horizontalLayout";
                case "VerticalLayout" -> "verticalLayout";
                default -> "HORIZONTAL".equals(node.path("layoutMode").asText()) ? "horizontalLayout" : "verticalLayout";
            };
            return node(kind, null, null, null, children, slot.matches() ? Map.of("slot", slot.group(1)) : Map.of());
        }
        if ("TEXT".equals(type)) {
            String characters = node.path("characters").asText();
            if (characters.isBlank()) return null;
            return node("text", null, characters, null, List.of(), Map.of());
        }
        if (DECORATION.contains(type)) return null; // shapes, vectors, images
        warn(node, "a " + type + " layer is not read (no Mateu counterpart)");
        return null;
    }

    /** Layer types that only draw: never content, never a warning. */
    private static final Set<String> DECORATION = Set.of("RECTANGLE", "ELLIPSE", "LINE", "VECTOR",
            "STAR", "POLYGON", "REGULAR_POLYGON", "BOOLEAN_OPERATION");

    /**
     * An instance through its contract entry.
     *
     * @param extraSlots slot contents found OUTSIDE the instance (siblings of a page template)
     */
    private UiComponentNodeEntity mapInstance(JsonNode instance, Map<String, List<JsonNode>> extraSlots) {
        FigmaContract.Entry entry = entryOf(instance);
        if (entry == null) return null;

        Map<String, String> params = readParams(instance, entry);

        Map<String, List<JsonNode>> rawSlots = slotsOf(instance, new LinkedHashMap<>());
        extraSlots.forEach((k, v) -> rawSlots.computeIfAbsent(k, x -> new ArrayList<>()).addAll(v));
        Map<String, List<UiComponentNodeEntity>> slots = new LinkedHashMap<>();
        rawSlots.forEach((k, v) -> slots.put(k, foldSections(mapAll(v))));

        if (FigmaContract.PAGE_TEMPLATE.equals(entry.kind())) {
            return composeTemplate(instance, entry, params, slots);
        }
        if (FigmaContract.TEMPLATE_PART.equals(entry.kind())) {
            return templatePart(entry, params, slots);
        }
        if (entry.name().startsWith("Mateu/Page Templates/") && !entry.hasYaml()) {
            warn(instance, entry.name() + " is a Java archetype (kind '" + entry.kind()
                    + "') that modux does not compose: imported as a '" + entry.kind()
                    + "' placeholder node — extend the archetype in code"
                    + (entry.note() != null ? " (" + entry.note() + ")" : ""));
        }

        List<UiComponentNodeEntity> children = new ArrayList<>();
        for (Map.Entry<String, List<UiComponentNodeEntity>> slot : slots.entrySet()) {
            if (slot.getValue().isEmpty()) continue;
            if (!entry.slots().isEmpty() && !entry.slots().contains(slot.getKey())) {
                warn(instance, "slot \"" + slot.getKey() + "\" is not a slot of " + entry.name());
            }
            if ("content".equals(slot.getKey()) || entry.slots().size() <= 1) {
                children.addAll(slot.getValue());
            } else {
                children.add(slotNode(slot.getKey(), slot.getValue()));
            }
        }
        return typed(entry.kind(), params, children);
    }

    /** Params read off an instance: Mateu defaults, variants, then {@code #config}, then text layers. */
    private Map<String, String> readParams(JsonNode instance, FigmaContract.Entry entry) {
        Map<String, String> params = new LinkedHashMap<>(entry.defaults());
        String componentId = instance.path("componentId").asText();
        // variant axes: the instance's VARIANT componentProperties, else its variant's own name
        boolean fromProperties = false;
        var properties = instance.path("componentProperties").fields();
        while (properties.hasNext()) {
            var property = properties.next();
            if ("VARIANT".equals(property.getValue().path("type").asText())) {
                params.put(property.getKey().replaceAll("#.*$", ""), property.getValue().path("value").asText());
                fromProperties = true;
            }
        }
        if (!fromProperties) {
            String variantString = componentNamesById.getOrDefault(componentId + "#variant", "");
            for (String pair : variantString.split(",")) {
                String[] keyValue = pair.trim().split("=", 2);
                if (keyValue.length == 2 && !keyValue[1].isBlank()) params.put(keyValue[0].trim(), keyValue[1].trim());
            }
        }
        for (JsonNode layer : ownLayers(instance, new ArrayList<>())) {
            if (!"TEXT".equals(layer.path("type").asText())) continue;
            String layerName = layer.path("name").asText();
            String characters = layer.path("characters").asText();
            if ("#config".equals(layerName)) {
                for (String pair : characters.split(";")) {
                    String[] keyValue = pair.trim().split("=", 2);
                    if (keyValue.length == 2 && !keyValue[1].isBlank()) {
                        params.put(keyValue[0].trim(), keyValue[1].trim());
                    }
                }
            } else if (!layerName.startsWith("#")) {
                String param = entry.texts().get(layerName);
                // a layer still showing its own name is an unedited placeholder
                if (param != null && !characters.isBlank() && !entry.isPlaceholder(layerName, characters)) {
                    params.put(param, characters);
                }
            }
        }
        // the current library's TEXT/BOOLEAN component properties (Figma's properties panel) win
        // over #config and the text layers — a property bound to a layer is the same value
        var all = instance.path("componentProperties").fields();
        while (all.hasNext()) {
            var property = all.next();
            String type = property.getValue().path("type").asText();
            if (!"TEXT".equals(type) && !"BOOLEAN".equals(type)) continue;
            String name = property.getKey().replaceAll("#[^#]*$", "");
            String param = entry.paramOfProperty(name);
            if (param == null) {
                warn(instance, "property \"" + name + "\" is not a param of " + entry.name());
                continue;
            }
            String value = property.getValue().path("value").asText("");
            if (value.isBlank() || "false".equals(value) && "BOOLEAN".equals(type)) continue;
            String layer = entry.layerOfProperty(name);
            if (layer != null && entry.isPlaceholder(layer, value)) continue;
            params.put(param, value);
        }
        return params;
    }

    /**
     * The contract name of a slot layer, or null: a frame named {@code slot:<name>} (an older
     * library, a detached copy, a sibling frame) or a native Figma slot — a node of type
     * {@code SLOT}, named after its frame, else after the SLOT property it references
     * ({@code componentPropertyReferences.slotContentId = "slot:<name>#<id>"}).
     */
    static String slotName(JsonNode child) {
        Matcher m = SLOT.matcher(child.path("name").asText());
        if (m.matches()) return m.group(1);
        if (!"SLOT".equals(child.path("type").asText())) return null;
        String ref = child.path("componentPropertyReferences").path("slotContentId").asText("");
        String fromRef = ref.replaceAll("#[^#]*$", "").replaceFirst("^slot:", "");
        if (!fromRef.isEmpty()) return fromRef;
        String name = child.path("name").asText("");
        return name.isEmpty() ? null : name;
    }

    /** The instance's own layers: everything but nested Mateu instances and slots. */
    private List<JsonNode> ownLayers(JsonNode node, List<JsonNode> out) {
        for (JsonNode child : node.path("children")) {
            if (hidden(child)) continue;
            if (slotName(child) != null) continue;
            if (entryOf(child) != null) continue;
            out.add(child);
            ownLayers(child, out);
        }
        return out;
    }

    /** The slots of an instance (not crossing nested Mateu instances). */
    private Map<String, List<JsonNode>> slotsOf(JsonNode node, Map<String, List<JsonNode>> out) {
        for (JsonNode child : node.path("children")) {
            if (hidden(child)) continue;
            String slot = slotName(child);
            if (slot != null) {
                List<JsonNode> list = out.computeIfAbsent(slot, x -> new ArrayList<>());
                child.path("children").forEach(list::add);
                continue;
            }
            if (entryOf(child) != null) continue;
            slotsOf(child, out);
        }
        return out;
    }

    // ── page templates ───────────────────────────────────────────────────────────────────────

    /**
     * Lays a FormTemplate's slots out with modux kinds, following Mateu's server-side layout
     * ({@code PageTemplates}): the root is a {@code verticalLayout} with {@code params.template}.
     */
    private UiComponentNodeEntity composeTemplate(JsonNode instance, FigmaContract.Entry entry,
                                                  Map<String, String> params,
                                                  Map<String, List<UiComponentNodeEntity>> slots) {
        String template = entry.simpleName();
        String title = params.remove("title");
        String subtitle = params.remove("subtitle");
        String overline = params.remove("overline");
        for (String slot : slots.keySet()) {
            if (!slots.get(slot).isEmpty() && !entry.slots().contains(slot)) {
                warn(instance, "slot \"" + slot + "\" is not a slot of " + entry.name() + " — kept as a plain group");
            }
        }
        List<UiComponentNodeEntity> toolbar = flattenToolbar(slots.getOrDefault("toolbar", List.of()));
        List<UiComponentNodeEntity> content = slots.getOrDefault("content", List.of());
        List<UiComponentNodeEntity> out = new ArrayList<>();

        Map<String, String> headerParams = new LinkedHashMap<>();
        if (subtitle != null) headerParams.put("subtitle", subtitle);
        if (overline != null) headerParams.put("overline", overline);
        UiComponentNodeEntity header = node("pageHeader", title, null, null, toolbar, headerParams);

        switch (template) {
            case "ItemOverviewPage" -> {
                List<UiComponentNodeEntity> panel = new ArrayList<>();
                panel.addAll(slots.getOrDefault("body", List.of()));
                panel.addAll(slots.getOrDefault("footer", List.of()));
                Map<String, String> media = new LinkedHashMap<>();
                params.forEach((k, v) -> { if (k.startsWith("avatar.") || k.startsWith("photo.")) media.put(k, v); });
                out.add(header);
                out.add(node("horizontalLayout", null, null, null, List.of(
                        withParams(node("card", title, null, null, panel, media), "slot", "item-overview-panel"),
                        slotNode("item-overview-main", content)), Map.of("slot", "item-overview")));
            }
            case "WelcomePage", "MultimediaContentPage", "HeroSearchPage" -> {
                // the template owns the header: a centred hero holding the CTAs
                Map<String, String> heroParams = new LinkedHashMap<>(headerParams);
                heroParams.remove("subtitle");
                out.add(node("hero", title, subtitle, null, toolbar, heroParams));
                out.addAll(content);
            }
            case "DashboardLandingPage" -> {
                out.add(header);
                List<UiComponentNodeEntity> kpi = slots.getOrDefault("kpi", List.of());
                if (!kpi.isEmpty()) out.add(withParams(node("scoreboard", null, null, null, kpi, Map.of()), "slot", "kpi"));
                if (!content.isEmpty()) out.add(node("dashboardLayout", null, null, null, content, Map.of("slot", "dashboard-panels")));
            }
            case "GeneralOverviewPage" -> {
                out.add(header);
                out.add(node("horizontalLayout", null, null, null, List.of(
                        slotNode("general-overview-main", content),
                        slotNode("info", slots.getOrDefault("info", List.of()))), Map.of("slot", "general-overview")));
            }
            case "CollectionDetailPage" -> {
                out.add(header);
                List<UiComponentNodeEntity> detail = !content.isEmpty() ? content : slots.getOrDefault("noSelection", List.of());
                out.add(node("masterDetailLayout", null, null, null, List.of(
                        slotNode("list", slots.getOrDefault("list", List.of())),
                        slotNode(!content.isEmpty() ? "collection-detail-detail" : "noSelection", detail)), Map.of()));
            }
            case "FoldoutPage" -> {
                out.add(header);
                List<UiComponentNodeEntity> panels = new ArrayList<>();
                List<UiComponentNodeEntity> overview = slots.getOrDefault("overview", List.of());
                if (!overview.isEmpty()) panels.add(withTitle(slotNode("overview", overview), title));
                panels.addAll(content);
                Map<String, String> foldout = new LinkedHashMap<>();
                if (params.containsKey("orientation")) foldout.put("orientation", params.get("orientation"));
                out.add(node("foldoutLayout", null, null, null, panels, foldout));
            }
            case "AdvancedCreateEditPage" -> {
                out.add(header);
                List<UiComponentNodeEntity> detail = slots.getOrDefault("detail", List.of());
                if (detail.isEmpty()) out.addAll(content);
                else out.add(node("horizontalLayout", null, null, null, List.of(
                        slotNode("main", content), slotNode("aside", detail)), Map.of("slot", "advanced-create-edit")));
            }
            case "GuidedProcessPage" -> {
                out.add(header);
                List<UiComponentNodeEntity> steps = new ArrayList<>();
                for (UiComponentNodeEntity step : slots.getOrDefault("steps", List.of())) {
                    steps.add("tab".equals(step.kind()) ? step : withTitle(node("tab", null, null, null, List.of(step), Map.of()), "Step " + (steps.size() + 1)));
                }
                out.add(node("tabLayout", null, null, null, steps, Map.of("slot", "guided-process")));
            }
            case "DataManagementPage" -> {
                out.add(header);
                List<UiComponentNodeEntity> end = slots.getOrDefault("end", List.of());
                if (end.isEmpty()) out.addAll(content);
                else {
                    List<UiComponentNodeEntity> row = new ArrayList<>();
                    row.add(slotNode("data-management-body", content));
                    end.forEach(e -> row.add(withParams(e, "slot", "end")));
                    out.add(node("horizontalLayout", null, null, null, row, Map.of("slot", "data-management")));
                }
                slots.getOrDefault("bottom", List.of()).forEach(b -> out.add(withParams(b, "slot", "bottom")));
            }
            default -> {
                warn(instance, "page template " + template + " is not composed by modux yet: its slots"
                        + " are imported as plain groups under the page header");
                out.add(header);
                slots.forEach((name, nodes) -> {
                    if (!"toolbar".equals(name) && !nodes.isEmpty()) {
                        out.add("content".equals(name) ? node("verticalLayout", null, null, null, nodes, Map.of()) : slotNode(name, nodes));
                    }
                });
            }
        }
        Map<String, String> rootParams = new LinkedHashMap<>(params);
        rootParams.put("template", template);
        return node("verticalLayout", title, null, null, out, rootParams);
    }

    /** GuidedProcessStep → a tab of the steps' tab layout; DockedPanel → a card. */
    private UiComponentNodeEntity templatePart(FigmaContract.Entry entry, Map<String, String> params,
                                               Map<String, List<UiComponentNodeEntity>> slots) {
        List<UiComponentNodeEntity> content = new ArrayList<>();
        slots.values().forEach(content::addAll);
        Map<String, String> partParams = new LinkedHashMap<>(params);
        partParams.put("part", entry.simpleName());
        String kind = "GuidedProcessStep".equals(entry.simpleName()) ? "tab" : "card";
        return typed(kind, partParams, content);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────────────

    private void warn(JsonNode node, String message) {
        warnings.add(node.path("name").asText("?") + " (" + node.path("id").asText("?") + "): " + message);
    }

    private static boolean hidden(JsonNode node) {
        return node.has("visible") && !node.path("visible").asBoolean(true);
    }

    /** A toolbar slot may hold a Toolbar instance: its buttons are the toolbar. */
    private static List<UiComponentNodeEntity> flattenToolbar(List<UiComponentNodeEntity> nodes) {
        List<UiComponentNodeEntity> out = new ArrayList<>();
        for (UiComponentNodeEntity n : nodes) {
            if ("toolbar".equals(n.kind()) && n.children() != null) out.addAll(n.children());
            else out.add(n);
        }
        return out;
    }

    private static UiComponentNodeEntity typed(String kind, Map<String, String> params,
                                               List<UiComponentNodeEntity> children) {
        Map<String, String> p = new LinkedHashMap<>(params);
        String title = p.remove("title");
        String text = p.remove("text");
        String label = p.remove("label");
        String fieldId = p.remove("fieldId");
        String stereotype = p.remove("stereotype");
        return new UiComponentNodeEntity(UUID.randomUUID().toString(), kind, title, text,
                label, null, null, null, null, null, fieldId, stereotype, null, children, null,
                p.isEmpty() ? null : p);
    }

    private static UiComponentNodeEntity slotNode(String slot, List<UiComponentNodeEntity> children) {
        return node("verticalLayout", null, null, null, children, Map.of("slot", slot));
    }

    private static UiComponentNodeEntity withParams(UiComponentNodeEntity n, String key, String value) {
        Map<String, String> params = new LinkedHashMap<>(n.params() == null ? Map.of() : n.params());
        params.put(key, value);
        return n.toBuilder().params(params).build();
    }

    private static UiComponentNodeEntity withTitle(UiComponentNodeEntity n, String title) {
        return n.toBuilder().title(title).build();
    }

    /**
     * Mateu's @Section semantics: a section marker absorbs the siblings that follow it — unless it
     * already holds its own content (a v2 {@code slot:content}), which closes the run instead.
     */
    private List<UiComponentNodeEntity> foldSections(List<UiComponentNodeEntity> siblings) {
        if (siblings.stream().noneMatch(n -> "section".equals(n.kind()))) return siblings;
        List<UiComponentNodeEntity> out = new ArrayList<>();
        UiComponentNodeEntity current = null;
        List<UiComponentNodeEntity> absorbed = new ArrayList<>();
        for (UiComponentNodeEntity sibling : siblings) {
            boolean marker = "section".equals(sibling.kind());
            if (marker && sibling.children() != null && !sibling.children().isEmpty()) {
                if (current != null) out.add(withChildren(current, absorbed));
                current = null;
                out.add(sibling);
            } else if (marker) {
                if (current != null) out.add(withChildren(current, absorbed));
                current = sibling;
                absorbed = new ArrayList<>();
            } else if (current != null) {
                absorbed.add(sibling);
            } else {
                out.add(sibling);
            }
        }
        if (current != null) out.add(withChildren(current, absorbed));
        return out;
    }

    private static UiComponentNodeEntity withChildren(UiComponentNodeEntity n, List<UiComponentNodeEntity> children) {
        return n.toBuilder().children(children).build();
    }

    private static UiComponentNodeEntity node(String kind, String title, String text, String label,
                                              List<UiComponentNodeEntity> children, Map<String, String> params) {
        return new UiComponentNodeEntity(UUID.randomUUID().toString(), kind, title, text, label,
                null, null, null, null, null, null, null, null, children, null,
                params == null || params.isEmpty() ? null : new LinkedHashMap<>(params));
    }

    private static boolean containsKind(List<UiComponentNodeEntity> nodes, String kind) {
        for (UiComponentNodeEntity node : nodes) {
            if (kind.equals(node.kind())) return true;
            if (node.children() != null && containsKind(node.children(), kind)) return true;
        }
        return false;
    }

    private static String kebab(String name) {
        return name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }
}
