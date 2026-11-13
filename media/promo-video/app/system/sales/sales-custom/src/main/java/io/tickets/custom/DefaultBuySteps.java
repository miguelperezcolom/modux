package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.sales.application.out.PurchaseRepository;
import io.tickets.sales.application.out.remote.LookupPriceClient;
import io.tickets.sales.application.query.ConcertViewReadModelQueryService;
import io.tickets.sales.application.query.readmodel.ConcertViewReadModel;
import io.tickets.sales.application.usecases.buy.BuyCommand;
import io.tickets.sales.application.usecases.buy.BuyOutcome;
import io.tickets.sales.application.usecases.buy.BuyResult;
import io.tickets.sales.application.usecases.buy.BuySteps;
import io.tickets.sales.domain.aggregates.purchase.Purchase;
import io.tickets.sales.domain.aggregates.purchase.PurchaseContext;
import io.tickets.sales.domain.aggregates.purchase.PurchaseInvariants;
import io.tickets.sales.domain.aggregates.purchase.vo.PurchaseId;
import io.tickets.sales.domain.aggregates.purchase.vo.Status;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the Buy use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultBuySteps implements BuySteps {

    private static final int MIN_TICKETS = 1;
    private static final int MAX_TICKETS = 6;
    private static final String ON_SALE = "ON_SALE";
    private static final String PICKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PurchaseRepository purchaseRepository;
    private final PurchaseInvariants purchaseInvariants;
    private final ConcertViewReadModelQueryService concertViewQueryService;

    /** Intent (from the model): With the current price Catalog gives (lookupPrice): rejects if tickets is not between 1 and 6, if the concert is not ON_SALE or if it asks for more than are available («Only N tickets left»); available = capacity of ConcertView minus the tickets of that concert's purchases that are neither REJECTED nor CANCELLED. Otherwise creates the PENDING purchase with amount = price × tickets and returns PurchasePlaced. */
    @Override
    public BuyOutcome buy(BuyCommand command, LookupPriceClient.Response lookupPrice) {
        Integer tickets = command.tickets();
        if (tickets == null || tickets < MIN_TICKETS || tickets > MAX_TICKETS) {
            throw BusinessRuleException.invalid(
                "You can buy between " + MIN_TICKETS + " and " + MAX_TICKETS + " tickets");
        }
        if (command.concertId() == null || command.concertId().isBlank()) {
            throw BusinessRuleException.invalid("Choose the concert to buy tickets for");
        }
        if (lookupPrice == null) {
            throw BusinessRuleException.notFound("Concert " + command.concertId() + " does not exist");
        }
        if (!ON_SALE.equals(lookupPrice.status())) {
            throw BusinessRuleException.conflict("The concert is not on sale");
        }
        if (lookupPrice.price() == null) {
            throw BusinessRuleException.conflict("The concert has no price yet");
        }

        ConcertViewReadModel concert =
            concertViewQueryService
                .getById(command.concertId())
                .orElseThrow(
                    () ->
                        BusinessRuleException.notFound(
                            "Concert " + command.concertId() + " does not exist"));

        int capacity = concert.capacity() == null ? 0 : concert.capacity();
        int taken =
            purchaseRepository.findAll().stream()
                .filter(p -> Objects.equals(command.concertId(), p.getConcertId()))
                .filter(p -> p.getStatus() != Status.REJECTED && p.getStatus() != Status.CANCELLED)
                .mapToInt(p -> p.getTickets() == null ? 0 : p.getTickets())
                .sum();
        int available = Math.max(0, capacity - taken);
        if (tickets > available) {
            throw BusinessRuleException.conflict("Only " + available + " tickets left");
        }

        BigDecimal amount = lookupPrice.price().multiply(BigDecimal.valueOf(tickets));

        Purchase purchase =
            Purchase.of(
                command.concertId(),
                command.customer(),
                tickets,
                amount,
                command.card(),
                Status.PENDING,
                null,
                null,
                null);
        purchaseInvariants.check(new PurchaseContext(purchase));
        PurchaseId id = purchaseRepository.save(purchase);
        String purchaseId = String.valueOf(id.value());

        String artist = lookupPrice.artist() != null ? lookupPrice.artist() : concert.artist();
        String receipt =
            "Purchase "
                + purchaseId
                + ": "
                + tickets
                + " ticket(s) for "
                + artist
                + (concert.venue() != null ? " at " + concert.venue() : "")
                + (concert.date() != null ? " on " + concert.date() : "")
                + " — total "
                + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();

        String zones = concert.zones() != null ? concert.zones() : "[]";

        return new BuyOutcome(new BuyResult(purchaseId, amount, receipt, zones), pickupCode());
    }

    private static String pickupCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            sb.append(PICKUP_ALPHABET.charAt(RANDOM.nextInt(PICKUP_ALPHABET.length())));
        }
        return sb.toString();
    }
}