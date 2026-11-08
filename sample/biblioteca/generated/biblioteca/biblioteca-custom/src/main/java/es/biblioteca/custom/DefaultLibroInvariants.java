package es.biblioteca.custom;

import es.biblioteca.application.BusinessRuleException;
import es.biblioteca.prestamos.domain.aggregates.libro.LibroContext;
import es.biblioteca.prestamos.domain.aggregates.libro.LibroInvariants;
import org.springframework.stereotype.Component;

/**
 * Developer-owned implementation of the {@link LibroInvariants} hook. Scaffolded once by
 * Modux and never overwritten — put the business rules here.
 */
@Component
public class DefaultLibroInvariants implements LibroInvariants {

    @Override
    public void check(LibroContext context) {
        var isbn = context.libro().getIsbn();
        if (isbn == null || isbn.isBlank()) {
            throw BusinessRuleException.invalid("El ISBN es obligatorio");
        }
    }
}
