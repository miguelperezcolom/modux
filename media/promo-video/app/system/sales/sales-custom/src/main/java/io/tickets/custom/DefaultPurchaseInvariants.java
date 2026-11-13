package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.sales.domain.aggregates.purchase.Purchase;
import io.tickets.sales.domain.aggregates.purchase.PurchaseContext;
import io.tickets.sales.domain.aggregates.purchase.PurchaseInvariants;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@link PurchaseInvariants} hook. Scaffolded once by
 * Modux and never overwritten — put the business rules here.
 *
 * <p>Invariant «positiveTickets»:
 * <ul><li>A purchase is for at least one ticket. — rejected with «Buy at least one ticket»</li></ul>
 */
@Component
public class DefaultPurchaseInvariants implements PurchaseInvariants {

    /** The invariants of Purchase listed above. */
    @Override
    public void check(PurchaseContext context) {
        Purchase purchase = context.purchase();
        if (purchase.getTickets() == null || purchase.getTickets() < 1) {
            throw BusinessRuleException.invalid("Buy at least one ticket");
        }
    }
}