<#assign pageSlug = pageSlug!(page.name?lower_case?replace("[^a-z0-9]","",'r'))>
<#assign aggregateSlug = aggregate.name?lower_case>
<#assign moduleSlugVal = module.name?lower_case?replace("[^a-z0-9]","",'r')>
package ${project.packageName}.${moduleSlugVal}.infra.in.ui.pages.${pageSlug};

import io.mateu.core.infra.declarative.orchestrators.crud.Crud;
import io.mateu.core.infra.declarative.orchestrators.crud.CrudAdapterHelper;
<#if ui??>
import io.mateu.uidl.annotations.UI;
</#if>
import io.mateu.uidl.annotations.Title;
<#if page.favicon?has_content>
import io.mateu.uidl.annotations.FavIcon;
</#if>
<#if page.style?has_content>
import io.mateu.uidl.StyleConstants;
import io.mateu.uidl.annotations.Style;
</#if>
import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.NoFilters;
import io.mateu.uidl.data.Pageable;
import io.mateu.uidl.data.SearchRequest;
import io.mateu.uidl.interfaces.HttpRequest;
import ${project.packageName}.${moduleSlugVal}.application.query.${aggregate.name}QueryService;
import ${project.packageName}.${moduleSlugVal}.application.query.dto.${aggregate.name}Row;
import ${project.packageName}.${moduleSlugVal}.application.usecases.${aggregateSlug}.delete.Delete${aggregate.name}Command;
import ${project.packageName}.${moduleSlugVal}.application.usecases.${aggregateSlug}.delete.Delete${aggregate.name}UseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * CRUD page: ${page.name}
 * Route: ${page.route!''}
 * Generated from PageEntity id=${page.id}
 */
@Service
@Scope("prototype")
@RequiredArgsConstructor
<#if ui??>
<#assign uiPath = (ui.path?has_content)?then(ui.path, '')>
@UI(<#if ui.indexHtmlPath?has_content || ui.frontendComponentPath?has_content>value = "${uiPath}"<#if ui.indexHtmlPath?has_content>, indexHtmlPath = "${ui.indexHtmlPath}"</#if><#if ui.frontendComponentPath?has_content>, frontendComponentPath = "${ui.frontendComponentPath}"</#if><#else>"${uiPath}"</#if>)
</#if>
@Title("${page.title!page.name}")
<#if page.favicon?has_content>
@FavIcon("${page.favicon}")
</#if>
<#if page.style?has_content>
@Style(StyleConstants.${page.style})
</#if>
public class ${pageClassName!(page.name?cap_first?replace("[^a-zA-Z0-9]","",'r') + "Page")} extends Crud<
        ${aggregate.name}ViewModel,
        ${aggregate.name}ViewModel,
        ${aggregate.name}ViewModel,
        NoFilters,
        ${aggregate.name}Row,
        String> {

    final ${aggregate.name}CrudPageAdapter adapter;

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

    @Service
    @Scope("prototype")
    @RequiredArgsConstructor
    public static class ${aggregate.name}CrudPageAdapter {

        final ${aggregate.name}ViewModel viewModel;
        final Delete${aggregate.name}UseCase delete${aggregate.name}UseCase;
<#if aggregate.customDelete??>
        final ${project.packageName}.${moduleSlugVal}.application.usecases.${aggregate.customDelete.slug}.${aggregate.customDelete.className}UseCase customDeleteUseCase;
</#if>
        final ${aggregate.name}QueryService queryService;

        public ListingData<${aggregate.name}Row> search(String searchText, NoFilters filters, Pageable pageable, HttpRequest httpRequest) {
            return queryService.findAll(searchText, filters, pageable);
        }

        public void deleteAllById(List<String> selectedIds, HttpRequest httpRequest) {
<#if aggregate.customDelete??>
            // the model adds rules to this delete: the screen has to go through them
            for (var id : selectedIds) {
                customDeleteUseCase.handle(new ${project.packageName}.${moduleSlugVal}.application.usecases.${aggregate.customDelete.slug}.${aggregate.customDelete.className}Command(Long.valueOf(id)));
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

}
