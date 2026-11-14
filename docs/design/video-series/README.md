# Serie de vídeos de modux — plan (borrador para revisión)

**Objetivo.** El vídeo promocional de la home (1:54, mudo) enseña el recorrido entero de un tirón;
casi todo lo que modux hace queda fuera. Una serie de capítulos cortos (2–4 min) explica un aspecto
cada vez, para que la gente descubra lo que si no se perdería. Cada capítulo se enlaza desde la
página de la documentación de su tema y se puede volver a renderizar cuando el producto cambie.

Mismo método que la serie de Mateu (`mateu/design/video-series/README.md`) y el lenguaje visual de su
reel (`mateu/doc/public/reel.html`): escenas por bloques sobre fondo oscuro, una idea por escena,
código en monoespaciada, acentos de color; aquí con la marca de modux (la chispa violeta, la paleta
del vídeo promocional: `#0b0a14`, violeta `#a78bfa`, azur `#4cb2ff`, verde `#39d98a`, rosa `#ff7597`).

## Reglas de producción

1. **Nada dibujado a mano.** Todo lo que sale es modux funcionando: modelos reales en YAML, salida real
   de `mvn modux:*`, el editor gráfico real, el código generado y el escrito en la zona custom, y el
   sistema generado compilando y en marcha (la UI Mateu grabada con Playwright). El código en pantalla
   compila y es el que produce lo que se ve al lado. Un capítulo es también un test: si no se puede
   grabar, algo está roto y se dice.
2. **Lo contado coincide con el producto.** Lo opt-in se dice opt-in; lo experimental o a medias, como
   tal; nada sin publicar se presenta como disponible. Nunca nombres de clientes ni sistemas internos
   (Folio no sale): los ejemplos son Tickets (`media/promo-video/app`), los `sample/` y modelos nuevos
   de demostración.
3. **Pipeline.** Títulos y diagramas: escenas HTML. Vídeo a 1920×1080 fotograma a fotograma: reloj de
   Playwright pausado (`clock.install` + `clock.pauseAt`, avance explícito por fotograma), animaciones
   CSS ralentizadas por CDP (`Animation.setPlaybackRate`), una captura por fotograma con
   `deviceScaleFactor`, montaje a 30 fps con ffmpeg, H.264, sin música. La UI del sistema generado se
   graba igual, en marcha (no capturas estáticas animadas). Las salidas de terminal son la salida real
   capturada a fichero y reproducida a ritmo de lectura (como en el promo).
4. **Voz.** TTS local y gratuito: Kokoro (si no, Piper). Femenina en los dos idiomas, la misma para toda
   la serie. El guion de narración va primero; la duración de cada escena sale de su narración.
5. **Idiomas.** Dos versiones de cada capítulo (voz EN y voz ES), subtítulos `.srt` EN y ES para ambas
   (pistas de YouTube, sin quemar). La UI se graba una vez, en inglés (decisión 5).
6. **Publicación.** Canal de YouTube del propietario, lista propia de modux. Antes de subir **cada**
   vídeo: el MP4 y los textos (título, descripción EN/ES, lista, visibilidad) al propietario, y se
   espera su OK. Cada página de docs del capítulo lo embebe.

## Lo que la exploración ha encontrado antes de grabar nada

Regla 1 aplicada al repo: hay cosas que la documentación cuenta y que hoy no se pueden grabar.

- **La UI de administración, el servidor MCP de autoría y las Soluciones ya no existen.** Se borraron
  el 2026-08-05 (`d00f0241`: fuera `infra/in/ui`, `infra/in/mcp` y la capa de workspaces). Siguen
  describiéndolos `getting-started/quick-start.md` (barra lateral, «Organization → Projects», ⚙ Generar),
  `manual/mcp-authoring.md` (chat en la app, `--modux.mcp`, `POST /mcp`), `manual/solutions.md`,
  partes de `installation.md` y `AGENTS.md`. `ModelDrivenGeneratorApplication` aún mira `--modux.mcp`
  y nombra un `McpCliRunner` que no existe. **No hay capítulo sobre eso**; esas páginas hay que
  reescribirlas (o retirarlas) antes de enlazar vídeos desde ellas.
