package ${project.packageName}.${module.slug}.infra.in.ui.pages.${className?lower_case};

import ${project.packageName}.${module.slug}.application.query.${className}ReadModelQueryService;
import ${project.packageName}.${module.slug}.application.query.readmodel.${className}ReadModel;
import io.mateu.core.infra.declarative.orchestrators.crud.Crud;
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.NoFilters;
import io.mateu.uidl.data.SearchRequest;
import io.mateu.uidl.interfaces.HttpRequest;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;

/** Read-only listing of the ${className} read model. */
@Service
@Scope("prototype")
@RequiredArgsConstructor
@Title("${title}")
public class ${className}Listing extends Crud<
        ${className}ReadModel, ${className}ReadModel, ${className}ReadModel, NoFilters, ${className}Listing.Row, String> {

<#if rowFields?has_content>
    /** What a row shows: the model's labels, and amounts with their two decimals. */
    public record Row(
<#list rowFields as f>
            @io.mateu.uidl.annotations.Label("${f.label?j_string}") String ${f.name}<#sep>,</#sep>
</#list>
    ) {
        static Row of(${className}ReadModel rm) {
            return new Row(
<#list rowFields as f>
<#if f.money>
                    rm.${f.accessor}() == null ? null : rm.${f.accessor}().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString()<#sep>,</#sep>
<#else>
                    rm.${f.accessor}() == null ? null : String.valueOf(rm.${f.accessor}())<#sep>,</#sep>
</#if>
</#list>
            );
        }
    }
<#else>
    public record Row(String value) {
        static Row of(${className}ReadModel rm) {
            return new Row(String.valueOf(rm));
        }
    }
</#if>

    final ${className}ReadModelQueryService queries;

    @Override
    public ListingData<Row> search(SearchRequest request, HttpRequest httpRequest) {
        var text = request.searchText().toLowerCase();
        return ListingData.of(queries.findAll().stream()
                .map(Row::of)
                .filter(row -> row.toString().toLowerCase().contains(text))
                .toList());
    }

    @Override public boolean readOnly() { return true; }
    @Override public boolean canView() { return false; }
    @Override public boolean canEdit() { return false; }
    @Override public boolean canCreate() { return false; }
    @Override public boolean canDelete() { return false; }
    @Override public boolean selectionEnabled() { return false; }

    @Override public ${className}ReadModel view(String id, HttpRequest httpRequest) { throw readOnlyListing(); }
    @Override public ${className}ReadModel edit(String id, HttpRequest httpRequest) { throw readOnlyListing(); }
    @Override public ${className}ReadModel creationForm(HttpRequest httpRequest) { throw readOnlyListing(); }
    @Override public String create(HttpRequest httpRequest) { throw readOnlyListing(); }
    @Override public String save(HttpRequest httpRequest) { throw readOnlyListing(); }
    @Override public void deleteAllById(List<String> selectedIds, HttpRequest httpRequest) { throw readOnlyListing(); }

    private static UnsupportedOperationException readOnlyListing() {
        return new UnsupportedOperationException("${className} is a read-only listing");
    }
}
