# Spec: Monedero con historial completo

Un club deportivo tiene un monedero para sus socios. Si hay una reclamación debe poder explicar cada
céntimo, así que el saldo no es un dato que se sobrescribe: sale de la historia de movimientos.

## Lenguaje

- **Monedero**: titular y saldo. Su verdad son sus eventos: **MonederoAbierto**, **DineroIngresado**,
  **DineroRetirado** y **MonederoBloqueado**.
- **Resumen**: una vista de consulta con titular, saldo y número de movimientos.

## Casos de uso

- **Abrir** un monedero.
- **Ingresar** dinero: el importe tiene que ser positivo y el monedero no estar bloqueado.
- **Retirar** dinero: además, el saldo no puede quedar negativo.
- **Bloquear** un monedero.
- Consulta del **resumen** de todos los monederos, y del **historial** de movimientos de uno.

## Pantallas

Aplicación **Monedero**: Abrir, Ingresar, Retirar, Bloquear, Resumen e Historial.

## Verificación, en el navegador

Abrir un monedero, ingresar 100 € y retirar 30 €: el resumen dice 70 € y 2 movimientos. Retirar 500 €
se rechaza con su motivo. Tras reiniciar el servicio el saldo sigue siendo 70 € y sale de reproducir
los eventos, no de una columna de saldo. Bloquearlo e intentar ingresar se rechaza. El historial
muestra los movimientos en orden.
