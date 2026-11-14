package io.tickets.custom;

import io.tickets.application.BusinessRuleException;
import io.tickets.payments.application.out.PaymentRepository;
import io.tickets.payments.application.out.integration.PaymentAccepted;
import io.tickets.payments.application.out.integration.PaymentAcceptedPublisher;
import io.tickets.payments.application.out.integration.PaymentDeclined;
import io.tickets.payments.application.out.integration.PaymentDeclinedPublisher;
import io.tickets.payments.application.usecases.charge.ChargeCommand;
import io.tickets.payments.application.usecases.charge.ChargeSteps;
import io.tickets.payments.domain.aggregates.payment.Payment;
import io.tickets.payments.domain.aggregates.payment.vo.Status;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the custom steps of the Charge use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultChargeSteps implements ChargeSteps {

    private final PaymentRepository paymentRepository;
    private final PaymentAcceptedPublisher paymentAcceptedPublisher;
    private final PaymentDeclinedPublisher paymentDeclinedPublisher;

    /** Intent (from the model): With the gateway's answer, records the Payment (purchaseId, amount, ACCEPTED if the gateway accepts it or DECLINED with the reason it gives) and publishes PaymentAccepted or PaymentDeclined. */
    @Override
    public void charge(ChargeCommand command, io.tickets.payments.application.out.remote.PaygateChargeClient.Response paygateCharge) {
        if (command == null || command.purchaseId() == null || command.purchaseId().isBlank()) {
            throw BusinessRuleException.invalid("The purchase to charge is missing.");
        }
        if (paygateCharge == null) {
            throw BusinessRuleException.conflict("The payment gateway did not answer the charge request.");
        }

        boolean accepted = Boolean.TRUE.equals(paygateCharge.accepted());

        if (accepted) {
            Payment payment = Payment.of(command.purchaseId(), command.amount(), Status.ACCEPTED, null);
            paymentRepository.save(payment);
            paymentAcceptedPublisher.publish(new PaymentAccepted(command.purchaseId()));
        } else {
            String reason = paygateCharge.reason();
            Payment payment = Payment.of(command.purchaseId(), command.amount(), Status.DECLINED, reason);
            paymentRepository.save(payment);
            paymentDeclinedPublisher.publish(new PaymentDeclined(command.purchaseId(), reason));
        }
    }
}