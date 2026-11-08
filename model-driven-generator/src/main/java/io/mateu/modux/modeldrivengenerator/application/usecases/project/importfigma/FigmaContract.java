package io.mateu.modux.modeldrivengenerator.application.usecases.project.importfigma;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * The Mateu design contract — the single source of truth of the Figma design-to-code pipeline
 * (mateu repo: {@code design/figma/contract.json}). It is NOT copied into modux: it is read from
 * the {@code io.mateu:mateu-uidl} artifact, which publishes it at {@link #CLASSPATH_LOCATION}, so
 * modux follows the Mateu release it depends on instead of drifting behind a hand-kept mirror.
 *
 * <p>Each entry gives the Figma component name ({@code Mateu/<Category>/<Name>}), the node
 * {@code kind}, the text-layer → parameter mapping ({@code texts}), the fixed Mateu attributes the
 * component stands for ({@code mateu}, e.g. a Number field's {@code dataType}) and — since v2 — the
 * names of the {@code slot:<name>} frames it accepts ({@code yaml.slots}).
 */
public class FigmaContract {

    /** Where mateu-uidl publishes the contract. */
    public static final String CLASSPATH_LOCATION = "/META-INF/mateu/contract.json";

    /** Kind of the v2 entries that are page templates ({@code Mateu/Page Templates/<FormTemplate>}). */
    public static final String PAGE_TEMPLATE = "pageTemplate";

    /** Kind of the v2 entries that are parts of a page template (GuidedProcessStep, DockedPanel). */
    public static final String TEMPLATE_PART = "templatePart";

    /**
     * One catalog entry.
     *
     * @param defaults the entry's fixed Mateu attributes ({@code mateu}), as string params
     * @param slots the slot names the entry accepts, in contract order
     * @param hasYaml false for the entries the contract marks {@code yaml: null} (Java archetypes)
     * @param note the contract's {@code yamlNote}, when any
     * @param props the entry's non-visual config keys ({@code props}): component properties in the
     *     current library, {@code #config} keys in older ones
     * @param drawnTexts layer → the text its sketch draws when a primitive names its layer apart
     *     from it ({@code {text: "+", layer: "Icon"}}): what an untouched layer still shows
     */
    public record Entry(String name, String kind, Map<String, String> texts, boolean container,
                        Map<String, String> defaults, List<String> slots, boolean hasYaml, String note,
                        Set<String> props, Map<String, String> drawnTexts) {

        public Entry(String name, String kind, Map<String, String> texts, boolean container) {
            this(name, kind, texts, container, Map.of(), List.of(), true, null);
        }

        public Entry(String name, String kind, Map<String, String> texts, boolean container,
                     Map<String, String> defaults, List<String> slots, boolean hasYaml, String note) {
            this(name, kind, texts, container, defaults, slots, hasYaml, note, Set.of(), Map.of());
        }

        /**
         * The param a TEXT/BOOLEAN component property carries, or null. Mateu's library plugin
         * names a {@code props} key as the param, and a {@code texts} layer as its param when that
         * is unambiguous, else as the layer itself ({@code Title1}); every spelling is read back.
         */
        public String paramOfProperty(String property) {
            if (texts.containsKey(property)) return texts.get(property);
            if (props.contains(property)) return property;
            long layers = texts.values().stream().filter(property::equals).count();
            return layers == 1 ? property : null;
        }

        /** The text layer a TEXT property is bound to, when it is a {@code texts} one. */
        public String layerOfProperty(String property) {
            if (texts.containsKey(property)) return property;
            if (props.contains(property)) return null;
            return texts.entrySet().stream().filter(e -> e.getValue().equals(property))
                    .map(Map.Entry::getKey).findFirst().orElse(null);
        }

        /** Whether {@code value} is what the untouched {@code layer} shows (its name or drawn text). */
        public boolean isPlaceholder(String layer, String value) {
            return value.equals(layer) || value.equals(drawnTexts.get(layer));
        }

        /** The last segment of the name: the FormTemplate record for page templates. */
        public String simpleName() {
            return name.substring(name.lastIndexOf('/') + 1);
        }
    }

    private final Map<String, Entry> byName = new LinkedHashMap<>();
    private int version;

    /** Loads the contract from {@code path}, or from the mateu-uidl artifact when null. */
    public static FigmaContract load(String path) throws Exception {
        JsonNode root;
        if (path != null) {
            root = new ObjectMapper().readTree(Files.readString(Path.of(path)));
        } else {
            try (InputStream in = FigmaContract.class.getResourceAsStream(CLASSPATH_LOCATION)) {
                if (in == null) {
                    throw new IllegalStateException("The Mateu design contract is not on the classpath ("
                            + CLASSPATH_LOCATION + "): add the io.mateu:mateu-uidl dependency");
                }
                root = new ObjectMapper().readTree(in);
            }
        }
        return parse(root);
    }

    public static FigmaContract parse(JsonNode root) {
        FigmaContract contract = new FigmaContract();
        contract.version = root.path("version").asInt(1);
        for (JsonNode component : root.path("components")) {
            Map<String, String> texts = new LinkedHashMap<>();
            component.path("texts").fields().forEachRemaining(e -> texts.put(e.getKey(), e.getValue().asText()));
            Map<String, String> defaults = new LinkedHashMap<>();
            component.path("mateu").fields().forEachRemaining(e -> {
                if (e.getValue().isValueNode()) defaults.put(e.getKey(), e.getValue().asText());
            });
            List<String> slots = new ArrayList<>();
            JsonNode yaml = component.path("yaml");
            yaml.path("slots").fieldNames().forEachRemaining(slots::add);
            String name = component.path("name").asText();
            contract.byName.put(name, new Entry(
                    name,
                    component.path("kind").asText(),
                    texts,
                    component.path("container").asBoolean(false),
                    defaults,
                    slots,
                    // v1 had no yaml mapping at all: every entry counts as mapped there
                    !component.has("yaml") || !yaml.isNull(),
                    component.path("yamlNote").asText(null),
                    propsOf(component),
                    drawnTexts(component.path("sketch"), new LinkedHashMap<>())));
        }
        return contract;
    }

    static Set<String> propsOf(JsonNode component) {
        Set<String> props = new LinkedHashSet<>();
        component.path("props").fieldNames().forEachRemaining(props::add);
        return props;
    }

    static Map<String, String> drawnTexts(JsonNode sketch, Map<String, String> out) {
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

    public Entry byFigmaName(String name) {
        return byName.get(name);
    }

    public Collection<Entry> entries() {
        return byName.values();
    }

    public int version() {
        return version;
    }
}
