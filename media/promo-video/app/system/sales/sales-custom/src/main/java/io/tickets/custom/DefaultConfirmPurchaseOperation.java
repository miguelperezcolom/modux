package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.sales.domain.aggregates.purchase.ConfirmPurchaseOperation;
import io.tickets.sales.domain.aggregates.purchase.PurchaseOperationContext;
import io.tickets.sales.domain.aggregates.purchase.vo.Status;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@code confirm} operation of Purchase.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
public class DefaultConfirmPurchaseOperation implements ConfirmPurchaseOperation {

    /** Intent (from the model): A PENDING purchase becomes CONFIRMED; in any other status it is rejected with «The purchase is not pending». */
    @Override
    public void execute(PurchaseOperationContext context, ConfirmPurchaseOperation.Input input) {
        if (context.status() != Status.PENDING) {
            throw BusinessRuleException.conflict("The purchase is not pending");
        }
        if (input != null) {
            context.confirmedBy(input.confirmedBy());
            context.reference(input.reference());
        }
        context.status(Status.CONFIRMED);
    }
}