package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.in.ui.pages.${aggregate.name?lower_case};

<#list aggregate.rowActionUseCases![] as action>
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${action.slug}.${action.className}Command;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${action.slug}.${action.className}UseCase;
</#list>
import io.mateu.core.infra.declarative.orchestrators.crud.Crud;
import io.mateu.core.infra.declarative.orchestrators.crud.CrudAdapterHelper;
<#if aggregate.rowActionUseCases?has_content>
import io.mateu.uidl.annotations.Label;
import io.mateu.uidl.annotations.ListToolbarButton;
</#if>
import io.mateu.uidl.annotations.Title;
import io.mateu.uidl.data.NoFilters;
import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.SearchRequest;
import io.mateu.uidl.interfaces.HttpRequest;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.dto.${aggregate.name}Row;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Scope("prototype")
@Title("${aggregate.title!(aggregate.name + 's')}")
public class ${aggregate.name}CrudOrchestrator extends Crud<
${aggregate.name}ViewModel,
${aggregate.name}ViewModel,
${aggregate.name}ViewModel,
NoFilters,
${aggregate.name}Row,
String
> {

final ${aggregate.name}CrudAdapter adapter;
<#list aggregate.rowActionUseCases![] as action>
final ${action.className}UseCase ${action.fieldName}UseCase;
</#list>
<#list aggregate.rowActionUseCases![] as action>

/** Row action from the model (rowActionForAggregateId): runs ${action.className} on each selected row. */
@ListToolbarButton
@Label("${action.title}")
public io.mateu.uidl.data.Message ${action.fieldName}(java.util.List<${aggregate.name}Row> selection,
        HttpRequest httpRequest) {
    for (var row : selection) {
        ${action.fieldName}UseCase.handle(new ${action.className}Command(Long.valueOf(row.id())));
    }
    return new io.mateu.uidl.data.Message("${action.title}: " + selection.size());
}
</#list>

@Override
public ListingData<${aggregate.name}Row> search(SearchRequest request, HttpRequest httpRequest) {
return adapter.search(request.searchText(), filters(request), request.pageable(), httpRequest);
}

@Override
public String getIdFieldForRow() {
return "id";
}

@Override
public ${aggregate.name}ViewModel view(String id, HttpRequest httpRequest) {
return adapter.getView(id, httpRequest);
}

@Override
public ${aggregate.name}ViewModel edit(String id, HttpRequest httpRequest) {
return adapter.getEditor(id, httpRequest);
}

@Override
public ${aggregate.name}ViewModel creationForm(HttpRequest httpRequest) {
return adapter.getCreationForm(httpRequest);
}

@Override
public void deleteAllById(java.util.List<String> selectedIds, HttpRequest httpRequest) {
adapter.deleteAllById(selectedIds, httpRequest);
}

@Override
public String create(HttpRequest httpRequest) {
return CrudAdapterHelper.toView(httpRequest, ${aggregate.name}ViewModel.class).create(httpRequest);
}

@Override
public String save(HttpRequest httpRequest) {
var form = CrudAdapterHelper.toView(httpRequest, ${aggregate.name}ViewModel.class);
form.save(httpRequest);
return form.id();
}
}
