package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.catalog.application.out.ConcertRepository;
import io.tickets.catalog.application.usecases.concertdetails.ConcertDetailsCommand;
import io.tickets.catalog.application.usecases.concertdetails.ConcertDetailsResult;
import io.tickets.catalog.application.usecases.concertdetails.ConcertDetailsSteps;
import io.tickets.catalog.domain.aggregates.concert.Concert;
import io.tickets.catalog.domain.aggregates.concert.vo.ConcertId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the ConcertDetails use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultConcertDetailsSteps implements ConcertDetailsSteps {

    private final ConcertRepository concertRepository;

    /** Intent (from the model): Reads the concerts. */
    @Override
    public ConcertDetailsResult lookup(ConcertDetailsCommand command) {
        if (command == null || command.id() == null || command.id().isBlank()) {
            throw BusinessRuleException.invalid("The concert id is required");
        }
        Long id;
        try {
            id = Long.valueOf(command.id().trim());
        } catch (NumberFormatException e) {
            throw BusinessRuleException.invalid("The concert id " + command.id() + " is not valid");
        }
        Concert concert = concertRepository
            .findById(new ConcertId(id))
            .orElseThrow(() -> BusinessRuleException.notFound("Concert " + command.id() + " does not exist"));
        return new ConcertDetailsResult(
            concert.getArtist(),
            concert.getDate(),
            concert.getDescription(),
            concert.getZones() == null || concert.getZones().isBlank() ? "[]" : concert.getZones());
    }
}