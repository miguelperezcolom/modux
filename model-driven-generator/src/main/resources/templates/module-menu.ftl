package ${project.packageName}.${module.slug}.infra.in.ui.menu;

import io.mateu.uidl.annotations.Label;
import io.mateu.uidl.annotations.Menu;
import io.mateu.uidl.annotations.Title;
<#list uiUseCases![] as uc>
import ${project.packageName}.${module.slug}.infra.in.ui.pages.${uc.slug}.${uc.className};
</#list>
<#list module.aggregates?filter(a -> crudAggregateNames?seq_contains(a.name)) as aggregate>
import ${project.packageName}.${module.slug}.infra.in.ui.pages.${aggregate.name?lower_case}.${aggregate.name}CrudOrchestrator;
</#list>

@Title("${module.name}")
public class ${moduleMenuClassName} {

<#list uiUseCases![] as uc>
    @Menu
    @Label("${uc.title}")
    ${uc.className} ${uc.fieldName};
</#list>
<#list module.aggregates?filter(a -> crudAggregateNames?seq_contains(a.name)) as aggregate>
    @Menu
    @Label("${aggregate.title!(aggregate.name + 's')}")
    ${aggregate.name}CrudOrchestrator ${aggregate.name?lower_case}s;
</#list>

}
