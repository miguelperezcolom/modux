<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false>
<#if model?? && model.fields?has_content>
<#list model.fields as field>
<#if field.basicType>
<#if field.type == "date"><#assign hasDate = true></#if>
<#if field.type == "time"><#assign hasTime = true></#if>
<#if field.type == "dateTime"><#assign hasDateTime = true></#if>
<#if field.type == "number" || field.type == "money"><#assign hasBigDecimal = true></#if>
</#if>
</#list>
</#if>
package ${project.packageName}.${module.slug}.application.query.readmodel;

<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>
<#assign declaresId = model?? && (model.fields![])?filter(f -> f.name == "id")?has_content>
public record ${className}(<#if !declaresId>
        /** The row's id: what a link to it, or a reference, carries. */
        String id<#if model?? && model.fields?has_content>,</#if>
</#if><#if model?? && model.fields?has_content>
<#list model.fields as field>
<#if field.basicType>
    <#if field.type == "string" || field.type == "json">
        String ${field.name}<#sep>,</#sep>
    <#elseif field.type == "integer">
        Integer ${field.name}<#sep>,</#sep>
    <#elseif field.type == "number" || field.type == "money">
        BigDecimal ${field.name}<#sep>,</#sep>
    <#elseif field.type == "bool">
        Boolean ${field.name}<#sep>,</#sep>
    <#elseif field.type == "date">
        LocalDate ${field.name}<#sep>,</#sep>
    <#elseif field.type == "time">
        LocalTime ${field.name}<#sep>,</#sep>
    <#elseif field.type == "dateTime">
        LocalDateTime ${field.name}<#sep>,</#sep>
    <#else>
        String ${field.name}<#sep>,</#sep>
    </#if>
<#else>
        String ${field.name}Id<#sep>,</#sep>
</#if>
</#list>
</#if>) {}
