<#assign uiEs = ((project.defaultLocale!"")?has_content?then(project.defaultLocale!"", (project.locales![])?has_content?then((project.locales![""])[0], "")))?lower_case?starts_with("es")>
package ${project.packageName}.${moduleSlug}.infra.in.ui.pages.${slug};

import ${project.packageName}.${moduleSlug}.infra.out.persistence.${aggregateName}EventStore;
import io.mateu.core.infra.declarative.orchestrators.crud.Crud;
import io.mateu.uidl.annotations.Label;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.NoFilters;
import io.mateu.uidl.data.SearchRequest;
import io.mateu.uidl.interfaces.HttpRequest;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;

/**
 * The history of every ${aggregateName}, read from its event store in order: what happened to each
 * one, when. ${aggregateName} is event-sourced, so this is its source of truth, not a log. Search by
 * the ${aggregateName}'s id to follow one of them.
 */
@Service
@Scope("prototype")
@RequiredArgsConstructor
@Title("${title?j_string}")
public class ${className} extends Crud<
        ${className}.Row, ${className}.Row, ${className}.Row, NoFilters, ${className}.Row, String> {

    public record Row(
            @Label("${aggregateName}") String aggregateId,
            @Label("Nº") String sequence,
            @Label("<#if uiEs>Qué pasó<#else>What happened</#if>") String event,
            @Label("<#if uiEs>Cuándo<#else>When</#if>") String occurredAt,
            @Label("<#if uiEs>Quién<#else>Who</#if>") String recordedBy,
            @Label("Estado") String state) {}

    final ${aggregateName}EventStore events;

    @Override
    public ListingData<Row> search(SearchRequest request, HttpRequest httpRequest) {
        var text = request.searchText() == null ? "" : request.searchText().trim();
        return ListingData.of(events.findAll().stream()
                .filter(e -> text.isEmpty() || text.equals(e.getAggregateId()))
                .sorted(Comparator.comparing((${project.packageName}.${moduleSlug}.infra.out.persistence.${aggregateName}EventEntity e) ->
                                parse(e.getAggregateId()))
                        .thenComparing(e -> e.getSequenceNumber()))
                .map(e -> new Row(e.getAggregateId(), String.valueOf(e.getSequenceNumber()), e.getEventType(),
                        e.getOccurredAt() == null ? null : e.getOccurredAt().withNano(0).toString().replace('T', ' '),
                        e.getRecordedBy(),
                        summary(e.getPayload())))
                .toList());
    }

    static final com.fasterxml.jackson.databind.ObjectMapper JSON = new com.fasterxml.jackson.databind.ObjectMapper();

    /** The recorded state, readable: «estado: CONFIRMADA · importe: 120.00 · …» (the id is the first column). */
    static String summary(String payload) {
        if (payload == null) return null;
        try {
            var parts = new java.util.ArrayList<String>();
            JSON.readTree(payload).properties().forEach(f -> {
                if (!"id".equals(f.getKey()) && !f.getValue().isNull()) {
                    var v = f.getValue();
                    parts.add(f.getKey() + ": " + (v.isNumber() && !v.isIntegralNumber()
                            ? v.decimalValue().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString() : v.asText()));
                }
            });
            return String.join(" · ", parts);
        } catch (Exception e) {
            return payload;
        }
    }

    private static long parse(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            return Long.MAX_VALUE;
        }
    }

    @Override public boolean readOnly() { return true; }
    @Override public boolean canView() { return false; }
    @Override public boolean canEdit() { return false; }
    @Override public boolean canCreate() { return false; }
    @Override public boolean canDelete() { return false; }
    @Override public boolean selectionEnabled() { return false; }
    @Override public Row view(String id, HttpRequest httpRequest) { throw readOnly${className}(); }
    @Override public Row edit(String id, HttpRequest httpRequest) { throw readOnly${className}(); }
    @Override public Row creationForm(HttpRequest httpRequest) { throw readOnly${className}(); }
    @Override public String create(HttpRequest httpRequest) { throw readOnly${className}(); }
    @Override public String save(HttpRequest httpRequest) { throw readOnly${className}(); }
    @Override public void deleteAllById(List<String> selectedIds, HttpRequest httpRequest) { throw readOnly${className}(); }

    private static UnsupportedOperationException readOnly${className}() {
        return new UnsupportedOperationException("<#if uiEs>El historial no se modifica: es lo que pasó<#else>The history cannot be changed: it is what happened</#if>");
    }
}
