package ${project.packageName}.${module.slug}.application.usecases.${usecase.name?lower_case?replace("[^a-z0-9]","",'r')};

/**
 * What the last custom step of ${usecase.name} hands over: <#if outputModel??>the result the caller gets, and </#if>what
 * the events it publishes need besides<#if outputModel??> — never sent back to the caller</#if>
 * (<#list usecase.outcome.fields as f>${f.name}<#sep>, </#sep></#list>).
 */
public record ${usecase.outcome.className}(
<#if outputModel??>
        ${usecase.className}Result result,
</#if>
<#list usecase.outcome.fields as f>
        ${f.javaType} ${f.name}<#sep>,</#sep>
</#list>
) {}
