package es.biblioteca.custom;

import es.biblioteca.application.BusinessRuleException;
import es.biblioteca.prestamos.application.out.LibroRepository;
import es.biblioteca.prestamos.application.out.PrestamoRepository;
import es.biblioteca.prestamos.application.out.SocioRepository;
import es.biblioteca.prestamos.application.usecases.prestarlibro.PrestarLibroCommand;
import es.biblioteca.prestamos.application.usecases.prestarlibro.PrestarLibroResult;
import es.biblioteca.prestamos.application.usecases.prestarlibro.PrestarLibroSteps;
import es.biblioteca.prestamos.domain.aggregates.libro.vo.LibroId;
import es.biblioteca.prestamos.domain.aggregates.prestamo.Prestamo;
import es.biblioteca.prestamos.domain.aggregates.socio.vo.SocioId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Developer-owned implementation of the custom steps of the PrestarLibro use case.
 * Scaffolded once by Modux and never overwritten.
 */
@Component
@RequiredArgsConstructor
public class DefaultPrestarLibroSteps implements PrestarLibroSteps {

    static final int MAX_PRESTAMOS_ABIERTOS = 3;
    static final int DIAS_PRESTAMO = 14;

    final LibroRepository libros;
    final SocioRepository socios;
    final PrestamoRepository prestamos;

    /** Intent (from the model): presta el libro al socio con las reglas de la spec. */
    @Override
    public PrestarLibroResult prestar(PrestarLibroCommand command) {
        var libro = libros.findById(new LibroId(Long.valueOf(command.libroId())))
                .orElseThrow(() -> BusinessRuleException.notFound("No existe el libro " + command.libroId()));
        var socio = socios.findById(new SocioId(Long.valueOf(command.socioId())))
                .orElseThrow(() -> BusinessRuleException.notFound("No existe el socio " + command.socioId()));

        if (!"DISPONIBLE".equals(libro.getEstado())) {
            throw BusinessRuleException.conflict("El libro «" + libro.getTitulo() + "» no está disponible (" + libro.getEstado() + ")");
        }
        if (!"ACTIVO".equals(socio.getEstado())) {
            throw BusinessRuleException.conflict("El socio " + socio.getCarnet() + " no está activo");
        }
        var abiertos = prestamos.findAll().stream()
                .filter(p -> command.socioId().equals(p.getSocioId()) && ("ABIERTO".equals(p.getEstado()) || "RETRASADO".equals(p.getEstado())))
                .count();
        if (abiertos >= MAX_PRESTAMOS_ABIERTOS) {
            throw BusinessRuleException.conflict("El socio " + socio.getCarnet() + " ya tiene " + abiertos + " préstamos abiertos");
        }

        libro.update(libro.getIsbn(), libro.getTitulo(), libro.getAutor(), "PRESTADO");
        libros.save(libro);

        var hoy = LocalDate.now();
        var vence = hoy.plusDays(DIAS_PRESTAMO);
        var id = prestamos.save(Prestamo.of(command.libroId(), command.socioId(), hoy, vence, "ABIERTO"));
        return new PrestarLibroResult(String.valueOf(id.value()), vence);
    }

}
