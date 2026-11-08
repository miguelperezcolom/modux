package es.biblioteca.custom;

import es.biblioteca.application.BusinessRuleException;
import es.biblioteca.prestamos.domain.aggregates.socio.SocioContext;
import es.biblioteca.prestamos.domain.aggregates.socio.SocioInvariants;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@link SocioInvariants} hook. Scaffolded once by
 * Modux and never overwritten — put the business rules here.
 */
@Component
public class DefaultSocioInvariants implements SocioInvariants {

    @Override
    public void check(SocioContext context) {
        var carnet = context.socio().getCarnet();
        if (carnet == null || carnet.isBlank()) {
            throw BusinessRuleException.invalid("El número de carné es obligatorio");
        }
    }
}
