package io.tickets.custom;

import io.tickets.catalog.application.out.ConcertRepository;
import io.tickets.catalog.application.usecases.listings.ListingsCommand;
import io.tickets.catalog.application.usecases.listings.ListingsResult;
import io.tickets.catalog.application.usecases.listings.ListingsSteps;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the Listings use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultListingsSteps implements ListingsSteps {

    private final ConcertRepository concertRepository;

    /** Intent (from the model): Reads the concerts. */
    @Override
    public ListingsResult lookup(ListingsCommand command) {
        var concerts = concertRepository.findAll().stream()
            .sorted(ConcertRows.BY_DATE)
            .toList();
        return new ListingsResult(ConcertRows.toJson(concerts));
    }
}