package io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi;

import io.mateu.modux.modeldrivengenerator.domain.aggregates.gateway.vo.GatewayAuthType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayOperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayParameterEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.security.SecurityScheme;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pure mapping from a parsed OpenAPI document to the Modux entities a gateway needs: typed models
 * (from {@code components.schemas}), gateway operations wired to their request/response models, and
 * the authentication type inferred from the security schemes. No persistence — the use case saves
 * the result.
 */
public final class OpenApiGatewayMapper {

    public record AuthInfo(GatewayAuthType type, String apiKeyHeaderName, String oauthTokenUrl, String oauthScopes) {}

    public record Result(List<ModelEntity> models, List<GatewayOperationEntity> operations, AuthInfo auth) {}

    private OpenApiGatewayMapper() {}

    public static Result map(OpenAPI openApi) {
        var models = buildModels(openApi);
        Map<String, String> nameToModelId = new LinkedHashMap<>();
        for (var m : models) {
            nameToModelId.put(m.name(), m.id());
        }
        var operations = buildOperations(openApi.getPaths(), nameToModelId);
        return new Result(models, operations, inferAuth(openApi));
    }

    // ─── Models from components.schemas ─────────────────────────────────────────

    private static List<ModelEntity> buildModels(OpenAPI openApi) {
        if (openApi.getComponents() == null || openApi.getComponents().getSchemas() == null) {
            return List.of();
        }
        var schemas = openApi.getComponents().getSchemas();
        // pre-compute deterministic ids so $ref fields can point at the right model
        Map<String, String> nameToId = new LinkedHashMap<>();
        schemas.keySet().forEach(name -> nameToId.put(name, modelId(name)));

        List<ModelEntity> models = new ArrayList<>();
        for (var entry : schemas.entrySet()) {
            var name = entry.getKey();
            Schema<?> schema = entry.getValue();
            List<ModelFieldEntity> fields = new ArrayList<>();
            var properties = schema.getProperties();
            if (properties != null) {
                for (var prop : properties.entrySet()) {
                    fields.add(field(name, prop.getKey(), prop.getValue(), nameToId));
                }
            }
            models.add(new ModelEntity(nameToId.get(name), name, fields, List.of(), null));
        }
        return models;
    }

    private static ModelFieldEntity field(String modelName, String fieldName, Schema<?> schema,
                                          Map<String, String> nameToId) {
        var refName = refName(schema.get$ref());
        if (refName != null && nameToId.containsKey(refName)) {
            // reference to another model
            return new ModelFieldEntity(modelName + "-" + fieldName, fieldName, false,
                    FieldDataType.string, nameToId.get(refName), false, null, List.of());
        }
        return new ModelFieldEntity(modelName + "-" + fieldName, fieldName, true,
                dataType(schema), null, false, null, List.of());
    }

