package io.mateu.modux.modeldrivengenerator.application.usecases.project.importapi;

import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.ImportOpenApiExternalUseCase;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importopenapi.OpenApiGatewayMapper;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.importwsdl.WsdlParser;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiOperationEntity;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.swagger.parser.OpenAPIParser;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Imports a contract (OpenAPI or WSDL) as a FIRST-CLASS {@link ApiEntity}: the published
 * API lives on the map at the level of the bounded contexts, with its operations waiting
 * to be wired to whoever implements them (a context, a use case, a policy). The rq/rs
 * data models of an OpenAPI contract land as first-class models, referenced from each
 * operation. Deterministic ids — re-importing an evolved contract updates the operations
 * in place and PRESERVES the wiring already drawn (and where the API is nested).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportApiEntityUseCase {

    final ModelStore repository;

    /** Returns the api id, so callers can navigate to it. */
    @SneakyThrows
    public String handle(String filePath) {
        var content = Files.readString(Path.of(filePath));
        var isWsdl = filePath.endsWith(".wsdl") || content.contains("definitions");
        return handle(content, isWsdl, null);
    }

    /**
     * Content-based import (editor uploads): with {@code targetApiId} the contract lands
     * on that existing API node; without it, the node derives from the contract's title.
     */
    public String handle(String content, boolean wsdl, String targetApiId) {
        return wsdl ? importWsdl(content, targetApiId) : importOpenApi(content, targetApiId);
    }

    private String importOpenApi(String content, String targetApiId) {
        var parsed = new OpenAPIParser().readContents(content, null, null);
        var openApi = parsed == null ? null : parsed.getOpenAPI();
        if (openApi == null || openApi.getPaths() == null) {
            throw new IllegalArgumentException(
                    "Could not parse the contract as OpenAPI/Swagger");
        }
        var title = openApi.getInfo() != null && openApi.getInfo().getTitle() != null
                ? openApi.getInfo().getTitle() : "API";
        var mapped = OpenApiGatewayMapper.map(openApi);
        // The rq/rs payloads become first-class data models (same-id re-imports update them).
        mapped.models().forEach(repository::save);
        var operations = mapped.operations().stream()
                .map(op -> new ApiOperationEntity(null, op.name(), op.httpMethod(), op.path(),
                        op.httpMethod() + " " + op.path(), null, null,
                        op.inputModelId(), op.outputModelId()))
                .toList();
        return upsert(targetApiId, title, operations);
    }

    @SneakyThrows
    private String importWsdl(String content, String targetApiId) {
        // WsdlParser reads from disk — materialize the uploaded contract.
        var tmp = Files.createTempFile("modux-import-", ".wsdl");
        try {
            Files.writeString(tmp, content);
            var operations = WsdlParser.parse(tmp);
            if (operations.isEmpty()) {
                throw new IllegalArgumentException("The WSDL declares no operations");
            }
            var title = operations.get(0).portType();
            return upsert(targetApiId, title, operations.stream()
                    .map(op -> new ApiOperationEntity(null, op.name(), null, null,
                            "SOAP " + op.portType() + "." + op.name()
                                    + (op.documentation() == null || op.documentation().isBlank()
                                            ? "" : " — " + op.documentation()),
                            null, null))
                    .toList());
        } finally {
            Files.deleteIfExists(tmp);
        }
    }

    /** Same-id operations keep their target wiring; new ones join; the rest survive. */
    private String upsert(String targetApiId, String title, List<ApiOperationEntity> imported) {
        var apiId = targetApiId != null && !targetApiId.isBlank()
                ? targetApiId
                : "api-" + ImportOpenApiExternalUseCase.kebab(title);
        var existing = repository.findById(apiId, ApiEntity.class).orElse(null);
        if (targetApiId != null && !targetApiId.isBlank() && existing == null) {
            throw new IllegalArgumentException("API desconocida: " + targetApiId);
        }
        var merged = new ArrayList<>(existing != null ? existing.operations()
                : List.<ApiOperationEntity>of());
        for (var op : imported) {
            var id = "apiop-" + apiId.replaceFirst("^api-", "") + "-"
                    + ImportOpenApiExternalUseCase.kebab(op.name());
            var previous = merged.stream().filter(o -> o.id().equals(id)).findFirst();
            var next = new ApiOperationEntity(id, op.name(), op.httpMethod(), op.path(),
                    op.description(),
                    previous.map(ApiOperationEntity::targetBoundedContextId).orElse(null),
                    previous.map(ApiOperationEntity::targetUseCaseId).orElse(null),
                    op.requestModelId(), op.responseModelId());
            if (previous.isPresent()) {
                merged.set(merged.indexOf(previous.get()), next);
            } else {
                merged.add(next);
            }
        }
        // Record copy, not positional rebuild: where the API is nested must survive re-imports.
        repository.save(existing != null
                ? existing.withOperations(List.copyOf(merged))
                : new ApiEntity(apiId, title, null, List.copyOf(merged)));
        log.info("Imported API '{}' with {} operations", title, imported.size());
        return apiId;
    }
}