- **Cómo se trabaja hoy de verdad:** el modelo es YAML en el repo (a mano o con un agente y la skill
  `modux-model`), el editor gráfico (plugin de IntelliJ sobre los ficheros, o el componente web contra
  el servidor), y el plugin de Maven (`validate`, `generate`, `ai-complete`, `deploy`, `hla`, `schema`,
  `import-*`). El quick start debería contar eso; el capítulo 2 sería su vídeo.
- **Figma, a medias.** `ImportFigmaUseCase` (Figma REST → páginas del modelo) existe pero **no tiene
  punto de entrada**: lo invocaba el MCP borrado. `figma-maven-plugin` funciona solo
  (`figma:generate` → vistas Mateu en Java/C#/Python) pero está en `0.1.0-SNAPSHOT`, sin publicar y sin
  página en la doc de modux. Las tres copias del contrato de Figma de Mateu en modux
  (`model-driven-generator`, `figma-maven-plugin`) van **15 componentes por detrás** (la categoría Page
  Templates entera); leerlo del artefacto `mateu-uidl` está pendiente. Ver capítulo 12.
- **Agentes de IA en el sistema generado** (`manual/ai-agents.md`): hay plantilla `mcp-server.ftl`, pero
  no he comprobado aún cuánto de la página (agentes internos/externos, RAG, gateways MCP) genera código
  que arranque. Se verifica antes de comprometer el capítulo 14.
- **Mateu 3.0-beta.68** (en curso) arregla los enlaces directos y el doble resaltado de menú en shells
  federados: conviene grabar con modux ya apuntando a esa versión.

## Capítulos

Duraciones orientativas: salen de la narración (≈150 palabras/min en EN).

| # | Título | Dur. | Qué se graba (real) | Página de docs |
|---|---|---|---|---|
| 1 | modux en 3 minutos | 3' | El recorrido de Tickets narrado: modelo en el editor → `generate` → dos zonas → `deploy` → el sistema en marcha → un cambio de modelo. Reutiliza el pipeline y las capturas del promo, regrabadas con 0.6.5 | `getting-started/introduction` (la home sigue con el promo) |
| 2 | De un agregado a una aplicación | 4' | Un repo vacío, un modelo mínimo (Book) escrito en YAML, `validate` atrapando una referencia rota, `generate`, `deploy` local, el CRUD en el navegador (validación, dinero, detalle), un campo nuevo → regenerar → la migración y el campo en pantalla | `getting-started/quick-start` (a reescribir) |
| 3 | Dos zonas: el código que es tuyo | 3' | El hook generado (interfaz) y su `Default…` en `-custom`; regenerar no lo toca; un fichero generado editado a mano → aviso; `ai-complete` (opt-in, usa el CLI de IA local) escribiendo los hooks desde la intención del modelo y compilando | `manual/generating-code` + `manual/ai-completion` |
| 4 | El editor gráfico | 4' | Mapa de contextos, vistas y niveles, auto-layout, dibujar una relación y ver el YAML que escribe (`git diff`), inferidos, el explorador; y una captura fija real del mismo editor dentro de IntelliJ | `manual/graphical-editor-guide` |
| 5 | Contextos que hablan entre sí | 4' | Flows y context map; una llamada REST con cliente generado; eventos con outbox y Kafka; una proyección que mantiene un read model; el selector que ese read model da a un formulario de otro contexto | `manual/flows`, `manual/projections` |
| 6 | Reglas del negocio | 3' | Operaciones con estados, invariantes, reglas, la negativa «no se puede … en estado …», event sourcing con su historial en pantalla | `manual/operations`, `manual/event-sourcing` |
| 7 | Workflows y tareas humanas | 4' | Un workflow generado corriendo en EventConductor: tarea de usuario en la bandeja, temporizador/plazo, la decisión que sigue el flujo, el usuario `system` en el historial | `manual/workflows` |
| 8 | Seguridad e identidad | 3' | Roles y permisos explícitos por caso de uso, inicio de sesión (formulario y Keycloak), el gateway, una petición rechazada en servidor | `manual/roles`, `manual/identity` |
| 9 | Desplegar | 3' | `mvn modux:deploy` local (Docker) y a un Kubernetes local (kind); el workflow de CI y Terraform generados; DNS: solo que existe y es opt-in (no se toca DNS real) | `manual/deploying`, `getting-started/cicd` |
| 10 | Los tests que vienen con el sistema | 3' | Tests unitarios y BDD generados en verde; la suite e2e con Playwright recorriendo las pantallas | `manual/e2e-tests` |
| 11 | Partir de lo que ya tienes | 3' | `import-openapi` / `import-asyncapi` de un contrato real a modelo, y el editor enseñándolo | `manual/importers` |
| 12 | Del diseño al código (experimental) | 3' | `figma-maven-plugin`: un fichero de Figma del repo → vistas Mateu generadas → compilan y se ven en marcha. Dicho como experimental y sin publicar; el importador al modelo, como pendiente | página nueva (`manual/figma`) |
| 13 | Documentación que sale del modelo | 2' | `mvn modux:hla`: el documento de arquitectura generado desde el mismo modelo | `manual/generating-code` (o página nueva) |
| 14 | Agentes de IA en tu sistema | 3' | Pendiente de verificar qué genera y arranca (ver arriba) | `manual/ai-agents` |
| 15 | Evolucionar sin romper | 3' | Un cambio de modelo → migración; versión de esquema de un evento y su upcaster en la zona custom; i18n: el mismo sistema en EN y ES | `manual/system-evolution`, `manual/i18n` |

Orden: 1 y 2 como pilotos (fijan estilo, voz y ritmo); luego 3, 4, 5 (el núcleo) y el resto en orden.
Antes del 2 hay que reescribir el quick start; antes del 12, decidir qué se hace con Figma.

## Piloto 1 · modux en 3 minutos

Sistema: Tickets (`media/promo-video/app`), regrabado con modux 0.6.5 y Mateu 3.0-beta.68. Escenas
1–3 son HTML; el resto es captura real. Palabras EN ≈ 400 → ~2:50.

| # | En pantalla (fuente) | Narración EN | Narración ES |
|---|---|---|---|
| 0 | Título: chispa, «modux», «Enterprise systems, model first.» (HTML) | — | — |
| 1 | «How much of your system is actually the business?» → la tarjeta de la spec: un promotor vende entradas; cuatro reglas (HTML) | How much of your system is actually the business? Take a promoter selling concert tickets. A purchase only counts once the payment confirms it. A failed payment puts the tickets back on sale. Every purchase keeps its history, and management wants a dashboard. That's the business. | ¿Cuánto de tu sistema es de verdad el negocio? Piensa en un promotor que vende entradas de conciertos. Una compra solo cuenta cuando el pago la confirma. Si el pago falla, las entradas vuelven a la venta. Cada compra guarda su historial, y dirección quiere un panel. Eso es el negocio. |
| 2 | Las reglas se encogen; alrededor, las piezas de producción (HTML) | Then production adds the rest: APIs, database migrations, messaging that must not lose an event, read models, a gateway, sign-in, screens, containers, pipelines, tests. Weeks of work before the first rule runs. | Luego producción añade el resto: APIs, migraciones, mensajería que no puede perder un evento, modelos de lectura, un gateway, el inicio de sesión, pantallas, contenedores, pipelines, tests. Semanas antes de que corra la primera regla. |
| 3 | El editor real sobre el modelo: actores, cuatro contextos, la pasarela de pago, los flujos (Playwright sobre el editor, en inglés) | With modux you model the business instead. Four bounded contexts, the actors, the card gateway, and how they talk. The editor draws it… | Con modux modelas el negocio. Cuatro contextos, los actores, la pasarela de pago y cómo se hablan. El editor lo dibuja… |
| 4 | El YAML de `purchase.yaml` (fichero real) | …and it's YAML in your repository. Here is the purchase: event-sourced, with operations that say what they mean. | …y es YAML en tu repositorio. Esta es la compra: con event sourcing y operaciones que dicen lo que significan. |
| 5 | `mvn modux:generate` (salida real) y el recuento: 1.739 líneas de modelo → 398 ficheros, 16.943 líneas | One command generates the system: four services, the gateway, the screens, the migrations, Kafka with an outbox, Docker, Kubernetes, CI and tests. Seventeen hundred lines of model, seventeen thousand of code. The same output every time. | Un comando genera el sistema: cuatro servicios, el gateway, las pantallas, las migraciones, Kafka con outbox, Docker, Kubernetes, CI y tests. Mil setecientas líneas de modelo, diecisiete mil de código. Y siempre la misma salida. |
| 6 | `ChargeSteps` (interfaz generada) junto a `DefaultChargeSteps` (zona custom) | The business logic is the only code that's yours. It lives in its own module that generation never touches. If you want, `ai-complete` writes a first version from the intent in the model, and you review it like any other code. | La lógica de negocio es el único código que es tuyo. Vive en su propio módulo, que la generación no toca nunca. Si quieres, `ai-complete` escribe una primera versión a partir de la intención del modelo, y la revisas como cualquier otro código. |
| 7 | `mvn modux:deploy` (salida real) | Deploy it. Locally with Docker, or to Kubernetes. | Despliégalo. En local con Docker, o en Kubernetes. |
| 8 | El sistema en marcha (Playwright): el promotor crea un concierto; un cliente lo elige en el selector y compra tres entradas: PENDING → CONFIRMED; una tarjeta rechazada → REJECTED con el motivo; el historial; el email en Mailpit; el panel | And it runs. A customer picks a concert and buys three tickets: pending, then confirmed when the payment goes through. A declined card leaves the purchase rejected, with the bank's reason, and the tickets back on sale. Every step is in the purchase's history, the email goes out, and the dashboard adds it all up. | Y funciona. Un cliente elige un concierto y compra tres entradas: pendiente, y confirmada cuando el pago pasa. Una tarjeta rechazada deja la compra rechazada, con el motivo del banco, y las entradas otra vez a la venta. Cada paso queda en el historial de la compra, sale el email y el panel lo suma todo. |
| 9 | Cinco líneas de YAML (`genre`) → `generate` → 30 ficheros en tres servicios → la migración | When the business changes, you change the model. Five lines here touch thirty files in three services, and modux writes the migration. | Cuando el negocio cambia, cambias el modelo. Estas cinco líneas tocan treinta ficheros en tres servicios, y modux escribe la migración. |
| 10 | Mosaico con los títulos de los demás capítulos (HTML) | The rest of this series takes each part in turn: the editor, the two zones, contexts and events, workflows, security, deployment, tests. | El resto de la serie va parte por parte: el editor, las dos zonas, los contextos y los eventos, los workflows, la seguridad, el despliegue y los tests. |
| 11 | Cierre: «Model first. Everything else is generated.» · modux.mateu.io · MIT (HTML) | modux. Model first; everything else is generated. Open source, MIT license. Start at modux.mateu.io. | modux. Primero el modelo; todo lo demás se genera. Código abierto, licencia MIT. Empieza en modux.mateu.io. |

## Piloto 2 · De un agregado a una aplicación

Un modelo nuevo y mínimo, escrito para el capítulo (`media/video-series/02-first-app/`): proyecto
`library` en inglés, un servicio, un contexto **Catalog**, un agregado **Book** (`title`, `author`,
`isbn`, `published` fecha, `copies` entero, `price` dinero, `status` enum AVAILABLE/WITHDRAWN).
Todo lo que sale en pantalla es ese repo. Palabras EN ≈ 560 → ~3:45. Lo marcado ⚠ se comprueba al
grabar; si falla, se arregla modux o se quita del guion.

| # | En pantalla (fuente) | Narración EN | Narración ES |
|---|---|---|---|
| 0 | Título: «From one aggregate to a running app» (HTML) | — | — |
| 1 | Un repo vacío: `pom.xml` con el plugin `modux-maven-plugin` 0.6.5 (fichero real) | Let's build an application from nothing. All you need is a Maven project with the modux plugin. | Vamos a construir una aplicación desde cero. Basta un proyecto Maven con el plugin de modux. |
| 2 | `modux/`: `project.yaml`, el contexto, el servicio, `book.yaml` y su modelo (ficheros reales, resaltando campos) | The model lives in a folder called modux, one YAML file per element. A project, a service, a bounded context called Catalog, and one aggregate: a book, with a title, an author, an ISBN, a price and a status. | El modelo vive en una carpeta llamada modux, un fichero YAML por elemento. Un proyecto, un servicio, un contexto llamado Catalog y un agregado: un libro, con título, autor, ISBN, precio y estado. |
| 3 | `mvn modux:validate` con una referencia rota a propósito (salida real: el elemento y el campo) → arreglada → 0 errores | Before generating anything, validate. A typo in an id is caught here, with the element and the field that carry it. Fix it, and the model is clean. | Antes de generar nada, valida. Una errata en un id se detecta aquí, con el elemento y el campo que la contienen. Se corrige, y el modelo queda limpio. |
| 4 | `mvn modux:generate` (salida real) → el árbol generado: capas dominio / aplicación / infraestructura, la UI, la migración, Dockerfile, compose, CI | Now generate. Out comes a Spring Boot service in hexagonal layers: the domain, the use cases, persistence with its migration, a REST API, the screens, and everything to build and run it. | Ahora genera. Sale un servicio Spring Boot por capas hexagonales: el dominio, los casos de uso, la persistencia con su migración, una API REST, las pantallas y todo lo necesario para construirlo y arrancarlo. |
| 5 | `mvn modux:deploy` (salida real): PostgreSQL y el servicio en Docker | One more command builds it and starts it, with its database, in Docker. | Un comando más lo construye y lo arranca, con su base de datos, en Docker. |
| 6 | El navegador (Playwright): inicio de sesión con el usuario de demo del rol, el listado vacío, «New», guardar con campos vacíos → los obligatorios marcados; rellenar, guardar | Here it is. Sign in, and the books are empty. Create one: the required fields are enforced, on screen and in the server. ⚠ | Aquí está. Inicias sesión y no hay libros. Creas uno: los campos obligatorios se exigen, en pantalla y en el servidor. ⚠ |
| 7 | El listado con dos libros, búsqueda, el detalle con el precio como dinero (`40.00`) y el estado | The listing searches, the price reads as money, and the detail shows the whole record. | El listado busca, el precio se lee como dinero y el detalle enseña el registro entero. |
| 8 | `curl` al endpoint REST generado del agregado (salida real) ⚠ | The same book is there for other systems, through the REST API modux generated. | El mismo libro está ahí para otros sistemas, a través de la API REST que generó modux. |
| 9 | Añadir `language` al modelo (`git diff` de 5 líneas) → `generate` → `git diff --stat` del código → la migración `ALTER TABLE …` | Now the business wants the language of each book. Add five lines to the model and generate again. The entity, the API, the form and a new migration follow. | Ahora el negocio quiere el idioma de cada libro. Añades cinco líneas al modelo y vuelves a generar. La entidad, la API, el formulario y una migración nueva vienen detrás. |
| 10 | `deploy` de nuevo → el formulario con el campo nuevo; los libros de antes siguen ahí | Redeploy, and the new field is on the form. The books you already had are still there. | Vuelves a desplegar y el campo nuevo está en el formulario. Los libros que ya tenías siguen ahí. |
| 11 | Cierre: «One aggregate. A running service. Next: the code that's yours.» (HTML) | One aggregate, a running service, and nothing written by hand yet. Next, the code that is yours: business logic, and where it lives. | Un agregado, un servicio en marcha y todavía nada escrito a mano. En el siguiente, el código que es tuyo: la lógica de negocio, y dónde vive. |

## Decisiones (2026-11-14)

El propietario delegó las preguntas abiertas; quedan así:

1. **Docs de lo borrado: se arreglan antes de producir.** El quick start se reescribe con el camino
   real (repo + YAML + editor + plugin de Maven) y es la página del capítulo 2; `mcp-authoring.md` y
   `solutions.md` se retiran (con su entrada en el sidebar); `installation.md` y `AGENTS.md` se
   corrigen; fuera el resto del MCP en el arranque (`--modux.mcp`). Sin esto, los vídeos enlazarían
   a páginas que mienten.
2. **Figma: capítulo 12 al final, como experimental.** Solo `figma-maven-plugin`, construido desde el
   código y dicho así («experimental, sin publicar»); el importador al modelo se nombra como pendiente,
   sin enseñarlo. Antes se escribe su página (`manual/figma.md`, experimental). Enchufar el importador y
   leer el contrato del artefacto de Mateu es trabajo aparte, no requisito del capítulo.
3. **IntelliJ: el editor se graba como componente web** con el pipeline fotograma a fotograma (es el
   mismo que va dentro del IDE), y una captura real y fija del IDE con ese editor dentro, rotulada como
   tal. Nada de grabación de pantalla en tiempo real.
4. **`ai-complete`: una ejecución real capturada una vez y reproducida** (su salida, los ficheros que
   escribió y la compilación en verde), como en el promo. La narración dice que es opt-in y que usa el
   CLI de IA local.
5. **Una sola grabación, con la UI en inglés**; la versión española lleva voz y subtítulos en español.
   Los modelos de demostración están en inglés: una UI en español con etiquetas del modelo en inglés
   quedaría a medias. Excepción: el capítulo 15 enseña el mismo sistema en los dos idiomas, que es su
   tema.
6. **Voces: Kokoro `af_heart` (EN) y `ef_dora` (ES).** Primero una muestra de cada una con un párrafo
   del piloto 1, para el OK del propietario; si Kokoro no instala en local, Piper.
7. **Lista: «modux in N minutes»** (descripción y títulos en EN y ES). Miniaturas con la estética
   oscura del promo: el título del capítulo y un fotograma real.
8. **El capítulo 1 convive con el promo.** La home sigue con el promo (1:54, mudo); el capítulo 1 abre
   la lista y se enlaza desde `getting-started/introduction`.
9. **Kubernetes en un clúster kind local; DNS real, no.** Se cuenta que el DNS es opt-in y qué
   proveedores soporta, sin tocar ninguno.
10. **Ubicación: `docs/design/video-series/`**, como el resto de documentos de diseño de modux.

## Siguientes pasos

1. Arreglar las docs (decisión 1) y el arranque.
2. Muestras de voz EN/ES.
3. Pipeline común (`media/video-series/`: render fotograma a fotograma, narración → duraciones → `.srt`,
   montaje EN/ES) sobre el del promo.
4. Piloto 1 (con Mateu 3.0-beta.68 y modux apuntando a ella) → revisión del propietario → subida tras su OK.
5. Piloto 2, y el resto en el orden de la tabla.
