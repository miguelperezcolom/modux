package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.dto;

<#assign visibleFields = aggregate.fields?filter(f -> (f.searchable || f.visible) && f.name != "id")>
<#assign hasAnnotations = visibleFields?filter(f -> (f.label?? && f.label?has_content) || f.priority??)?has_content>
<#if hasAnnotations>
import io.mateu.uidl.annotations.Label;
import io.mateu.uidl.annotations.Priority;

</#if>
public record ${aggregate.name}Row(
        String id<#if visibleFields?has_content>,</#if>
<#list visibleFields as field>
        <#if (field.primitiveType!"") == "json">@io.mateu.uidl.annotations.HiddenInList </#if><#if field.label?? && field.label?has_content>@Label("${field.label}") </#if><#if field.priority??>@Priority(value = ${field.priority}<#if field.identifier!false>, identifier = true</#if>) </#if>String ${field.name}<#if field.type == "Entity">Id</#if><#sep>,</#sep>
</#list>
) {
}
