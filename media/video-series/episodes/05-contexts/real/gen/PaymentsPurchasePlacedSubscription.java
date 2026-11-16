package io.tickets.payments.infra.in.async;

import io.tickets.payments.application.usecases.charge.ChargeUseCase;
import io.tickets.payments.application.usecases.charge.ChargeCommand;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tickets.payments.infra.out.inbox.Inbox;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import lombok.RequiredArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.function.Consumer;

@Configuration
@RequiredArgsConstructor
public class PaymentsPurchasePlacedSubscription {

  final ChargeUseCase chargeUseCase;
  final ObjectMapper mapper;
  final Inbox inbox;

  @Bean
  public Consumer<Message<String>> paymentsPurchasePlaced() {
    return message ->
        asSystem(
            () -> {
              // Idempotent consumer (inbox pattern): at-least-once delivery redelivers the SAME
              // broker message (retries, rebalances, DLQ replays), so the dedup key is the
              // topic+partition+offset — two distinct events may share a payload and BOTH must
              // be processed (e.g. cupo going 4 → 3 → 4). Only redeliveries share coordinates.
              var messageHash = Inbox.dedupKey(message);
              if (inbox.alreadyProcessed("PaymentsPurchasePlaced", messageHash)) {
                return;
              }
              try {
                @SuppressWarnings("unchecked")
                var payload =
                    (Map<String, Object>) mapper.readValue(message.getPayload(), Map.class);
                chargeUseCase.handle(
                    new ChargeCommand(
                        (String) payload.get("purchaseId"),
                        (String) payload.get("concertId"),
                        (String) payload.get("customer"),
                        payload.get("tickets") != null
                            ? ((Number) payload.get("tickets")).intValue()
                            : null,
                        payload.get("amount") != null
                            ? new BigDecimal(payload.get("amount").toString())
                            : null,
                        (String) payload.get("card"),
                        payload.get("zones") != null ? String.valueOf(payload.get("zones")) : null,
                        (String) payload.get("receipt"),
                        (String) payload.get("pickupCode")));
                // Model mapping configured: mm-flow-charge (apply custom rules here)
              } catch (Exception e) {
                throw new RuntimeException("Error in PaymentsPurchasePlacedSubscription", e);
              }
              inbox.markProcessed("PaymentsPurchasePlaced", messageHash);
            });
  }

  /**
   * Nobody is signed in here: the work acts as the system — user «system», role SYSTEM (or SISTEMA:
   * both name it). A use case lets it in by listing that role among its roles (explicit
   * permissions), and its history records «system».
   */
  static void asSystem(Runnable work) {
    var context =
        org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
    context.setAuthentication(
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken
            .authenticated(
                "system",
                null,
                java.util.List.of(
                    new org.springframework.security.core.authority.SimpleGrantedAuthority(
                        "ROLE_SYSTEM"),
                    new org.springframework.security.core.authority.SimpleGrantedAuthority(
                        "ROLE_SISTEMA"))));
    org.springframework.security.core.context.SecurityContextHolder.setContext(context);
    try {
      work.run();
    } finally {
      org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }
  }
}
