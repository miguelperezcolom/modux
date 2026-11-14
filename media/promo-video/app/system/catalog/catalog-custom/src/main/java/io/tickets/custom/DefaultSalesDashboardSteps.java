package io.tickets.custom;

import io.tickets.catalog.application.out.ConcertRepository;
import io.tickets.catalog.application.usecases.salesdashboard.SalesDashboardCommand;
import io.tickets.catalog.application.usecases.salesdashboard.SalesDashboardResult;
import io.tickets.catalog.application.usecases.salesdashboard.SalesDashboardSteps;
import io.tickets.catalog.domain.aggregates.concert.Concert;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the SalesDashboard use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultSalesDashboardSteps implements SalesDashboardSteps {

    private final ConcertRepository concertRepository;

    /** Intent (from the model): Reads the concerts. */
    @Override
    public SalesDashboardResult lookup(SalesDashboardCommand command) {
        List<Concert> concerts = concertRepository.findAll().stream()
            .sorted(ConcertRows.BY_DATE)
            .toList();

        String latest = concerts.stream()
            .filter(c -> c.getDate() != null)
            .reduce((first, second) -> second)
            .map(c -> c.getArtist() + " — " + c.getDate())
            .orElse(null);

        // Ticket sales are not owned by the catalog and no sales read model is available in this
        // context, so the sales figures start at zero here.
        return new SalesDashboardResult(0, BigDecimal.ZERO, latest, ConcertRows.toJson(concerts));
    }
}