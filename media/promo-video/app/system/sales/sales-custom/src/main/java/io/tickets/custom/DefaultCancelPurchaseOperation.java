package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.sales.domain.aggregates.purchase.CancelPurchaseOperation;
import io.tickets.sales.domain.aggregates.purchase.PurchaseOperationContext;
import io.tickets.sales.domain.aggregates.purchase.vo.Status;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@code cancel} operation of Purchase.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
public class DefaultCancelPurchaseOperation implements CancelPurchaseOperation {

    /** Intent (from the model): A PENDING purchase becomes CANCELLED; a confirmed one cannot be cancelled: «A confirmed purchase cannot be cancelled». */
    @Override
    public void execute(PurchaseOperationContext context) {
        if (context.status() == Status.CONFIRMED) {
            throw BusinessRuleException.conflict("A confirmed purchase cannot be cancelled");
        }
        if (context.status() != Status.PENDING) {
            throw BusinessRuleException.conflict("The purchase is not pending");
        }
        context.status(Status.CANCELLED);
    }
}