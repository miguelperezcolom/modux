package es.biblioteca.custom;

import es.biblioteca.application.BusinessRuleException;
import es.biblioteca.prestamos.application.out.LibroRepository;
import es.biblioteca.prestamos.application.out.PrestamoRepository;
import es.biblioteca.prestamos.application.usecases.devolverlibro.DevolverLibroCommand;
import es.biblioteca.prestamos.application.usecases.devolverlibro.DevolverLibroResult;
import es.biblioteca.prestamos.application.usecases.devolverlibro.DevolverLibroSteps;
import es.biblioteca.prestamos.domain.aggregates.libro.vo.LibroId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Developer-owned implementation of the custom steps of the DevolverLibro use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultDevolverLibroSteps implements DevolverLibroSteps {

    final LibroRepository libros;
    final PrestamoRepository prestamos;

    /** Intent (from the model): cierra el préstamo abierto del libro y lo deja disponible. */
    @Override
    public DevolverLibroResult devolver(DevolverLibroCommand command) {
        var libro = libros.findById(new LibroId(Long.valueOf(command.libroId())))
                .orElseThrow(() -> BusinessRuleException.notFound("No existe el libro " + command.libroId()));
        var prestamo = prestamos.findAll().stream()
                .filter(p -> command.libroId().equals(p.getLibroId()) && ("ABIERTO".equals(p.getEstado()) || "RETRASADO".equals(p.getEstado())))
                .findFirst()
                .orElseThrow(() -> BusinessRuleException.conflict("El libro «" + libro.getTitulo() + "» no tiene ningún préstamo abierto"));

        var hoy = LocalDate.now();
        prestamo.update(prestamo.getLibroId(), prestamo.getSocioId(), prestamo.getFechaPrestamo(),
                prestamo.getFechaVencimiento(), "DEVUELTO");
        prestamos.save(prestamo);
        libro.update(libro.getIsbn(), libro.getTitulo(), libro.getAutor(), "DISPONIBLE");
        libros.save(libro);

        var conRetraso = hoy.isAfter(prestamo.getFechaVencimiento());
        return new DevolverLibroResult(String.valueOf(prestamo.getId().value()), prestamo.getLibroId(),
                prestamo.getSocioId(), hoy, conRetraso);
    }
}
