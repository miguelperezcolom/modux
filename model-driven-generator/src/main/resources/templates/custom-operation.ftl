<#assign operationName = operation.name>
<#function jtype f>
<#if f.basicType?? && f.basicType>
<#if f.type == "integer"><#return "Integer">
<#elseif f.type == "number" || f.type == "money"><#return "java.math.BigDecimal">
<#elseif f.type == "bool"><#return "Boolean">
<#elseif f.type == "date"><#return "java.time.LocalDate">
<#elseif f.type == "time"><#return "java.time.LocalTime">
<#elseif f.type == "dateTime"><#return "java.time.LocalDateTime">
<#else><#return "String"></#if>
</#if>
<#return "String">
</#function>
package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case};

<#if operation.intent?? && operation.intent?has_content>
/** ${operation.intent} */
</#if>
@FunctionalInterface
public interface ${operationName?cap_first}${aggregate.name}Operation {

<#if operationInput?? && operationInput.fields?has_content>
    /** What the operation needs to do its job (model «${operationInput.name}»). */
    record Input(<#list operationInput.fields as f>${jtype(f)} ${f.name}<#if !(f.basicType?? && f.basicType) && !(f.enumId?has_content) && !(f.type?? && f.type == "array")>Id</#if><#sep>, </#sep></#list>) {}

    /**
     * Changes the aggregate through {@code context}, the only door to its state: the aggregate has
     * no setters, so a rule implemented anywhere else cannot leave it half-changed.
     */
    void execute(${aggregate.name}OperationContext context, Input input);
<#else>
    /**
     * Changes the aggregate through {@code context}, the only door to its state: the aggregate has
     * no setters, so a rule implemented anywhere else cannot leave it half-changed.
     */
    void execute(${aggregate.name}OperationContext context);
</#if>

}
