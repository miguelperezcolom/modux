package io.mateu.modux.modeldrivengenerator.application.usecases.project.importasyncapi;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.OpenApiGatewayMapper;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure mapping from a parsed AsyncAPI document (2.x or 3.x, as a YAML/JSON tree) to what the
 * application does on each channel, plus typed models for the message payloads. No persistence:
 * the use case turns the operations into domain events and subscriptions and saves them.
 *
 * <p>Direction follows the spec, always from the point of view of the application the contract
 * describes:
 * <ul>
 *   <li>AsyncAPI 2.x: {@code subscribe} = messages the application produces (→ a domain event it
 *       publishes); {@code publish} = messages the application consumes (→ a subscription).</li>
 *   <li>AsyncAPI 3.x: {@code action: send} → a domain event; {@code action: receive} → a subscription.</li>
 * </ul>
 */
public final class AsyncApiMapper {

    public enum Direction { SEND, RECEIVE }

    /**
     * One thing the application does on a channel. {@code name} is a valid PascalCase identifier;
     * {@code messageName} the PascalCase name of the message (null when the contract gives none);
     * {@code payloadModelId} the id of the model mapped from its payload (null when not an object).
     */
    public record AsyncOperation(Direction direction, String name, String topic, String messageName,
                                 String payloadModelId, String description, boolean parameterized) {}

    public record Result(List<AsyncOperation> operations, List<ModelEntity> models) {}

    private final Map<String, Object> spec;
    private final Map<String, ModelEntity> models = new LinkedHashMap<>();

    private AsyncApiMapper(Map<String, Object> spec) {
        this.spec = spec;
    }

    public static Result map(Map<String, Object> spec) {
        var mapper = new AsyncApiMapper(spec);
        var version = String.valueOf(spec.getOrDefault("asyncapi", ""));
        var operations = version.startsWith("3") ? mapper.v3() : mapper.v2();
        return new Result(operations, List.copyOf(mapper.models.values()));
    }

    // ─── AsyncAPI 2.x: channels.{name}.publish / subscribe ─────────────────────

    private List<AsyncOperation> v2() {
        List<AsyncOperation> ops = new ArrayList<>();
        if (!(spec.get("channels") instanceof Map<?, ?> channels)) return ops;
        for (var entry : channels.entrySet()) {
            var topic = String.valueOf(entry.getKey());
            if (!(resolve(entry.getValue()) instanceof Map<?, ?> channel)) continue;
            // `subscribe`: what the application sends; `publish`: what it receives
            if (resolve(channel.get("subscribe")) instanceof Map<?, ?> op) {
                ops.add(operation(Direction.SEND, topic, channel, op, firstMessage(op.get("message"))));
            }
            if (resolve(channel.get("publish")) instanceof Map<?, ?> op) {
                ops.add(operation(Direction.RECEIVE, topic, channel, op, firstMessage(op.get("message"))));
            }
        }
        return ops;
    }

    // ─── AsyncAPI 3.x: operations.{id}.action + channel ─────────────────────────

    private List<AsyncOperation> v3() {
        List<AsyncOperation> ops = new ArrayList<>();
        if (!(spec.get("operations") instanceof Map<?, ?> operations)) return ops;
        for (var entry : operations.entrySet()) {
            if (!(resolve(entry.getValue()) instanceof Map<?, ?> op)) continue;
            var action = String.valueOf(op.get("action"));
            Direction direction = switch (action) {
                case "send" -> Direction.SEND;
                case "receive" -> Direction.RECEIVE;
                default -> null;
            };
            if (direction == null) continue;
            var channelRef = op.get("channel");
            if (!(resolve(channelRef) instanceof Map<?, ?> channel)) continue;
            var topic = channel.get("address") instanceof String a && !a.isBlank() ? a : refName(channelRef);
            if (topic == null) continue;
            Object message = op.get("messages") instanceof List<?> l && !l.isEmpty() ? l.get(0) : null;
            if (message == null && channel.get("messages") instanceof Map<?, ?> msgs && !msgs.isEmpty()) {
                message = msgs.values().iterator().next();
            }
            // the operation id is the key; operationId is not a field in 3.x
            var named = new LinkedHashMap<Object, Object>(op);
            named.putIfAbsent("operationId", String.valueOf(entry.getKey()));
            ops.add(operation(direction, topic, channel, named, message));
        }
        return ops;
    }

    // ─── shared ─────────────────────────────────────────────────────────────────

