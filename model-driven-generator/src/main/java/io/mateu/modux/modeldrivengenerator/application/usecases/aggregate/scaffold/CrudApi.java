package io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiOperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiOperationImplementationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryServiceEntity;

import java.util.List;

/**
 * The integration surface of a CRUD, symmetric to the UI's pages: relating an EXTERNAL SYSTEM or
 * another BOUNDED CONTEXT to an aggregate implies a first-class {@link ApiEntity} that REST-exposes
 * the aggregate's CRUD — its four operations rest on the shared CRUD trio ({@link CrudUseCases}) and
 * on a canonical listing query. Deterministic ids ({@code api-crud-{aggId}}, {@code qs-crud-{aggId}})
 * → idempotent: re-relating derives nothing new, and the same API serves every consumer. The API
 * is the contract; it wires to the use cases/query, it does not duplicate them.
 */
public final class CrudApi {

    private CrudApi() {}

    /** The canonical per-aggregate listing query the CRUD API's GET rests on (shared with the UI). */
    public static QueryServiceEntity listingQuery(AggregateEntity aggregate, String boundedContextId) {
        return CrudListingQuery.forAggregate(aggregate, boundedContextId);
    }

    /** The CRUD API: POST/PUT/DELETE rest on the trio, GET rests on the listing query. */
    public static ApiEntity forAggregate(AggregateEntity aggregate, String boundedContextId) {
        var ids = CrudUseCases.idsOf(aggregate.id());
        var apiId = apiId(aggregate.id());
        var model = aggregate.modelId();
        // the path is public contract: it reads after the aggregate's NAME, not its id (an
        // editor-minted id is a timestamp). Mirrored in editor/src/store/scaffold.ts.
        var base = "/" + pathSegment(aggregate.name(), aggregate.id());
        var qsId = queryServiceId(aggregate.id());
        var create = op(apiId + "-create", "Crear" + cap(aggregate.name()), "POST", base,
                boundedContextId, ids.get(0), model, model, null, null);
        var update = op(apiId + "-update", "Actualizar" + cap(aggregate.name()), "PUT", base + "/{id}",
                boundedContextId, ids.get(1), model, model, null, null);
        var delete = op(apiId + "-delete", "Eliminar" + cap(aggregate.name()), "DELETE", base + "/{id}",
                boundedContextId, ids.get(2), null, null, null, null);
        var list = op(apiId + "-list", "Listar" + cap(aggregate.name()), "GET", base,
                boundedContextId, null, null, model, qsId, CrudListingQuery.listOperationId(aggregate.id()));
        return ApiEntity.builder()
                .id(apiId).name(cap(aggregate.name()) + "API")
                .description("CRUD del agregado " + aggregate.name() + ".")
                .operations(List.of(create, update, delete, list))
                .implementedByBoundedContextIds(List.of(boundedContextId))
                .operationImplementations(List.of(
                        new ApiOperationImplementationEntity(create.id(), boundedContextId, ids.get(0)),
                        new ApiOperationImplementationEntity(update.id(), boundedContextId, ids.get(1)),
                        new ApiOperationImplementationEntity(delete.id(), boundedContextId, ids.get(2))))
                .build();
    }

    public static String apiId(String aggregateId) {
        return "api-crud-" + aggregateId;
    }

    public static String queryServiceId(String aggregateId) {
        return CrudListingQuery.idFor(aggregateId);
    }

    private static ApiOperationEntity op(String id, String name, String method, String path,
                                         String bcId, String useCaseId, String requestModel,
                                         String responseModel, String queryServiceId, String queryOpId) {
        return ApiOperationEntity.builder()
                .id(id).name(name).httpMethod(method).path(path)
                .targetBoundedContextId(bcId).targetUseCaseId(useCaseId)
                .requestModelId(requestModel).responseModelId(responseModel)
                .targetQueryServiceId(queryServiceId).targetQueryOperationId(queryOpId)
                .build();
    }

    private static String cap(String s) {
        return s == null || s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** Lower-case, accent-free, dash-separated; falls back to the id when the name gives nothing. */
    static String pathSegment(String name, String fallback) {
        var slug = name == null ? "" : java.text.Normalizer.normalize(name.toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isEmpty() ? fallback : slug;
    }
}
