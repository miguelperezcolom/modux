package es.biblioteca.custom;

import es.biblioteca.prestamos.application.out.PrestamoRepository;
import es.biblioteca.prestamos.application.usecases.detectarretrasos.DetectarRetrasosCommand;
import es.biblioteca.prestamos.application.usecases.detectarretrasos.DetectarRetrasosResult;
import es.biblioteca.prestamos.application.usecases.detectarretrasos.DetectarRetrasosSteps;
import es.biblioteca.prestamos.application.out.integration.PrestamoRetrasado;
import es.biblioteca.prestamos.application.out.integration.PrestamoRetrasadoPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Developer-owned implementation of the custom steps of the DetectarRetrasos use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultDetectarRetrasosSteps implements DetectarRetrasosSteps {

    final PrestamoRepository prestamos;
    final PrestamoRetrasadoPublisher events;

    /** Intent (from the model): marca los préstamos vencidos y publica PrestamoRetrasado por cada uno. */
    @Override
    public DetectarRetrasosResult detectar(DetectarRetrasosCommand command) {
        var hoy = LocalDate.now();
        var nuevos = 0;
        for (var p : prestamos.findAll()) {
            if (!"ABIERTO".equals(p.getEstado()) || !hoy.isAfter(p.getFechaVencimiento())) continue;
            p.update(p.getLibroId(), p.getSocioId(), p.getFechaPrestamo(), p.getFechaVencimiento(), "RETRASADO");
            prestamos.save(p);
            var id = String.valueOf(p.getId().value());
            events.publish(new PrestamoRetrasado(PrestamoRetrasado.CURRENT_SCHEMA_VERSION, id, p.getLibroId(), p.getSocioId(),
                    p.getFechaVencimiento(), (int) ChronoUnit.DAYS.between(p.getFechaVencimiento(), hoy)));
            nuevos++;
        }
        return new DetectarRetrasosResult(nuevos);
    }
}
