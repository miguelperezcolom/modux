primero crearía el as-is completando el as-is actual 
- crearía una rama
- crearía una carpeta booking
- crearía una vista que llamaría contexto o l1
- en esa vista añadiría el sistema riu, arrastrando desde la paleta
- luego añadiría 3 actores (cliente final, ota y profesional) arrastrando desde la paleta
- también añadiría un sistema externo (ixo-pay)
- luego estableceria las relaciones entre los actores y el sistema riu, haciendo click mientras pulso shift (o similar) y arrastrando, en cualquier sentido, y elegiría el tipo de relación (según arquimate) de entre las posibles

- luego crearía otra vista que llamaría contexto o l2, copiando la vista anterior (tanto copiando el contenido del fichero (el yaml), haciendo una copia del fichero, o creando la vista en blanco, seleccionado el contenido en el editor gráfico de la vista anterior) y copiando en el editor gráfico/texto del editor de la nueva vista
- en esa vista crearía los subsistemas rumbonet y rumbo, bien arrastrando desde la paleta un elemento de tipo sistema dentro del elemento riu como arranstrando en el liezo y luego dibujando la línea y seleccionando el tipo composición
- en esta vita también crearía los subsistemas riu.com y riupro, igual que rumbonet y rumbo
- luego establecería las relaciones entre riu.com y rumbonet, y entre riupro y rumbonet
- luego relacionaría los actores de tipo cliente final con riu.com
- luego relacionaría los actores de tipo ota con riu.com
- luego relacionaría los actores de tipo profesional con riupro
- luego establecería la relación entre rumbonet y rumbo
- luego añadiría el subsistema riupayment y el subsistema del motor de disponibilidad y valoración, y establecería la relación de rumbonet con ambos
