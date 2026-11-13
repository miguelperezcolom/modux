package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.catalog.domain.aggregates.concert.CloseSaleConcertOperation;
import io.tickets.catalog.domain.aggregates.concert.ConcertOperationContext;
import io.tickets.catalog.domain.aggregates.concert.vo.Status;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@code closeSale} operation of Concert.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
public class DefaultCloseSaleConcertOperation implements CloseSaleConcertOperation {

    /** Intent (from the model): If the concert is ON_SALE it becomes CLOSED; if it is already closed, it is rejected with «The sale is already closed». */
    @Override
    public void execute(ConcertOperationContext context) {
        if (context.status() == Status.CLOSED) {
            throw BusinessRuleException.conflict("The sale is already closed");
        }
        if (context.status() != Status.ON_SALE) {
            throw BusinessRuleException.conflict("The concert is not on sale");
        }
        context.status(Status.CLOSED);
    }
}