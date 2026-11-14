<#assign uiEs = ((project.defaultLocale!"")?has_content?then(project.defaultLocale!"", (project.locales![])?has_content?then((project.locales![""])[0], "")))?lower_case?starts_with("es")>
<#assign modpkg = project.packageName + "." + module.name?lower_case?replace("[^a-z0-9]","",'r')>
<#function c s=""><#return ((s!"")?replace("\r"," ")?replace("\n"," "))></#function>
<#-- Guided outline of a modeled operation body (all // comments, so it always compiles). -->
<#macro outline steps indent>
<#list steps as step>
<#if step.type == "If">
        //${indent} if (${c(step.condition)!uiEs?then("¿condición?", "condition?")}) {
<#if step.then??><@outline steps=step.then indent=indent + "  "/></#if>
<#if step.elseBranch??>
        //${indent} } else {
<@outline steps=step.elseBranch indent=indent + "  "/>
</#if>
        //${indent} }
<#elseif step.type == "ForEach">
        //${indent} for (${c(step.itemVar)!"item"} : ${c(step.collection)!uiEs?then("¿colección?", "collection?")}) {
<#if step.body??><@outline steps=step.body indent=indent + "  "/></#if>
        //${indent} }
<#elseif step.type == "CheckPrecondition">
        //${indent} precondition: ${c(step.condition)!c(step.name)}
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
package ${project.packageName}.custom;

import ${modpkg}.domain.services.${domainService.name};
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the ${domainService.name} domain service.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
public class Default${domainService.name} implements ${domainService.name} {
<#list operations as op>

<#if op.intent?? && op.intent?has_content>
    /** Intent (from the model): ${op.intent} */
</#if>
    @Override
    public void ${op.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}() {
<#if op.intent?? && op.intent?has_content>
        // Intended behaviour: ${op.intent}
</#if>
<#if op.steps?? && (op.steps?size > 0)>
        // Modeled body (docs/design/operation-body.md) — implement these steps, then remove the throw:
<@outline steps=op.steps indent=""/>
</#if>
        throw new UnsupportedOperationException(
            "<#if uiEs>Pendiente de implementar «${op.name}» de ${domainService.name}<#else>«${op.name}» of ${domainService.name} is not implemented yet</#if>");
    }
</#list>
}