    private AsyncOperation operation(Direction direction, String topic, Map<?, ?> channel, Map<?, ?> op,
                                     Object messageNode) {
        var message = resolve(messageNode) instanceof Map<?, ?> m ? m : Map.of();
        var messageName = text(message.get("name"));
        if (messageName == null) messageName = refName(messageNode);
        var opId = text(op.get("operationId"));
        var name = pascal(opId != null ? opId : messageName != null ? messageName : topic);
        var description = firstText(op.get("summary"), op.get("description"), message.get("summary"),
                message.get("description"), channel.get("description"));
        var payloadModelId = payloadModel(message.get("payload"),
                pascal((messageName != null ? messageName : name)) + "Payload");
        boolean parameterized = topic.contains("{");
        return new AsyncOperation(direction, name, topic, messageName == null ? null : pascal(messageName),
                payloadModelId, description, parameterized);
    }

    private static Object firstMessage(Object message) {
        // a message with oneOf alternatives: the first one types the element
        if (message instanceof Map<?, ?> m && m.get("oneOf") instanceof List<?> l && !l.isEmpty()) return l.get(0);
        return message;
    }

    /**
     * The model a payload schema maps to, registering it (and the object schemas it references).
     * A payload that is not an object (a bare string, an array…) maps to no model.
     */
    private String payloadModel(Object schemaNode, String fallbackName) {
        if (schemaNode == null) return null;
        var refName = refName(schemaNode);
        var name = pascal(refName != null ? refName : fallbackName);
        if (!(resolve(schemaNode) instanceof Map<?, ?> schema) || !(schema.get("properties") instanceof Map<?, ?> props)) {
            return null;
        }
        var id = modelId(name);
        if (models.containsKey(id)) return id;
        models.put(id, new ModelEntity(id, name, List.of(), List.of(), null)); // guards recursion
        List<ModelFieldEntity> fields = new ArrayList<>();
        for (var p : props.entrySet()) {
            var fieldName = String.valueOf(p.getKey());
            var nested = payloadModel(p.getValue(), name + pascal(fieldName));
            if (nested != null) {
                fields.add(new ModelFieldEntity(name + "-" + fieldName, fieldName, false,
                        FieldDataType.string, nested, false, null, List.of()));
            } else {
                var resolved = resolve(p.getValue()) instanceof Map<?, ?> s ? s : Map.of();
                fields.add(new ModelFieldEntity(name + "-" + fieldName, fieldName, true,
                        dataType(resolved), null, false, null, List.of()));
            }
        }
        models.put(id, new ModelEntity(id, name, fields, List.of(), null));
        return id;
    }

    private static FieldDataType dataType(Map<?, ?> schema) {
        var type = text(schema.get("type"));
        var format = text(schema.get("format"));
        if (type == null) return FieldDataType.string;
        return switch (type) {
            case "integer" -> FieldDataType.integer;
            case "number" -> FieldDataType.number;
            case "boolean" -> FieldDataType.bool;
            case "array" -> FieldDataType.array;
            case "string" -> switch (format == null ? "" : format) {
                case "date" -> FieldDataType.date;
                case "date-time" -> FieldDataType.dateTime;
                case "binary", "byte" -> FieldDataType.file;
                default -> FieldDataType.string;
            };
            default -> FieldDataType.string;
        };
    }

    /** Follows local {@code $ref}s ({@code #/components/...}) until a non-reference node. */
    private Object resolve(Object node) {
        for (int hops = 0; hops < 32 && node instanceof Map<?, ?> m && m.get("$ref") instanceof String ref; hops++) {
            if (!ref.startsWith("#/")) return null; // external refs are not followed
            Object current = spec;
            for (var token : ref.substring(2).split("/")) {
                token = token.replace("~1", "/").replace("~0", "~");
                current = current instanceof Map<?, ?> cm ? cm.get(token) : null;
            }
            node = current;
        }
        return node;
    }

    /** The last segment of a node's {@code $ref}, or null when it is not a reference. */
    private static String refName(Object node) {
        if (node instanceof Map<?, ?> m && m.get("$ref") instanceof String ref && !ref.isBlank()) {
            return ref.substring(ref.lastIndexOf('/') + 1).replace("~1", "/").replace("~0", "~");
        }
        return null;
    }

    private static String text(Object o) {
        return o instanceof String s && !s.isBlank() ? s.strip() : null;
    }

    private static String firstText(Object... candidates) {
        for (var c : candidates) {
            var t = text(c);
            if (t != null) return t;
        }
        return null;
    }

    static String pascal(String s) {
        return OpenApiGatewayMapper.pascalCase(s);
    }

    /** {@code LightMeasured} → {@code light-measured}. */
    static String kebab(String s) {
        var sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0 && sb.length() > 0 && sb.charAt(sb.length() - 1) != '-') sb.append('-');
                sb.append(Character.toLowerCase(c));
            } else if (Character.isLetterOrDigit(c)) {
                sb.append(c);
            } else if (sb.length() > 0 && sb.charAt(sb.length() - 1) != '-') {
                sb.append('-');
            }
        }
        return sb.toString();
    }

    static String modelId(String modelName) {
        return "model-aapi-" + kebab(modelName);
    }
}
