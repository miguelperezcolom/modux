<#assign mpkg = module.name?lower_case?replace("[^a-z0-9]","",'r')>
package ${project.packageName}.custom;

import ${project.packageName}.${mpkg}.infra.out.persistence.${aggregate.name}EventSourcing;
import ${project.packageName}.${mpkg}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name};
import ${project.packageName}.${mpkg}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Developer-owned event-sourcing logic for ${aggregate.name}: how operations turn into domain events,
 * and how the (decoded) event stream folds back into aggregate state. Scaffolded once by Modux and
 * never overwritten.
 */
@Component
public class Default${aggregate.name}EventSourcing implements ${aggregate.name}EventSourcing {

    /**
     * The domain events of the aggregate's latest change (instances of the {Event}Event records in
     * domain.events). Returning none is a valid choice: the repository then records the state the
     * aggregate was saved in (${aggregate.name}Guardado), so the history is complete either way.
     */
    @Override
    public List<Object> eventsOf(${aggregate.name} aggregate) {
        return List.of();
    }

    /**
     * Rebuilds the aggregate from its decoded history. Returning null reads the current-state
     * snapshot, which the repository keeps up to date on every save.
     */
    @Override
    public ${aggregate.name} replay(${aggregate.name}Id id, List<Object> events) {
        return null;
    }
}
