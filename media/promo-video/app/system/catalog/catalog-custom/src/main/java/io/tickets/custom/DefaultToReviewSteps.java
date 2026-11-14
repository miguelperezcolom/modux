package io.tickets.custom;

import io.tickets.catalog.application.out.ConcertRepository;
import io.tickets.catalog.application.usecases.toreview.ToReviewCommand;
import io.tickets.catalog.application.usecases.toreview.ToReviewResult;
import io.tickets.catalog.application.usecases.toreview.ToReviewSteps;
import io.tickets.catalog.domain.aggregates.concert.vo.Status;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the ToReview use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultToReviewSteps implements ToReviewSteps {

    private final ConcertRepository concertRepository;

    /** Intent (from the model): Reads the concerts. */
    @Override
    public ToReviewResult lookup(ToReviewCommand command) {
        LocalDate today = LocalDate.now();
        // To review: concerts whose sale is still open although their date has already passed.
        var concerts = concertRepository.findAll().stream()
            .filter(c -> c.getStatus() == Status.ON_SALE)
            .filter(c -> c.getDate() != null && c.getDate().isBefore(today))
            .sorted(ConcertRows.BY_DATE)
            .toList();
        return new ToReviewResult(ConcertRows.toJson(concerts));
    }
}