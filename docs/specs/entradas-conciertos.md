# Entradas: venta de entradas para conciertos

Una promotora vende entradas para sus conciertos. El catálogo de conciertos lo consulta mucha más
gente de la que compra; una compra no se da por buena hasta que el pago la confirma, y si el pago
falla las entradas vuelven a estar a la venta. De cada compra hay que poder ver su historia
completa, y la dirección quiere un panel de ventas por concierto.

Es la spec «de todo»: tiene que salir con los patrones de alto nivel de modux declarados con el
mínimo trabajo (una relación, un indicador), no escritos a mano.

## Contextos

- **Catálogo**: los conciertos (artista, recinto, fecha, aforo, precio). Lo administra la promotora.
- **Ventas**: las compras de entradas.
- **Pagos**: el cobro, contra una pasarela de pago externa.
- **Analítica**: el panel de la dirección.

## Qué tiene que hacer

- **Alta de concierto** (promotora): artista, recinto, fecha, aforo y precio. Nace EN_VENTA.
- **Cerrar la venta** de un concierto (promotora): deja de admitir compras.
- **Comprar entradas** (cliente): concierto y número de entradas (1 a 6). La compra nace PENDIENTE
  con su importe (precio × entradas) y retiene las entradas. No se compra un concierto cerrado, ni
  más entradas de las que quedan.
- **Cobro**: Pagos cobra la compra contra la pasarela. Si la pasarela la acepta, la compra queda
  CONFIRMADA; si la rechaza, queda RECHAZADA y sus entradas vuelven a estar disponibles.
- **Cancelar** una compra PENDIENTE (cliente): queda CANCELADA y libera sus entradas. Una compra
  confirmada no se cancela.
- **Historial**: cada compra guarda todo lo que le ha pasado, en orden.
- **Entradas disponibles por concierto**: Ventas las conoce sin preguntar a Catálogo en cada compra.
- **Panel de ventas** (dirección): por concierto, entradas vendidas e ingresos confirmados.
- **Consulta pública del catálogo**: otros sistemas (una web de agenda cultural) consultan los
  conciertos a través de una API publicada, con caché porque se consulta muchísimo.
- **Recintos**: la tabla de recintos del sistema de taquilla antiguo sigue siendo la buena; Catálogo
  la refleja.
- **Conciliación**: Pagos ve los cargos que ha hecho la pasarela.

## Patrones que tiene que ejercitar

| Necesidad | Patrón | Cómo se declara (lo mínimo) |
|---|---|---|
| Historia de la compra | Event sourcing | `persistenceType: EVENT_SOURCED` en el agregado Compra |
| Reglas de la compra | Operaciones del agregado | operaciones `confirmar`, `rechazar`, `cancelar` |
| Disponibles por concierto en Ventas | Proyección entre contextos | una línea agregado Concierto → read model de Ventas |
| Panel de ventas | Proyección entre contextos + consulta agrupada | una línea agregado Compra → read model de Analítica; `groupBy: conciertoId`, `filter: estado=CONFIRMADA` |
| El panel nombra el concierto | Proyección entre contextos | una línea agregado Concierto → read model de Analítica |
| Compra → cobro → confirmar/rechazar | Coreografía con eventos | flujos entre contextos |
| Que ningún evento se pierda | Outbox | `outboxEnabled` en Ventas y Pagos |
| Consultar un concierto desde Ventas | API publicada + cliente | una línea caso de uso → caso de uso de otro contexto |
| Agenda cultural | API publicada + proxy con caché | un ProxyApi delante de la API de Catálogo |
| Pasarela de pago | Sistema externo, llamada REST | una línea Cobrar → la operación `cobrar` de la pasarela |
| Recintos | Proyección desde una tabla legada | una línea tabla `recintos` → read model de Catálogo |
| Conciliación | Proyección desde una operación externa | una línea operación `movimientos` → read model de Pagos |
| Entrada única | Gateway | el gateway del sistema |
| Quién hace qué | Roles | promotora, cliente, dirección |
| Pantallas | UI federada | una app por actor |

## Qué tiene que probar

- Que `mvn modux:validate` pasa sin errores y que `modux:generate` no necesita nada a mano salvo
  la lógica de negocio de los ganchos, que implementa `mvn modux:ai-complete`.