    private static FieldDataType dataType(Schema<?> schema) {
        var type = schema.getType();
        var format = schema.getFormat();
        if (type == null) {
            return FieldDataType.string;
        }
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

    // ─── Operations wired to their request/response models ──────────────────────

    private static List<GatewayOperationEntity> buildOperations(io.swagger.v3.oas.models.Paths paths,
                                                                Map<String, String> nameToModelId) {
        if (paths == null) {
            return List.of();
        }
        List<GatewayOperationEntity> ops = new ArrayList<>();
        for (var pathEntry : paths.entrySet()) {
            var path = pathEntry.getKey();
            PathItem item = pathEntry.getValue();
            addOp(ops, "GET", path, item.getGet(), nameToModelId);
            addOp(ops, "POST", path, item.getPost(), nameToModelId);
            addOp(ops, "PUT", path, item.getPut(), nameToModelId);
            addOp(ops, "PATCH", path, item.getPatch(), nameToModelId);
            addOp(ops, "DELETE", path, item.getDelete(), nameToModelId);
            addOp(ops, "HEAD", path, item.getHead(), nameToModelId);
            addOp(ops, "OPTIONS", path, item.getOptions(), nameToModelId);
            addOp(ops, "TRACE", path, item.getTrace(), nameToModelId);
        }
        return ops;
    }

    private static void addOp(List<GatewayOperationEntity> ops, String method, String path,
                              Operation operation, Map<String, String> nameToModelId) {
        if (operation == null) {
            return;
        }
        var name = (operation.getOperationId() != null && !operation.getOperationId().isBlank())
                ? operation.getOperationId() : method + " " + path;
        var inputModelId = requestModelId(operation, nameToModelId);
        var outputModelId = responseModelId(operation, nameToModelId);
        ops.add(new GatewayOperationEntity(
                UUID.randomUUID().toString(), name, method, path,
                inputModelId, outputModelId, null, null, null, false, null, null,
                buildParameters(operation)));
    }

    private static List<GatewayParameterEntity> buildParameters(Operation operation) {
        if (operation.getParameters() == null) {
            return List.of();
        }
        List<GatewayParameterEntity> params = new ArrayList<>();
        for (var p : operation.getParameters()) {
            var in = p.getIn();
            if (!"path".equals(in) && !"query".equals(in) && !"header".equals(in) && !"cookie".equals(in)) {
                continue;
            }
            var type = p.getSchema() != null ? dataType(p.getSchema()).name() : "string";
            params.add(new GatewayParameterEntity(
                    p.getName(), in, type, Boolean.TRUE.equals(p.getRequired())));
        }
        return params;
    }

    private static String requestModelId(Operation operation, Map<String, String> nameToModelId) {
        if (operation.getRequestBody() == null || operation.getRequestBody().getContent() == null) {
            return null;
        }
        return schemaModelId(jsonSchema(operation.getRequestBody().getContent()), nameToModelId);
    }

    private static String responseModelId(Operation operation, Map<String, String> nameToModelId) {
        if (operation.getResponses() == null) {
            return null;
        }
        // `default` is the answer for every code not declared — usually the error. It is the output
        // only when the operation declares no success code at all (a 201 without a body is not a
        // reason to type the operation with its error schema).
        boolean declaresSuccess = operation.getResponses().keySet().stream().anyMatch(c -> c.startsWith("2"));
        var codes = declaresSuccess ? List.of("200", "201", "202") : List.of("default");
        for (var code : codes) {
            var response = operation.getResponses().get(code);
            if (response != null && response.getContent() != null) {
                var id = schemaModelId(jsonSchema(response.getContent()), nameToModelId);
                if (id != null) {
                    return id;
                }
            }
        }
        return null;
    }

    private static Schema<?> jsonSchema(io.swagger.v3.oas.models.media.Content content) {
        if (content == null) {
            return null;
        }
        var media = content.get("application/json");
        if (media == null && !content.isEmpty()) {
            media = content.values().iterator().next();
        }
        return media != null ? media.getSchema() : null;
    }

    /** Resolves a schema (direct $ref or array-of-$ref) to the id of the model it represents. */
    private static String schemaModelId(Schema<?> schema, Map<String, String> nameToModelId) {
        if (schema == null) {
            return null;
        }
        var ref = refName(schema.get$ref());
        if (ref != null) {
            return nameToModelId.get(ref);
        }
        if ("array".equals(schema.getType()) && schema.getItems() != null) {
            var itemRef = refName(schema.getItems().get$ref());
            if (itemRef != null) {
                return nameToModelId.get(itemRef);
            }
        }
        return null;
    }

    // ─── Auth from security schemes ─────────────────────────────────────────────

    private static AuthInfo inferAuth(OpenAPI openApi) {
        if (openApi.getComponents() == null || openApi.getComponents().getSecuritySchemes() == null
                || openApi.getComponents().getSecuritySchemes().isEmpty()) {
            return new AuthInfo(GatewayAuthType.None, null, null, null);
        }
        SecurityScheme scheme = openApi.getComponents().getSecuritySchemes().values().iterator().next();
        if (scheme.getType() == null) {
            return new AuthInfo(GatewayAuthType.None, null, null, null);
        }
        return switch (scheme.getType()) {
            case APIKEY -> new AuthInfo(GatewayAuthType.ApiKey, scheme.getName(), null, null);
            case HTTP -> "basic".equalsIgnoreCase(scheme.getScheme())
                    ? new AuthInfo(GatewayAuthType.Basic, null, null, null)
                    : new AuthInfo(GatewayAuthType.BearerToken, null, null, null);
            case OAUTH2 -> {
                String tokenUrl = null;
                String scopes = null;
                if (scheme.getFlows() != null && scheme.getFlows().getClientCredentials() != null) {
                    var flow = scheme.getFlows().getClientCredentials();
                    tokenUrl = flow.getTokenUrl();
                    if (flow.getScopes() != null) {
                        scopes = String.join(",", flow.getScopes().keySet());
                    }
                }
                yield new AuthInfo(GatewayAuthType.OAuth2ClientCredentials, null, tokenUrl, scopes);
            }
            default -> new AuthInfo(GatewayAuthType.None, null, null, null);
        };
    }

    // ─── helpers ────────────────────────────────────────────────────────────────

    static String modelId(String schemaName) {
        return "model-oapi-" + kebab(schemaName);
    }

    /** Turns an OpenAPI title into a valid PascalCase identifier for the gateway name/class. */
    public static String pascalCase(String s) {
        if (s == null || s.isBlank()) {
            return s;
        }
        var sb = new StringBuilder();
        boolean up = true;
        for (char c : s.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                sb.append(up ? Character.toUpperCase(c) : c);
                up = false;
            } else {
                up = true;
            }
        }
        return sb.isEmpty() ? s : sb.toString();
    }

    private static String refName(String ref) {
        if (ref == null || ref.isBlank()) {
            return null;
        }
        return ref.substring(ref.lastIndexOf('/') + 1);
    }

    static String kebab(String s) {
        if (s == null || s.isBlank()) {
            return s;
        }
        var sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isUpperCase(c)) {
                if (i > 0) {
                    sb.append('-');
                }
                sb.append(Character.toLowerCase(c));
            } else if (Character.isLetterOrDigit(c)) {
                sb.append(c);
            } else {
                sb.append('-');
            }
        }
        return sb.toString();
    }
}
