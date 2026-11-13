<#-- Shared by the Mateu page templates of a use case (pagetemplates/*.ftl). -->
<#-- The Java type of an input field as the use case's command takes it. -->
<#function javaType field>
<#if field.basicType?? && field.basicType>
<#switch field.type!"string">
<#case "integer"><#return "Integer">
<#case "number"><#case "money"><#return "java.math.BigDecimal">
<#case "bool"><#return "Boolean">
<#case "date"><#return "java.time.LocalDate">
<#case "time"><#return "java.time.LocalTime">
<#case "dateTime"><#return "java.time.LocalDateTime">
<#default><#return "String">
</#switch>
</#if>
<#return "String">
</#function>
<#-- The name the command gives an input field (a reference to another element is «…Id»). -->
<#function commandName field>
<#if (field.basicType?? && field.basicType) || (field.enumId?? && field.enumId?has_content) || (field.type!"") == "array"><#return field.name></#if>
<#return field.name + "Id">
</#function>
<#-- The command built from fields that hold the input, prefixed (e.g. «filters.»), or with nothing. -->
<#function commandArgs prefix>
<#if !(inputModel?? && inputModel.fields?has_content)><#return "null"></#if>
<#local out = []>
<#list inputModel.fields as f>
<#if prefix == "-"><#local out = out + ["null"]><#else><#local out = out + [prefix + commandName(f)]></#if>
</#list>
<#return out?join(", ")>
</#function>
<#-- A row value as text (the row classes keep strings as "" and the rest as their type). -->
<#function rowText field><#return "String.valueOf(row.get" + field?cap_first + "() != null ? row.get" + field?cap_first + "() : \"\")"></#function>