- Que lo generado compila y sus tests pasan (`mvn test`, no solo `-DskipTests`).
- Que el sistema arranca con `mvn modux:deploy` (local) y el recorrido funciona en el navegador.
- Cada patrón de la tabla, comprobado en marcha, no solo en el código.

## Recorrido en el navegador

1. Promotora: alta de «Rosalía en el Palau», aforo 10, 40 €.
2. Cliente: compra 3 entradas → PENDIENTE, 120 €; tras el cobro, CONFIRMADA.
3. Cliente: compra 6 entradas (quedan 1) y después 2 → se rechaza: «Solo quedan 1 entradas».
4. Cliente: compra con una tarjeta que la pasarela rechaza (acaba en 0000) → RECHAZADA, con su motivo,
   y sus entradas no cuentan.
5. Cliente: intenta cancelar una compra confirmada → se rechaza.
6. Historial de compras: cada una, PENDIENTE y después CONFIRMADA o RECHAZADA, en orden.
7. Dirección: el panel de ventas, una fila por concierto (por su nombre): compras, entradas e
   ingresos confirmados.
8. Promotora: cierra la venta; una compra nueva se rechaza.
9. API pública: el concierto se consulta por el proxy; la segunda consulta sale de la caché.
10. Outbox: con Kafka parado, una compra queda PENDIENTE y se confirma al volver Kafka.
11. Recintos: los de la tabla legada; Movimientos de la pasarela: los cargos que hizo.
12. Con un IdP (Keycloak en local): se entra en Keycloak, una vez, y los roles del realm son los del
    modelo.

## Resultado (2026-11-11)

Recorrido completo en el navegador, con un solo login por persona, sobre `mvn modux:deploy` local.
Los patrones salieron de los comandos que emiten los gestos del editor (proyecciones, llamada entre
casos de uso, flujos, proxy) más un número a mano (`cacheTtlSeconds: 60`). La lógica de los ganchos la
escribió `mvn modux:ai-complete` a la primera. La pasarela de pago está simulada en el gancho de Cobrar.

Huecos que destapó, ya arreglados: la proyección desde un agregado no generaba nada; la llamada a un
caso de uso de otro servicio era un TODO; el proxy no se generaba; el IDE guardaba el origen de una
proyección con otros nombres; el servidor perdía el título de un caso de uso al añadirle un paso; sin
proveedor de identidad no había forma de entrar una sola vez en la shell; los servicios no conocían la
URL de los demás; las redirecciones salían con el host interno; el event sourcing por defecto no guardaba
nada y su historial no tenía pantalla; las listas de read models no tenían etiquetas ni formato de dinero;
`ai-complete` no veía los read models y repetía la publicación que hace el caso de uso.

## Segunda vuelta (2026-11-11)

Cerrados los huecos que quedaban, otra vez en marcha y en el navegador:

- **Panel por concierto**: una consulta con `groupBy` y `filter` da una fila por concierto con sus
  totales confirmados; con la vista de Concierto en Analítica (una línea más) la fila lo nombra.
- **Pasarela de verdad**: un proceso aparte, por HTTP. Cobrar la llama con un cliente generado
  (`PASARELA_URL`) y el gancho recibe su respuesta; la tarjeta rechazada llega RECHAZADA con el motivo
  que da el banco. `ai-complete` adaptó el gancho, que ya no compilaba con la firma nueva.
- **Proyecciones desde fuera**: Recintos refleja una tabla de una base legada (JDBC) y Movimientos la
  operación de la pasarela (GET), cada minuto.
- **Keycloak en local**: con un IdP en `localhost` el compose levanta Keycloak con el realm generado
  (roles, un usuario por rol, clientes); se entra en Keycloak y la cookie del sistema lleva los roles
  del realm. `@KeycloakSecured`, que Mateu quitó, ya no se genera.

Huecos nuevos que destapó, arreglados: un 400 de otro servicio salía como «error inesperado» (ahora
es la misma regla con su mensaje); el cliente REST mandaba el cuerpo troceado, que no todos los
servidores aceptan; con IdP nada compilaba (la anotación retirada) y los roles del JWT no llegaban a
`@PreAuthorize`; el realm de `up.sh` no existía.

Queda: el DNS real (crear un registro en Netlify) necesita `NETLIFY_AUTH_TOKEN`, que esta sesión no
tiene; los proveedores sí tienen sus pruebas contra servidores que responden como sus APIs.
