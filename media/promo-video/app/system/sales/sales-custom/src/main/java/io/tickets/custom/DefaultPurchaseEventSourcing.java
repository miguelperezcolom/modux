package io.tickets.custom;

import io.tickets.sales.infra.out.persistence.PurchaseEventSourcing;
import io.tickets.sales.domain.aggregates.purchase.Purchase;
import io.tickets.sales.domain.aggregates.purchase.vo.PurchaseId;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Developer-owned event-sourcing logic for Purchase: how operations turn into domain events,
 * and how the (decoded) event stream folds back into aggregate state. Scaffolded once by Modux and
 * never overwritten.
 */
@Component
public class DefaultPurchaseEventSourcing implements PurchaseEventSourcing {

    /**
     * The domain events of the aggregate's latest change (instances of the {Event}Event records in
     * domain.events). Returning none is a valid choice: the repository then records the state the
     * aggregate was saved in (PurchaseGuardado), so the history is complete either way.
     */
    @Override
    public List<Object> eventsOf(Purchase aggregate) {
        return List.of();
    }

    /**
     * Rebuilds the aggregate from its decoded history. Returning null reads the current-state
     * snapshot, which the repository keeps up to date on every save.
     */
    @Override
    public Purchase replay(PurchaseId id, List<Object> events) {
        return null;
    }
}
