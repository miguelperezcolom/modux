package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.sales.domain.aggregates.purchase.PurchaseOperationContext;
import io.tickets.sales.domain.aggregates.purchase.RejectPurchaseOperation;
import io.tickets.sales.domain.aggregates.purchase.vo.Status;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@code reject} operation of Purchase.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
public class DefaultRejectPurchaseOperation implements RejectPurchaseOperation {

    /** Intent (from the model): A PENDING purchase becomes REJECTED with the reason received; in any other status it is rejected with «The purchase is not pending». */
    @Override
    public void execute(PurchaseOperationContext context, RejectPurchaseOperation.Input input) {
        if (context.status() != Status.PENDING) {
            throw BusinessRuleException.conflict("The purchase is not pending");
        }
        context.reason(input == null ? null : input.reason());
        context.status(Status.REJECTED);
    }
}