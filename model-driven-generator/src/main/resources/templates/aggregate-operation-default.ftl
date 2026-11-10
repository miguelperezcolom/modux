<#assign modpkg = project.packageName + "." + module.name?lower_case?replace("[^a-z0-9]","",'r')>
<#-- Comment-safe: collapse newlines so a free-text expression never breaks the // line. -->
<#function c s=""><#return ((s!"")?replace("\r"," ")?replace("\n"," "))></#function>
<#-- SCAFFOLD path (legacy free-text bodies): render the desugared steps as an indented outline.
     All lines are // comments, so it always compiles; the developer completes it and removes the throw. -->
<#macro outline steps indent>
<#list steps as step>
<#if step.type == "If">
        //${indent} if (${c(step.condition)!"¿condición?"}) {
<#if step.then??><@outline steps=step.then indent=indent + "  "/></#if>
<#if step.elseBranch??>
        //${indent} } else {
<@outline steps=step.elseBranch indent=indent + "  "/>
</#if>
        //${indent} }
<#elseif step.type == "ForEach">
        //${indent} for (${c(step.itemVar)!"item"} : ${c(step.collection)!"¿colección?"}) {
<#if step.body??><@outline steps=step.body indent=indent + "  "/></#if>
        //${indent} }
<#elseif step.type == "CheckPrecondition">
        //${indent} precondition: ${c(step.condition)!c(step.name)}
<#elseif step.type == "SetField">
        //${indent} set ${c(step.fieldName)!c(step.name)} = ${c(step.value)!"…"}
<#elseif step.type == "PublishDomainEvent">
        //${indent} emit ${c(step.name)}
<#elseif step.type == "CallAggregateOperation">
        //${indent} call operation ${c(step.name)}
<#elseif step.type == "CallDomainService">
        //${indent} call domain service ${c(step.name)}
<#elseif step.type == "Custom">
        //${indent} custom: ${c(step.intent)!c(step.name)}
<#else>
        //${indent} ${step.type} ${c(step.name)}
</#if>
</#list>
</#macro>
<#-- EXECUTABLE path (explicit modeled body): real control-flow structure; every leaf is a typed
     two-zone hook the developer implements. Always compiles — the structure is closed, hooks stubbed. -->
<#macro exec steps>
<#list steps as s>
<#if s.render == "precondition">
        if (!${s.name}(${s.call})) throw new IllegalStateException("precondition '${s.name}' not met");
<#elseif s.render == "if">
        if (${s.name}(${s.call})) {
<@exec s.then![]/>
<#if s.elseBranch??>
        } else {
<@exec s.elseBranch/>
</#if>
        }
<#elseif s.render == "foreach">
        for (var ${s.itemVar} : ${s.name}(${s.call})) {
<@exec s.body![]/>
        }
<#else>
        ${s.name}(${s.call});
</#if>
</#list>
</#macro>
package ${project.packageName}.custom;

import ${modpkg}.domain.aggregates.${aggregate.name?lower_case}.${operation.name?cap_first}${aggregate.name}Operation;
import ${modpkg}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}OperationContext;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@code ${operation.name}} operation of ${aggregate.name}.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
public class Default${operation.name?cap_first}${aggregate.name}Operation implements ${operation.name?cap_first}${aggregate.name}Operation {

<#if operation.intent?? && operation.intent?has_content>
    /** Intent (from the model): ${operation.intent} */
</#if>
    @Override
    public void execute(${aggregate.name}OperationContext context<#if operationInput?? && operationInput.fields?has_content>, ${operation.name?cap_first}${aggregate.name}Operation.Input input</#if>) {
<#if operation.intent?? && operation.intent?has_content>
        // Intended behaviour: ${operation.intent}
</#if>
<#if executable?? && executable>
        // Generated control-flow structure (docs/design/operation-body.md §5). The leaf logic below
        // is yours to implement — replace each hook's throw.
<@exec executableBody.body/>
<#else>
<#if steps?? && (steps?size > 0)>
        // Modeled body (docs/design/operation-body.md) — implement these steps on `context`,
        // then remove the throw below:
<@outline steps=steps indent=""/>
</#if>
        // Tip: `mvn modux:ai-complete` implements this hook from the model.
        throw new UnsupportedOperationException(
<#if operation.intent?? && operation.intent?has_content>
            "Pendiente de implementar la operación «${operation.name}» de ${aggregate.name}: ${operation.intent?j_string}");
<#else>
            "Pendiente de implementar la operación «${operation.name}» de ${aggregate.name}");
</#if>
</#if>
    }
<#if executable?? && executable>

    // --- developer-owned leaf logic (Modux scaffolded these; implement them, remove the throws) ---
<#list executableBody.hooks as h>
    private ${h.returnType} ${h.name}(${aggregate.name}OperationContext context<#list h.params as p>, Object ${p}</#list>) {
        throw new UnsupportedOperationException("TODO: ${h.name}");
    }
</#list>
</#if>
}
