# Spec: Solicitud de vacaciones con aprobación

Las vacaciones se piden hoy con un formulario en papel que pasa de mesa en mesa. La empresa quiere
un proceso con pasos claros y una bandeja de tareas para cada persona.

## Lenguaje

- **Empleado**: nombre, responsable y días disponibles.
- **Solicitud**: empleado, fecha de inicio, fecha de fin, días, motivo y estado: `EN_CURSO`,
  `APROBADA` o `RECHAZADA`.

## Proceso

1. El empleado **solicita** unas vacaciones. Si pide más días de los que tiene, se rechaza al
   momento con su motivo.
2. Su **responsable** recibe una tarea para aprobar o rechazar, con un comentario.
3. Si son **más de 10 días**, tras el responsable decide también **RR. HH.**
4. Si se aprueba, se descuentan los días y la solicitud queda `APROBADA`. Si alguien rechaza, queda
   `RECHAZADA` y no se descuenta nada.

## Pantallas

Aplicación **Vacaciones**: Solicitar, Mis solicitudes, Bandeja de tareas, Empleados.

## Verificación, en el navegador

Empleado con 20 días. Pedir 25: rechazo inmediato con motivo. Pedir 5: aparece en la bandeja del
responsable, que aprueba, y quedan 15 días. Pedir 12: tras el responsable pasa a RR. HH., que
rechaza; la solicitud queda `RECHAZADA` y siguen 15 días.
