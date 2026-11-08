package es.biblioteca.custom;

import es.biblioteca.avisos.application.out.AvisoRepository;
import es.biblioteca.avisos.application.usecases.registraraviso.RegistrarAvisoCommand;
import es.biblioteca.avisos.application.usecases.registraraviso.RegistrarAvisoSteps;
import es.biblioteca.avisos.domain.aggregates.aviso.Aviso;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Developer-owned implementation of the custom steps of the RegistrarAviso use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DefaultRegistrarAvisoSteps implements RegistrarAvisoSteps {

    final AvisoRepository avisos;

    /** Intent (from the model): registra un Aviso para el socio y lo envía por email. */
    @Override
    public void registrar(RegistrarAvisoCommand command) {
        var mensaje = "Tu préstamo " + command.prestamoId() + " venció el " + command.fechaVencimiento()
                + " (" + command.diasRetraso() + " días de retraso). Devuelve el libro, por favor.";
        avisos.save(Aviso.of(command.prestamoId(), command.socioId(), mensaje, LocalDate.now()));
        // el envío real de correo va aquí; en esta fase queda registrado y en el log
        log.info("Aviso al socio {}: {}", command.socioId(), mensaje);
    }
}
