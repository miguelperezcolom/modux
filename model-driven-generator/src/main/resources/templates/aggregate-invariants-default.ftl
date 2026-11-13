<#assign modpkg = project.packageName + "." + module.name?lower_case?replace("[^a-z0-9]","",'r')>
package ${project.packageName}.custom;

import ${modpkg}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Context;
import ${modpkg}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Invariants;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@link ${aggregate.name}Invariants} hook. Scaffolded once by
 * Modux and never overwritten — put the business rules here.
<#list (aggregate.invariants![]) as inv>
 *
 * <p>Invariant «${inv.name}»:
<#list (inv.conditions![]) as c>
 * <ul><li>${(c.description!c.expression!"")?html}<#if c.errorMessage?has_content> — rejected with «${c.errorMessage?html}»</#if></li></ul>
</#list>
</#list>
 */
@Component
public class Default${aggregate.name}Invariants implements ${aggregate.name}Invariants {

    /**
     * Pendiente de implementar: the invariants of ${aggregate.name} listed above. Reject an invalid
     * state with BusinessRuleException.invalid("why") or .conflict("why") (they answer 400/409 with
     * that message); read the state via context.${aggregate.name?uncap_first}(), and inject the
     * repositories or query services you need (a uniqueness rule reads the others).
     */
    @Override
    public void check(${aggregate.name}Context context) {
    }
}
