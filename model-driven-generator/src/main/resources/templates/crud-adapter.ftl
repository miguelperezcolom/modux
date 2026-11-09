package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.in.ui.pages.${aggregate.name?lower_case};

import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.NoFilters;
import io.mateu.uidl.data.Pageable;
import io.mateu.uidl.interfaces.HttpRequest;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.${aggregate.name}QueryService;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.dto.${aggregate.name}Row;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.delete.Delete${aggregate.name}Command;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.delete.Delete${aggregate.name}UseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Scope("prototype")
@RequiredArgsConstructor
public class ${aggregate.name}CrudAdapter {

    final ${aggregate.name}ViewModel viewModel;
    final Delete${aggregate.name}UseCase delete${aggregate.name}UseCase;
<#if aggregate.customDelete??>
    final ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.customDelete.slug}.${aggregate.customDelete.className}UseCase customDeleteUseCase;
</#if>
    final ${aggregate.name}QueryService queryService;

    public ListingData<${aggregate.name}Row> search(String searchText, NoFilters filters, Pageable pageable, HttpRequest httpRequest) {
        return queryService.findAll(searchText, filters, pageable);
    }

    public void deleteAllById(List<String> selectedIds, HttpRequest httpRequest) {
<#if aggregate.customDelete??>
        // the model adds rules to this delete: the screen has to go through them
        for (var id : selectedIds) {
            customDeleteUseCase.handle(new ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.customDelete.slug}.${aggregate.customDelete.className}Command(Long.valueOf(id)));
        }
<#else>
        delete${aggregate.name}UseCase.handle(new Delete${aggregate.name}Command(selectedIds));
</#if>
    }

    public ${aggregate.name}ViewModel getView(String id, HttpRequest httpRequest) {
        return viewModel.load(queryService.getById(id).orElseThrow());
    }

    public ${aggregate.name}ViewModel getEditor(String id, HttpRequest httpRequest) {
        return viewModel.load(queryService.getById(id).orElseThrow());
    }

    public ${aggregate.name}ViewModel getCreationForm(HttpRequest httpRequest) {
        return viewModel;
    }

}
