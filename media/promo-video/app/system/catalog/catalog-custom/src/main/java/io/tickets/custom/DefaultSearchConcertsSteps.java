package io.tickets.custom;

import io.tickets.catalog.application.out.ConcertRepository;
import io.tickets.catalog.application.usecases.searchconcerts.SearchConcertsCommand;
import io.tickets.catalog.application.usecases.searchconcerts.SearchConcertsResult;
import io.tickets.catalog.application.usecases.searchconcerts.SearchConcertsSteps;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the SearchConcerts use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultSearchConcertsSteps implements SearchConcertsSteps {

    private final ConcertRepository concertRepository;

    /** Intent (from the model): Reads the concerts. */
    @Override
    public SearchConcertsResult lookup(SearchConcertsCommand command) {
        String artist = command == null || command.artist() == null
            ? ""
            : command.artist().trim().toLowerCase(Locale.ROOT);
        var concerts = concertRepository.findAll().stream()
            .filter(c -> artist.isEmpty()
                || (c.getArtist() != null && c.getArtist().toLowerCase(Locale.ROOT).contains(artist)))
            .sorted(ConcertRows.BY_DATE)
            .toList();
        return new SearchConcertsResult(ConcertRows.toJson(concerts));
    }
}