<#assign modpkg = project.packageName + "." + module.name?lower_case?replace("[^a-z0-9]","",'r')>
package ${project.packageName}.custom;

import ${modpkg}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Context;
import ${modpkg}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Invariants;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@link ${aggregate.name}Invariants} hook. Scaffolded once by
 * Modux and never overwritten — put the business rules here.
 */
@Component
public class Default${aggregate.name}Invariants implements ${aggregate.name}Invariants {

    @Override
    public void check(${aggregate.name}Context context) {
        // The invariants of ${aggregate.name}<#if aggregate.invariants?has_content> (<#list aggregate.invariants as inv>${inv.name}<#sep>, </#list>)</#if> go here.
        // Reject an invalid state with BusinessRuleException.invalid("why") (answers 400 with that
        // message); read the state via context.${aggregate.name?uncap_first}().
    }
}
