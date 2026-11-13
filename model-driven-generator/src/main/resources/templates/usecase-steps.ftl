package ${project.packageName}.${module.slug}.application.usecases.${usecase.name?lower_case?replace("[^a-z0-9]","",'r')};
<#assign customSteps = (usecase.steps![])?filter(s -> s.type == "Custom")>

/** Custom steps of the ${usecase.name} use case — a hook implemented in the developer-owned custom module. */
public interface ${usecase.className}Steps {
<#list customSteps as step>
<#assign returnsResult = outputModel?? && step.id == customSteps?last.id>
<#if step.intent?? && step.intent?has_content>
    /** ${step.intent} */
</#if>
    <#if usecase.outcome?? && step.id == customSteps?last.id>${usecase.outcome.className}<#elseif returnsResult>${usecase.className}Result<#else>void</#if> ${step.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}(${usecase.className}Command command<#list (step.remoteParams![])?filter(r -> r.hasResponse) as r>, ${project.packageName}.${module.slug}.application.out.remote.${r.className}Client.Response ${r.var}</#list>);
</#list>
}
