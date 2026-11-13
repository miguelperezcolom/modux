<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false>
<#if payloadModel?? && payloadModel.fields?has_content>
<#list payloadModel.fields as field>
<#if field.basicType!false>
<#assign ft = field.type!"string">
<#if ft == "date"><#assign hasDate = true></#if>
<#if ft == "time"><#assign hasTime = true></#if>
<#if ft == "dateTime"><#assign hasDateTime = true></#if>
<#if ft == "number" || ft == "money"><#assign hasBigDecimal = true></#if>
</#if>
</#list>
</#if>
<#macro javaType field><#local ft = field.type!"string"><#if field.basicType!false><#if ft == "integer">Integer<#elseif ft == "number" || ft == "money">BigDecimal<#elseif ft == "bool">Boolean<#elseif ft == "date">LocalDate<#elseif ft == "time">LocalTime<#elseif ft == "dateTime">LocalDateTime<#else>String</#if><#else>String</#if></#macro>
<#function fieldName field><#if (field.basicType!false) || (field.enumId?? && field.enumId?has_content) || (field.type!"") == "array"><#return field.name><#else><#return field.name + "Id"></#if></#function>
package ${project.packageName}.${module.slug}.application.out.integration;

<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>
// topic: ${integrationEvent.topicName!""}
public record ${className}(
        int schemaVersion<#if payloadModel?? && payloadModel.fields?has_content>,
<#list payloadModel.fields as field>
        <@javaType field/> ${fieldName(field)}<#sep>,</#sep>
</#list>
</#if>
) {

    /** The schema version this service currently emits for ${className}. */
    public static final int CURRENT_SCHEMA_VERSION = ${schemaVersion};

    /** Convenience constructor that stamps the current schema version. */
    public ${className}(<#if payloadModel?? && payloadModel.fields?has_content><#list payloadModel.fields as field><@javaType field/> ${fieldName(field)}<#sep>, </#sep></#list></#if>) {
        this(CURRENT_SCHEMA_VERSION<#if payloadModel?? && payloadModel.fields?has_content>, <#list payloadModel.fields as field>${fieldName(field)}<#sep>, </#sep></#list></#if>);
    }
}
