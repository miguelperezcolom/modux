package io.mateu.modux.figma;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads a Figma file (the REST {@code GET /v1/files/:key} JSON) whose screens were composed with
 * the Mateu component library, and maps every top-level frame to a {@link Screen} through the
 * Mateu design contract — read from the {@code io.mateu:mateu-uidl} artifact
 * ({@code META-INF/mateu/contract.json}), never from a copy. Same conventions as modux's
 * {@code importfigma} use case and mateu's {@code design/figma/to-yaml}: instances of
 * {@code Mateu/*} become nodes (Mateu defaults + variants + {@code #config} + text overrides as
 * params, then the current library's TEXT/BOOLEAN component properties, which win; a text still
 * showing its placeholder is not read), native Figma slots (type {@code SLOT}) and
 * {@code slot:<name>} frames hold an instance's content (beside a page-template instance, the template's), hidden and
 * {@code #…} layers and {@code _…} screens are skipped, sections without slot content absorb the
 * siblings that follow them, plain frames group, and {@code Mateu · *} library canvases are
 * skipped.
 *
 * <p>A page template ({@code Mateu/Page Templates/<FormTemplate>}) becomes a {@code pageTemplate}
 * node ({@code params.template}) whose named slots are {@code slot} nodes ({@code params.slot})
 * and whose content follows them; the emitters walk through both and say which template to
 * declare.
 */
public class FigmaScreenReader {

    /** Where mateu-uidl publishes the contract. */
    public static final String CONTRACT_LOCATION = "/META-INF/mateu/contract.json";

    private static final Pattern SLOT = Pattern.compile("^slot:(.+)$");
    private static final Pattern PARTIAL = Pattern.compile("^partial:(.+)$");

    private record Entry(String name, String kind, Map<String, String> texts, Map<String, String> defaults,
                         List<String> slots, boolean hasYaml, Set<String> props, Map<String, String> drawnTexts) {

        String simpleName() {
            return name.substring(name.lastIndexOf('/') + 1);
        }

        /** The param a TEXT/BOOLEAN component property carries (see Mateu's plugin plan.ts), or null. */
        String paramOfProperty(String property) {
            if (texts.containsKey(property)) return texts.get(property);
            if (props.contains(property)) return property;
            long layers = texts.values().stream().filter(property::equals).count();
            return layers == 1 ? property : null;
        }

        String layerOfProperty(String property) {
            if (texts.containsKey(property)) return property;
            if (props.contains(property)) return null;
            return texts.entrySet().stream().filter(e -> e.getValue().equals(property))
                    .map(Map.Entry::getKey).findFirst().orElse(null);
        }

        boolean isPlaceholder(String layer, String value) {
            return value.equals(layer) || value.equals(drawnTexts.get(layer));
        }
    }

    private static Map<String, String> drawnTexts(JsonNode sketch, Map<String, String> out) {
        if (sketch.isArray()) {
            sketch.forEach(n -> drawnTexts(n, out));
        } else if (sketch.isObject()) {
            if (sketch.path("layer").isTextual() && sketch.path("text").isTextual()) {
                out.put(sketch.path("layer").asText(), sketch.path("text").asText());
            }
            sketch.elements().forEachRemaining(n -> drawnTexts(n, out));
        }
        return out;
    }

    /** Layer types that only draw: never content, never a warning. */
    private static final Set<String> DECORATION = Set.of("RECTANGLE", "ELLIPSE", "LINE", "VECTOR",
            "STAR", "POLYGON", "REGULAR_POLYGON", "BOOLEAN_OPERATION");

    /**
     * The contract name of a slot layer, or null: a frame named {@code slot:<name>} or a native
     * Figma slot (type {@code SLOT}, named after its frame, else after the SLOT property it
     * references, {@code componentPropertyReferences.slotContentId}).
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

    private final Map<String, Entry> contract = new LinkedHashMap<>();
    private final Map<String, String> componentNamesById = new LinkedHashMap<>();
    private final List<String> warnings = new ArrayList<>();

    public FigmaScreenReader(Path contractOverride) throws Exception {
        JsonNode root;
        if (contractOverride != null) {
            root = new ObjectMapper().readTree(Files.readString(contractOverride));
        } else {
            try (InputStream in = getClass().getResourceAsStream(CONTRACT_LOCATION)) {
                if (in == null) {
                    throw new IllegalStateException("The Mateu design contract is not on the classpath ("
                            + CONTRACT_LOCATION + "): add the io.mateu:mateu-uidl dependency");
                }
                root = new ObjectMapper().readTree(in);
            }
        }
        for (JsonNode component : root.path("components")) {
            Map<String, String> texts = new LinkedHashMap<>();
            component.path("texts").fields().forEachRemaining(e -> texts.put(e.getKey(), e.getValue().asText()));
            Map<String, String> defaults = new LinkedHashMap<>();
            component.path("mateu").fields().forEachRemaining(e -> {
                if (e.getValue().isValueNode()) defaults.put(e.getKey(), e.getValue().asText());
            });
            List<String> slots = new ArrayList<>();
            component.path("yaml").path("slots").fieldNames().forEachRemaining(slots::add);
            String name = component.path("name").asText();
            Set<String> props = new java.util.LinkedHashSet<>();
            component.path("props").fieldNames().forEachRemaining(props::add);
            contract.put(name, new Entry(name, component.path("kind").asText(), texts, defaults, slots,
                    !component.has("yaml") || !component.path("yaml").isNull(), props,
                    drawnTexts(component.path("sketch"), new LinkedHashMap<>())));
        }
    }

    /** What could not be mapped faithfully in the last {@link #read} call. */
    public List<String> warnings() {
        return List.copyOf(warnings);
    }

    public List<Screen> read(Path figmaFileJson) throws Exception {
        JsonNode file = new ObjectMapper().readTree(Files.readString(figmaFileJson));
        return read(file);
    }

    public List<Screen> read(JsonNode file) {
        componentNamesById.clear();
        warnings.clear();
        indexComponents(file);
        List<Screen> screens = new ArrayList<>();
        for (JsonNode canvas : file.path("document").path("children")) {
            if (!"CANVAS".equals(canvas.path("type").asText())) continue;
            if (canvas.path("name").asText().startsWith("Mateu ·")) continue;
            for (JsonNode frame : canvas.path("children")) {
                if (hidden(frame) || frame.path("name").asText().startsWith("_")) continue;
                if (!Set.of("FRAME", "INSTANCE", "SECTION", "GROUP").contains(frame.path("type").asText())) continue;
                screens.add(screen(frame));
            }
        }
        return screens;
    }

    private Screen screen(JsonNode frame) {
        String name = frame.path("name").asText();
        List<Screen.Node> content;
        if (entryOf(frame) != null) {
            Screen.Node node = mapInstance(frame, new LinkedHashMap<>());
            content = node == null ? List.of() : List.of(node);
        } else {
            List<JsonNode> children = new ArrayList<>();
            frame.path("children").forEach(c -> { if (!hidden(c)) children.add(c); });
            JsonNode template = children.stream().filter(c -> {
                Entry e = entryOf(c);
                return e != null && "pageTemplate".equals(e.kind());
            }).findFirst().orElse(null);
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
                Screen.Node node = mapInstance(template, slots);
                content = node == null ? List.of() : List.of(node);
            } else {
                List<Screen.Node> free = new ArrayList<>();
                List<Screen.Node> toolbar = mapAll(slots.getOrDefault("toolbar", List.of()));
                if (!toolbar.isEmpty()) free.add(new Screen.Node("toolbar", null, null, null, null, null, Map.of(), toolbar));
                free.addAll(foldSections(mapAll(rest)));
                free.addAll(foldSections(mapAll(slots.getOrDefault("content", List.of()))));
                content = free;
            }
        }
        String type = containsKind(content, "wizard") ? "wizard"
                : containsKind(content, "crud") ? "crud" : "form";
        String template = content.size() == 1 && "pageTemplate".equals(content.get(0).kind())
                ? content.get(0).param("template") : null;
        return new Screen(name, "/" + kebab(name), type, content, template);
    }

    private void indexComponents(JsonNode file) {
        JsonNode componentSets = file.path("componentSets");
        file.path("components").fields().forEachRemaining(entry -> {
            JsonNode component = entry.getValue();
            String setId = component.path("componentSetId").asText("");
            String name = !setId.isEmpty()
                    ? componentSets.path(setId).path("name").asText()
                    : component.path("name").asText();
            componentNamesById.put(entry.getKey(), name);
            if (!setId.isEmpty()) {
                componentNamesById.put(entry.getKey() + "#variant", component.path("name").asText());
            }
        });
    }

    private Entry entryOf(JsonNode node) {
        if (!"INSTANCE".equals(node.path("type").asText())) return null;
        return contract.get(componentNamesById.getOrDefault(node.path("componentId").asText(), ""));
    }

    private List<Screen.Node> mapAll(List<JsonNode> nodes) {
        List<Screen.Node> out = new ArrayList<>();
        for (JsonNode child : nodes) {
            Screen.Node mapped = mapNode(child);
            if (mapped != null) out.add(mapped);
        }
        return out;
    }

    private List<Screen.Node> mapChildren(JsonNode node) {
        List<JsonNode> children = new ArrayList<>();
        node.path("children").forEach(children::add);
        return mapAll(children);
    }

    private Screen.Node mapNode(JsonNode node) {
        if (hidden(node) || node.path("name").asText().startsWith("#")) return null;
        String type = node.path("type").asText();
        String name = node.path("name").asText();
        if ("INSTANCE".equals(type)) {
            if (entryOf(node) == null) {
                warnings.add(name + ": instance of \"" + componentNamesById.getOrDefault(node.path("componentId").asText(), "?")
                        + "\" is not a Mateu component — ignored");
                return null;
            }
            return mapInstance(node, new LinkedHashMap<>());
        }
        // a SLOT out of its instance (a detached copy) groups like a frame
        if (Set.of("FRAME", "GROUP", "SECTION", "COMPONENT", "SLOT").contains(type)) {
            List<Screen.Node> children = foldSections(mapChildren(node));
            if (children.isEmpty()) return null;
            Matcher partial = PARTIAL.matcher(name);
            Matcher slot = SLOT.matcher(name);
            Map<String, String> params = partial.matches() ? Map.of("partial", partial.group(1))
                    : slot.matches() ? Map.of("slot", slot.group(1)) : Map.of();
            String kind = switch (name) {
                case "FormLayout" -> "formLayout";
                case "HorizontalLayout" -> "horizontalLayout";
                case "VerticalLayout" -> "verticalLayout";
                default -> "HORIZONTAL".equals(node.path("layoutMode").asText()) ? "horizontalLayout" : "verticalLayout";
            };
            return new Screen.Node(kind, null, null, null, null, null, params, children);
        }
        if ("TEXT".equals(type)) {
            String characters = node.path("characters").asText();
            if (characters.isBlank()) return null;
            return new Screen.Node("text", null, characters, null, null, null, Map.of(), List.of());
        }
        if (!DECORATION.contains(type)) warnings.add(name + ": a " + type + " layer is not read (no Mateu counterpart)");
        return null;
    }

    private Screen.Node mapInstance(JsonNode instance, Map<String, List<JsonNode>> extraSlots) {
        Entry entry = entryOf(instance);
        if (entry == null) return null;

        Map<String, String> params = new LinkedHashMap<>(entry.defaults());
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
            String variantString = componentNamesById.getOrDefault(instance.path("componentId").asText() + "#variant", "");
            for (String pair : variantString.split(",")) {
                String[] keyValue = pair.trim().split("=", 2);
                if (keyValue.length == 2 && !keyValue[1].isBlank()) params.put(keyValue[0].trim(), keyValue[1].trim());
            }
        }
        collectTexts(instance, entry, params);
        // the current library's TEXT/BOOLEAN component properties win over #config and text layers
        var all = instance.path("componentProperties").fields();
        while (all.hasNext()) {
            var property = all.next();
            String type = property.getValue().path("type").asText();
            if (!"TEXT".equals(type) && !"BOOLEAN".equals(type)) continue;
            String name = property.getKey().replaceAll("#[^#]*$", "");
            String param = entry.paramOfProperty(name);
            if (param == null) {
                warnings.add(instance.path("name").asText() + ": property \"" + name + "\" is not a param of " + entry.name());
                continue;
            }
            String value = property.getValue().path("value").asText("");
            if (value.isBlank() || "false".equals(value) && "BOOLEAN".equals(type)) continue;
            String layer = entry.layerOfProperty(name);
            if (layer != null && entry.isPlaceholder(layer, value)) continue;
            params.put(param, value);
        }

        Map<String, List<JsonNode>> rawSlots = slotsOf(instance, new LinkedHashMap<>());
        extraSlots.forEach((k, v) -> rawSlots.computeIfAbsent(k, x -> new ArrayList<>()).addAll(v));
        List<Screen.Node> children = new ArrayList<>();
        List<Screen.Node> content = new ArrayList<>();
        boolean template = "pageTemplate".equals(entry.kind());
        for (Map.Entry<String, List<JsonNode>> slot : rawSlots.entrySet()) {
            List<Screen.Node> nodes = foldSections(mapAll(slot.getValue()));
            if (nodes.isEmpty()) continue;
            if ("content".equals(slot.getKey()) || (!template && entry.slots().size() <= 1)) {
                content.addAll(nodes);
            } else {
                children.add(new Screen.Node("slot", null, null, null, null, null, Map.of("slot", slot.getKey()), nodes));
            }
        }
        children.addAll(content);

        if (template) params.put("template", entry.simpleName());
        if ("templatePart".equals(entry.kind())) params.put("part", entry.simpleName());
        if (entry.name().startsWith("Mateu/Page Templates/") && !entry.hasYaml()) {
            warnings.add(instance.path("name").asText() + ": " + entry.name()
                    + " is a Java archetype — extend it in code; only its fields and actions are generated");
        }

        String title = params.remove("title");
        String text = params.remove("text");
        String label = params.remove("label");
        String fieldId = params.remove("fieldId");
        String stereotype = params.remove("stereotype");
        return new Screen.Node(entry.kind(), title, text, label, fieldId, stereotype, params, children);
    }

    /** Text overrides and {@code #config}, from the instance's own layers only. */
    private void collectTexts(JsonNode node, Entry entry, Map<String, String> params) {
        for (JsonNode child : node.path("children")) {
            if (hidden(child)) continue;
            if (slotName(child) != null || entryOf(child) != null) continue;
            if ("TEXT".equals(child.path("type").asText())) {
                String layerName = child.path("name").asText();
                String characters = child.path("characters").asText();
                if ("#config".equals(layerName)) {
                    for (String pair : characters.split(";")) {
                        String[] keyValue = pair.trim().split("=", 2);
                        if (keyValue.length == 2 && !keyValue[1].isBlank()) {
                            params.put(keyValue[0].trim(), keyValue[1].trim());
                        }
                    }
                } else if (!layerName.startsWith("#")) {
                    String param = entry.texts().get(layerName);
                    if (param != null && !characters.isBlank() && !entry.isPlaceholder(layerName, characters)) {
                        params.put(param, characters);
                    }
                }
            } else if (child.has("children")) {
                collectTexts(child, entry, params);
            }
        }
    }

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

    private List<Screen.Node> foldSections(List<Screen.Node> siblings) {
        if (siblings.stream().noneMatch(n -> "section".equals(n.kind()))) return siblings;
        List<Screen.Node> out = new ArrayList<>();
        Screen.Node current = null;
        List<Screen.Node> absorbed = new ArrayList<>();
        for (Screen.Node sibling : siblings) {
            boolean marker = "section".equals(sibling.kind());
            if (marker && !sibling.children().isEmpty()) {
                // a v2 section with its own slot content closes the run instead of absorbing
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

    private static boolean hidden(JsonNode node) {
        return node.has("visible") && !node.path("visible").asBoolean(true);
    }

    private static Screen.Node withChildren(Screen.Node n, List<Screen.Node> children) {
        return new Screen.Node(n.kind(), n.title(), n.text(), n.label(), n.fieldId(), n.stereotype(),
                n.params(), children);
    }

    private static boolean containsKind(List<Screen.Node> nodes, String kind) {
        for (Screen.Node node : nodes) {
            if (kind.equals(node.kind())) return true;
            if (containsKind(node.children(), kind)) return true;
        }
        return false;
    }

    static String kebab(String name) {
        return name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }
}
