<#if rowPackage??>
package ${rowPackage};
<#else>
<#assign ucSlug = usecase.name?lower_case?replace("[^a-z0-9]","",'r')>
package ${project.packageName}.${module.slug}.infra.in.ui.pages.${ucSlug};
</#if>

import io.mateu.uidl.annotations.Label;
import lombok.Data;
<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false>
<#list gridModel.fields![] as field>
<#if field.basicType?? && field.basicType>
<#if field.type == "date"><#assign hasDate = true></#if>
<#if field.type == "time"><#assign hasTime = true></#if>
<#if field.type == "dateTime"><#assign hasDateTime = true></#if>
<#if field.type == "number" || field.type == "money"><#assign hasBigDecimal = true></#if>
</#if>
</#list>
<#if hasDate>

import java.time.LocalDate;
</#if>
<#if hasTime>
import java.time.LocalTime;
</#if>
<#if hasDateTime>
import java.time.LocalDateTime;
</#if>
<#if hasBigDecimal>
import java.math.BigDecimal;
</#if>

/** Editable row of the "${gridModel.name}" inline collection (see ${rowOwner!(usecase.className + "Page")}). */
@Data
// a row read from JSON a hook wrote may carry more than the model: only the model's fields show
@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
public class ${gridClassName} {

<#list gridModel.fields![] as field>
<#assign lbl = (field.label?? && field.label?has_content)?then('@Label("' + field.label + '") ', '')>
<#if field.basicType?? && field.basicType>
    <#if field.type == "integer">
    ${lbl}Integer ${field.name};
    <#elseif field.type == "number" || field.type == "money">
    ${lbl}BigDecimal ${field.name};
    <#elseif field.type == "bool">
    ${lbl}Boolean ${field.name};
    <#elseif field.type == "date">
    ${lbl}LocalDate ${field.name};
    <#elseif field.type == "time">
    ${lbl}LocalTime ${field.name};
    <#elseif field.type == "dateTime">
    ${lbl}LocalDateTime ${field.name};
    <#else>
    ${lbl}String ${field.name} = "";
    </#if>
<#else>
    ${lbl}String ${field.name} = "";
</#if>
</#list>
}
