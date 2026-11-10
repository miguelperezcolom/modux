# Paquetería: el ciclo de un envío

Una empresa de paquetería registra envíos y sigue su reparto. Las reglas son del envío: nadie puede
saltarse un paso desde fuera, ni desde una pantalla ni desde otro proceso.

## Qué tiene que hacer

- **Registrar un envío**: destinatario, dirección y peso. Nace REGISTRADO, con cero intentos.
- **Salir a reparto**: un envío REGISTRADO sale con un transportista y pasa a EN_REPARTO. No sale uno
  que ya está en reparto, entregado o devuelto.
- **Entregar**: un envío EN_REPARTO pasa a ENTREGADO. No se entrega lo que no ha salido.
- **Fallo de entrega**: un envío EN_REPARTO suma un intento. Al tercero queda DEVUELTO; si no, vuelve
  a REGISTRADO para salir otra vez. El transportista se borra en ambos casos.

## Qué tiene que probar

Que las reglas viven en el agregado, como operaciones, y no en los casos de uso: el caso de uso
carga el envío, invoca la operación y lo guarda. La operación cambia el envío a través de su
contexto, sin setters. Las operaciones las implementa `mvn modux:ai-complete` a partir de su
intención.

## Recorrido en el navegador

1. Alta de un envío (REGISTRADO, 0 intentos).
2. Entregar sin haber salido: se rechaza.
3. Salir a reparto con «Lola»: EN_REPARTO, transportista Lola.
4. Salir otra vez: se rechaza.
5. Tres fallos seguidos (saliendo entre medias): 1, 2 y DEVUELTO al tercero.
6. Otro envío: sale y se entrega.
