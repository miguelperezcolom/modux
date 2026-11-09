# Spec: Incidencias de soporte interno

Los empleados de una empresa piden ayuda por correo y las peticiones se pierden. Quieren un
sistema donde cada incidencia tenga dueño y estado, y donde cada persona vea solo lo que le toca.

## Lenguaje

- **Incidencia**: título, descripción, prioridad (`BAJA`, `MEDIA`, `ALTA`), quien la abrió, técnico
  asignado, solución y estado: `ABIERTA`, `ASIGNADA`, `RESUELTA` o `CERRADA`.
- **Roles**: **Empleado**, **Técnico** y **Supervisor**.

## Casos de uso

- **Abrir** una incidencia (Empleado). Nace `ABIERTA`.
- **Asignar** a un técnico (solo Supervisor). Pasa a `ASIGNADA`.
- **Resolver** (solo Técnico). Solo una incidencia `ASIGNADA`, y la solución es obligatoria. Pasa a
  `RESUELTA` y se publica **IncidenciaResuelta**.
- **Cerrar** (Empleado o Supervisor). Solo una incidencia `RESUELTA`. Pasa a `CERRADA`.
- Consulta **incidencias abiertas de alta prioridad**.

## Pantallas

Aplicación **Soporte**, con acceso según el rol: un Empleado no ve Asignar ni Resolver; un Técnico
no ve Asignar.

## Verificación, en el navegador

Con cada rol: el Empleado abre una incidencia y no ve Asignar. El Supervisor la asigna. El Técnico
intenta resolverla sin solución y lee por qué no puede; la resuelve con solución. Intentar cerrar
una incidencia que no esté `RESUELTA` se rechaza con su motivo. El Empleado la cierra. Llamar a
Asignar sin ser Supervisor se rechaza también en el servidor, no solo escondiendo el botón.
