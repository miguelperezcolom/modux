<#-- The command of one of an aggregate's derived CRUD use cases (Crear/Actualizar/Eliminar{Agg}).
     Field types follow create-command.ftl, so the use case can hand them straight to the
     aggregate's built-in CRUD. Update and delete carry the id the REST path names. -->
package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${trio.slug};
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>
<#assign withFields = trio.role != "delete">
<#assign withId = trio.role != "create">

<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false><#if withFields><#list safeFields as field><#if field.type == "Wrapper"><#if field.primitiveType == "date"><#assign hasDate = true></#if><#if field.primitiveType == "time"><#assign hasTime = true></#if><#if field.primitiveType == "datetime"><#assign hasDateTime = true></#if><#if field.primitiveType == "decimal"><#assign hasBigDecimal = true></#if></#if></#list></#if>
<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>
<#macro javaType field><#if field.type == "ValueObject" || field.type == "Entity">String<#elseif field.primitiveType == "integer">Integer<#elseif field.primitiveType == "decimal">BigDecimal<#elseif field.primitiveType == "bool">Boolean<#elseif field.primitiveType == "date">LocalDate<#elseif field.primitiveType == "time">LocalTime<#elseif field.primitiveType == "datetime">LocalDateTime<#else>String</#if></#macro>
<#function argName field><#if field.type == "Entity"><#return field.name + "Id"><#else><#return field.name></#if></#function>
public record ${trio.className}Command(
<#if withId>
    String id<#if withFields && safeFields?has_content>,</#if>
</#if>
<#if withFields>
<#list safeFields as field>
    <@javaType field/> ${argName(field)}<#sep>,</#sep>
</#list>
</#if>
) {
<#if trio.role == "update">

    /** The same change, for the ${aggregate.name} the request path names. */
    public ${trio.className}Command withId(String id) {
        return new ${trio.className}Command(id<#list safeFields as field>, ${argName(field)}</#list>);
    }
</#if>
}
