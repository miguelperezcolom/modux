# Spec: Préstamos de una biblioteca de barrio

Sistema sencillo, pensado para crecer por iteraciones. Cada iteración añade casos de uso
sobre lo anterior; se diseña con el plugin de IntelliJ, se genera con modux, se despliega en
local (docker-compose) y se verifica contra la API REST.

## Contexto

Una biblioteca municipal presta libros a sus socios. Hoy lo lleva con una hoja de cálculo: no
sabe qué libros están fuera, quién se retrasa, ni avisa a nadie. Quiere un sistema pequeño que
lo resuelva.

## Lenguaje

- **Libro**: un ejemplar físico. Tiene ISBN, título, autor y un estado: `DISPONIBLE`,
  `PRESTADO` o `BAJA`.
- **Socio**: persona con carné. Tiene número de carné, nombre, email y si está `ACTIVO` o
  `SUSPENDIDO`.
- **Préstamo**: un libro en manos de un socio, desde una fecha hasta una fecha de vencimiento
  (14 días). Está `ABIERTO` o `DEVUELTO`.
- **Retraso**: préstamo abierto con la fecha de vencimiento ya pasada.

## Iteración 1 — Catálogo y socios

- Dar de alta, consultar, modificar y listar libros.
- Dar de alta, consultar, modificar y listar socios.
- Reglas: el ISBN y el número de carné son obligatorios.

Verificación: alta de un libro y un socio por REST, listado que los devuelve.

## Iteración 2 — Prestar

- **Prestar un libro a un socio.** Crea un préstamo `ABIERTO` con vencimiento a 14 días.
- Reglas:
  - el libro tiene que estar `DISPONIBLE`; pasa a `PRESTADO`;
  - el socio tiene que estar `ACTIVO`;
  - un socio no puede tener más de 3 préstamos abiertos.

Verificación: prestar funciona; prestar un libro ya prestado se rechaza.

## Iteración 3 — Devolver

- **Devolver un libro.** El préstamo pasa a `DEVUELTO`, el libro vuelve a `DISPONIBLE`.
- Se publica el evento **LibroDevuelto** (libro, socio, fecha, si llegó con retraso).

Verificación: devolver cambia ambos estados y el evento sale al bus.

## Iteración 4 — Retrasos

- **Detectar retrasos** cada día: los préstamos abiertos vencidos se marcan con retraso y se
  publica **PrestamoRetrasado**.
- Consulta **préstamos retrasados** (para el mostrador).

Verificación: un préstamo con vencimiento pasado aparece en la consulta tras la detección.

## Iteración 5 — Avisos

- Un contexto aparte, **Avisos**, escucha `PrestamoRetrasado` y registra (y envía) un aviso
  al socio por email.
- Se despliega como servicio independiente.

Verificación: forzar un retraso y ver el aviso registrado en el servicio de avisos.
