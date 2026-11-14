package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.catalog.application.out.ConcertRepository;
import io.tickets.catalog.application.usecases.lookupprice.LookupPriceCommand;
import io.tickets.catalog.application.usecases.lookupprice.LookupPriceResult;
import io.tickets.catalog.application.usecases.lookupprice.LookupPriceSteps;
import io.tickets.catalog.domain.aggregates.concert.Concert;
import io.tickets.catalog.domain.aggregates.concert.vo.ConcertId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the LookupPrice use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultLookupPriceSteps implements LookupPriceSteps {

    private final ConcertRepository concertRepository;

    /** Intent (from the model): Loads the concert by its id and returns its price, its status (ON_SALE or CLOSED) and its artist; if it does not exist, BusinessRuleException.notFound. */
    @Override
    public LookupPriceResult lookup(LookupPriceCommand command) {
        if (command == null || command.concertId() == null || command.concertId().isBlank()) {
            throw BusinessRuleException.invalid("The concert id is required");
        }
        Long id;
        try {
            id = Long.valueOf(command.concertId().trim());
        } catch (NumberFormatException e) {
            throw BusinessRuleException.notFound("Concert " + command.concertId() + " does not exist");
        }
        Concert concert = concertRepository
            .findById(new ConcertId(id))
            .orElseThrow(() -> BusinessRuleException.notFound("Concert " + command.concertId() + " does not exist"));
        return new LookupPriceResult(
            concert.getPrice(),
            concert.getStatus() == null ? null : concert.getStatus().name(),
            concert.getArtist());
    }
}