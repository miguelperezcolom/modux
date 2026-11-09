# Spec: Reservas de salas de reuniones

Una oficina reparte sus salas con un calendario compartido que nadie respeta. Quiere un sistema
que impida los solapes y le diga cuánto cuesta cada reunión a cada departamento.

## Lenguaje

- **Sala**: nombre, aforo, precio por hora (euros) y si está `DISPONIBLE` o `EN_OBRAS`.
- **Reserva**: una sala, un día, hora de inicio, hora de fin, organizador, departamento y la lista
  de asistentes (nombre y email). Está `CONFIRMADA` o `CANCELADA`.

## Casos de uso

- Dar de alta, consultar, modificar y borrar salas.
- **Reservar** una sala. Reglas:
  - la sala tiene que estar `DISPONIBLE`;
  - el fin tiene que ser posterior al inicio;
  - no puede solaparse con otra reserva `CONFIRMADA` de esa sala ese día;
  - los asistentes no pueden superar el aforo.
- El importe de la reserva se calcula: horas por precio de la sala.
- **Cancelar** una reserva. No se puede cancelar una reserva de un día pasado.
- Una sala con reservas `CONFIRMADAS` no se puede borrar.
- Consulta: **reservas de un día**, para ver la ocupación.

## Pantallas

Aplicación **Salas**: Salas, Reservas, Reservar, Cancelar.

- Los días y las horas se eligen con su selector, y el precio se muestra como dinero.
- Los asistentes se añaden en una tabla dentro del formulario.
- Una regla incumplida se explica con su motivo.

## Verificación, en el navegador

Dar de alta una sala de aforo 2 a 50 €/h. Reservarla de 10:00 a 12:00 con dos asistentes y ver un
importe de 100 €. Intentar de 11:00 a 13:00 y leer que se solapa. Intentar con tres asistentes y
leer que supera el aforo. Intentar borrar la sala y leer por qué no se puede. Cancelar la reserva y
borrar la sala.
