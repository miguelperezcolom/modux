# Spec: Pedidos de una tienda, con cobro y stock en servicios separados

Una tienda tiene el catálogo, el almacén y los cobros en equipos distintos. Un pedido solo se
confirma si hay stock y se ha cobrado, y si algo falla no puede quedar nada a medias.

## Lenguaje

- **Producto** (Almacén): referencia, nombre y unidades disponibles.
- **Cuenta** (Cobros): cliente y saldo en euros.
- **Pedido** (Pedidos): cliente, producto, unidades, importe y estado: `PENDIENTE`, `CONFIRMADO` o
  `CANCELADO`, con el motivo de la cancelación.

## Servicios

Pedidos, Almacén y Cobros se despliegan por separado y solo se comunican por eventos.

## Casos de uso

- Dar de alta productos y cuentas.
- **Hacer un pedido.** Nace `PENDIENTE` y arranca una **saga**:
  1. Almacén reserva las unidades. Si no hay, el pedido se cancela con motivo «sin stock».
  2. Cobros carga el importe. Si no hay saldo, el pedido se cancela con motivo «sin saldo» y
     **Almacén devuelve las unidades reservadas**.
  3. Si todo va bien, el pedido queda `CONFIRMADO`.

## Pantallas

Aplicación **Tienda**: Hacer pedido, Pedidos, Productos, Cuentas. Productos y Cuentas pertenecen a
otros servicios, pero el usuario entra por una sola aplicación.

## Verificación, en el navegador

Producto con 5 unidades y cuenta con 100 €. Pedido de 2 unidades por 50 €: `CONFIRMADO`, quedan 3
unidades y 50 €. Pedido de 10 unidades: `CANCELADO` por «sin stock», las unidades no cambian. Pedido
de 1 unidad por 500 €: `CANCELADO` por «sin saldo», y las unidades vuelven a 3.
