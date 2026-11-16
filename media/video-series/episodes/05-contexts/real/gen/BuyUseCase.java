package io.tickets.sales.application.usecases.buy;

import io.tickets.sales.domain.events.PurchasePlacedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;

@Service
@RequiredArgsConstructor
public class BuyUseCase {

  final io.tickets.sales.application.out.remote.LookupPriceClient lookupPriceClient;
  final io.tickets.sales.application.out.integration.PurchasePlacedPublisher
      purchasePlacedPublisher;
  final BuySteps steps;

  @PreAuthorize("hasAnyRole('CUSTOMER')")
  @org.springframework.security.authorization.method.HandleAuthorizationDenied(
      handlerClass = io.tickets.application.Forbidden.class)
  @Transactional
  public BuyResult handle(BuyCommand command) {
    BuyResult result = null;
    var lookupPrice =
        lookupPriceClient.call(
            new io.tickets.sales.application.out.remote.LookupPriceClient.Request(
                command.concertId()));
    var outcome = steps.buy(command, lookupPrice);
    result = outcome.result();
    purchasePlacedPublisher.publish(
        new io.tickets.sales.application.out.integration.PurchasePlaced(
            result.purchaseId(),
            command.concertId(),
            command.customer(),
            command.tickets(),
            result.amount(),
            command.card(),
            result.zones(),
            result.receipt(),
            outcome.pickupCode()));
    return result;
  }
}
