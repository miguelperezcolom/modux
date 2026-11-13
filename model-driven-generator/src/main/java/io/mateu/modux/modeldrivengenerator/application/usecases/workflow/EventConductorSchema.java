package io.mateu.modux.modeldrivengenerator.application.usecases.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * What EventConductor says a workflow definition is.
 *
 * <p>modux GENERATES EventConductor workflow definitions, so EventConductor's schema is not a
 * reference — it is the definition of the thing being produced, and modux follows it. This class
 * is the one place that reads it, so nothing else has to keep a copy of the vocabulary in a Java
 * enum, a template and a test, each free to drift from the other two. (They had: the step types
 * hard-coded in the generation test were five short of the schema's.)
 *
 * <p>See {@code src/main/resources/eventconductor/README.md} for why the schema is vendored and
 * how drift against the real EventConductor is detected.
 */
public final class EventConductorSchema {

    private static final String WORKFLOW_SCHEMA = "/eventconductor/workflow-definition-schema.json";
    private static final String FORM_SCHEMA = "/eventconductor/form-schema.json";

    private EventConductorSchema() {}

    /** Every step type EventConductor's engine understands, in the schema's own order. */
    public static Set<String> stepTypes() {
        return enumOf(node(WORKFLOW_SCHEMA), "$defs", "Step", "properties", "type");
    }

    /** Every field a step may carry — what a generated step is allowed to say. */
    public static Set<String> stepFields() {
        var properties = at(node(WORKFLOW_SCHEMA), "$defs", "Step", "properties");
        var names = new LinkedHashSet<String>();
        properties.fieldNames().forEachRemaining(names::add);
        return names;
    }

    /** The fields a step MUST carry. */
    public static List<String> requiredStepFields() {
        return texts(at(node(WORKFLOW_SCHEMA), "$defs", "Step", "required"));
    }

    /** Every data type a form field admits — the schema calls it {@code dataType}, not `type`. */
    public static Set<String> formDataTypes() {
        return enumOf(node(FORM_SCHEMA), "$defs", "Field", "properties", "dataType");
    }

    /** Every stereotype a form field admits — how it is rendered, given its data type. */
    public static Set<String> formStereotypes() {
        return enumOf(node(FORM_SCHEMA), "$defs", "Field", "properties", "stereotype");
    }

    /** The raw schema text, for a validator or for comparing against the published one. */
    public static String workflowSchemaJson() {
        return read(WORKFLOW_SCHEMA);
    }

    public static String formSchemaJson() {
        return read(FORM_SCHEMA);
    }

    private static Set<String> enumOf(JsonNode root, String... path) {
        var node = at(root, path);
        if (node == null) return Set.of();
        var values = node.get("enum");
        // a nullable enum is written as {"type": [...], "enum": [...]} or wrapped in anyOf
        if (values == null && node.has("anyOf")) {
            for (var option : node.get("anyOf")) {
                if (option.has("enum")) values = option.get("enum");
            }
        }
        return values == null ? Set.of() : new LinkedHashSet<>(texts(values));
    }

    private static List<String> texts(JsonNode array) {
        var out = new ArrayList<String>();
        if (array != null) array.forEach(item -> out.add(item.asText()));
        return out;
    }

    private static JsonNode at(JsonNode root, String... path) {
        var node = root;
        for (var step : path) {
            if (node == null) return null;
            node = node.get(step);
        }
        return node;
    }

    private static JsonNode node(String resource) {
        try {
            return new ObjectMapper().readTree(read(resource));
        } catch (IOException e) {
            throw new UncheckedIOException("could not read " + resource, e);
        }
    }

    private static String read(String resource) {
        try (var stream = EventConductorSchema.class.getResourceAsStream(resource)) {
            if (stream == null) {
                throw new IllegalStateException("missing EventConductor schema: " + resource);
            }
            return new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("could not read " + resource, e);
        }
    }
}
