package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode;

import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelMappingEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.function.Function;

/**
 * Turns a page's designed component tree into the Java expression a generated
 * {@code ComponentTreeSupplier} page returns: every designer kind maps to its Mateu
 * UIDL builder, with the same sample content the designer mocks up, so the deployed
 * page looks like the design.
 *
 * <p>Data-bound kinds wire to the model when the designer connected them: a
 * <b>form</b> with a viewmodel becomes a Mateu {@code Form} whose {@code FormField}s
 * bind to generated page fields; a <b>listing/crud</b> with a query operation becomes
 * a nested {@code ListingBackend} that reads from the generated query service —
 * injected as an {@code ObjectProvider} so the app boots (and the listing says so)
 * while the implementation is still missing from the custom module. Unwired ones
 * keep the honest EmptyState placeholder.
 */
public final class ComponentTreeJava {

    /** Resolvers into the model, provided by the generator (naming included). */
    public record Wiring(
            Function<String, ModelEntity> modelById,
            Function<String, QueryServiceEntity> queryServiceById,
            /** boundedContextId → java package of that context (e.g. {@code minimal.contexto}). */
            Function<String, String> contextPackageByContextId,
            /** a viewmodel field id → the model that owns it. */
            Function<String, ModelEntity> modelByFieldId,
            /** element name → generated Java type name (the generator's own convention). */
            Function<String, String> typeName,
            Function<String, UseCaseEntity> useCaseById,
            /** useCaseId → java package of the context that owns it. */
            Function<String, String> contextPackageByUseCaseId,
            Function<String, PageEntity> pageById,
            Function<String, ModelMappingEntity> mappingById) {}

    public record Tree(String expression, SortedSet<String> imports,
                       List<String> classFields, List<String> nestedClasses,
                       /** supportedActions() + handleAction() bodies, or null when nothing fires actions. */
                       String actionHandler,
                       /** onHydrated() body loading the routed record, or null when the page is no detail target. */
                       String hydration) {}

    public static Tree of(List<UiComponentNodeEntity> content) {
        return of(content, null, null);
    }

    public static Tree of(List<UiComponentNodeEntity> content, Wiring wiring) {
        return of(content, wiring, null);
    }

    /**
     * @param detailSource when this page is the ficha some crud/listing node points at,
     *     that node — its query operation loads the routed record into the page's fields.
     */
    public static Tree of(List<UiComponentNodeEntity> content, Wiring wiring, UiComponentNodeEntity detailSource) {
        var b = new ComponentTreeJava(wiring);
        var expr = content.size() == 1 ? b.expr(content.get(0)) : b.vertical(content);
        var hydration = detailSource == null ? null : b.hydration(detailSource);
        var classFields = new ArrayList<>(b.services.values());
        classFields.addAll(b.bindings.values());
        return new Tree(expr, b.imports, classFields, b.nested, b.actionHandler(), hydration);
    }

    private final SortedSet<String> imports = new TreeSet<>();
    /** Injected collaborators (query services, use cases), keyed by field name. */
    private final Map<String, String> services = new LinkedHashMap<>();
    /** Form binding fields, keyed by field name. */
    private final Map<String, String> bindings = new LinkedHashMap<>();
    private final List<String> nested = new ArrayList<>();
    /** An action-wired use case plus the mapping the node declared for its command. */
    private record ActionWiring(UseCaseEntity useCase, String mappingId) {}

    /** Action-wired use cases, keyed by actionId; cases materialize in actionHandler(). */
    private final Map<String, ActionWiring> actionWirings = new LinkedHashMap<>();
    private final Wiring wiring;

    private ComponentTreeJava(Wiring wiring) {
        this.wiring = wiring;
    }

    private String expr(UiComponentNodeEntity n) {
        var kids = n.children() == null ? List.<UiComponentNodeEntity>of() : n.children();
        return switch (n.kind()) {
            // ---- containers ----
            case "verticalLayout", "app", "appLayout", "tab" -> vertical(kids);
            case "section" -> use("VerticalLayout") + ".builder().spacing(true).content(" +
                    listOf(prepend(text(or(n.title(), "Sección"), "h4"), kids)) + ").build()";
            case "horizontalLayout" -> use("HorizontalLayout") + ".builder().spacing(true).content(" + listOf(map(kids)) + ").build()";
            case "zones" -> use("HorizontalLayout") + ".builder().spacing(true).fullWidth(true).content(" + listOf(map(kids)) + ").build()";
            case "formLayout" -> use("FormLayout") + ".builder().autoResponsive(true).content(" + listOf(map(kids)) + ").build()";
            case "gridLayout" -> use("DashboardLayout") + ".builder().columns(3).items(" + listOf(map(kids)) + ").build()";
            case "dashboardLayout" -> use("DashboardLayout") + ".builder().items(" + listOf(map(kids)) + ").build()";
            case "splitLayout", "split" -> use("SplitLayout") + ".builder().master(" + vertical(kids.subList(0, (kids.size() + 1) / 2)) +
                    ").detail(" + vertical(kids.subList((kids.size() + 1) / 2, kids.size())) + ").build()";
            case "masterDetailLayout" -> use("MasterDetailLayout") + ".builder().master(" +
                    (kids.isEmpty() ? vertical(List.of()) : expr(kids.get(0))) +
                    ").detail(" + vertical(kids.isEmpty() ? kids : kids.subList(1, kids.size())) + ").build()";
            case "tabLayout", "tabs" -> {
                var tabs = new ArrayList<String>();
                var i = 0;
                for (var t : kids) {
                    if (!"tab".equals(t.kind())) continue;
                    tabs.add(use("Tab") + ".builder().label(" + q(or(t.title(), or(t.label(), "Pestaña " + (tabs.size() + 1)))) +
                            ").content(" + expr(t) + ").active(" + (i++ == 0) + ").build()");
                }
                yield use("TabLayout") + ".builder().tabs(" + listOf(tabs) + ").build()";
            }
            case "accordionLayout", "accordion" -> {
                var panels = new ArrayList<String>();
                for (var c : kids) {
                    panels.add(use("AccordionPanel") + ".builder().label(" + q(or(c.title(), or(c.label(), "Sección " + (panels.size() + 1)))) +
                            ").content(" + expr(c) + ").active(" + panels.isEmpty() + ").build()");
                }
                yield use("AccordionLayout") + ".builder().panels(" + listOf(panels) + ").build()";
            }
            case "card" -> use("Card") + ".builder()" +
                    (n.title() != null && !n.title().isBlank() ? ".title(" + text(n.title(), "h5") + ")" : "") +
                    ".content(" + vertical(kids) + ").build()";
            case "boardLayout" -> use("BoardLayout") + ".builder().rows(" + listOf(List.of(
                    "BoardLayoutRow.builder().content(" + listOf(map(kids)) + ").build()")) + ").build()"
                    + hidden(use("BoardLayoutRow"));
            case "foldoutLayout" -> {
                var panels = new ArrayList<String>();
                for (var c : kids) {
                    panels.add(use("FoldoutPanel") + ".builder().title(" + q(or(c.title(), or(c.label(), "Panel " + (panels.size() + 1)))) +
                            ").content(" + expr(c) + ").open(" + panels.isEmpty() + ").build()");
                }
                yield use("FoldoutLayout") + ".builder().panels(" + listOf(panels) + ").build()";
            }
            case "dashboardPanel" -> use("DashboardPanel") + ".builder().title(" + q(or(n.title(), "Panel")) + ")" +
                    (n.params() != null && n.params().get("subtitle") != null ? ".subtitle(" + q(n.params().get("subtitle")) + ")" : "") +
                    ".content(" + vertical(kids) + ").build()";
            case "carouselLayout" -> use("CarouselLayout") + ".builder().content(" + listOf(map(kids)) + ").dots(true).nav(true).build()";
            case "hero" -> use("HeroSection") + ".builder().title(" + q(or(n.title(), "Un titular que vende")) +
                    ").subtitle(" + q(or(n.text(), "El subtítulo que lo explica")) + ").centered(true)" +
                    (kids.isEmpty() ? "" : ".content(" + listOf(map(kids)) + ")") + ".build()";
            case "pageHeader" -> use("HorizontalLayout") + ".builder().spacing(true).content(" +
                    listOf(prepend(text(or(n.title(), "Título de la página"), "h3"), kids)) + ").build()";
            case "toolbar" -> use("HorizontalLayout") + ".builder().spacing(true).content(" +
                    (kids.isEmpty() ? listOf(List.of(button("Acción"))) : listOf(map(kids))) + ").build()";
            case "scoreboard" -> {
                var metrics = new ArrayList<String>();
                for (var c : kids) {
                    if ("kpi".equals(c.kind()) || "stat".equals(c.kind()) || "metricCard".equals(c.kind())) {
                        metrics.add(metricCard(or(c.title(), "KPI")));
                    }
                }
                if (metrics.isEmpty()) {
                    metrics.add(metricCard("KPI"));
                    metrics.add(metricCard("Otro KPI"));
                    metrics.add(metricCard("Un tercero"));
                }
                yield use("Scoreboard") + ".builder().metrics(" + listOf(metrics) + ").build()";
            }
            case "wizard" -> use("VerticalLayout") + ".builder().spacing(true).content(" +
                    listOf(prepend(progressSteps(kids), kids)) + ").build()";
            // ---- display leaves, with the designer's sample content ----
            case "text" -> use("Text") + ".builder().text(" + q(or(n.text(), "Lorem ipsum dolor sit amet, consectetur adipiscing elit.")) + ").build()";
            case "notice" -> use("Notice") + ".builder().text(" + q(or(n.text(), "Un aviso para el usuario")) + ").build()";
            case "banner" -> use("Notice") + ".builder().text(" + q(or(n.text(), or(n.title(), "Banner destacado"))) + ").theme(\"warning\").fullWidth(true).build()";
            case "calloutCard" -> use("CalloutCard") + ".builder().icon(\"💡\").title(" + q(or(n.title(), "Callout")) +
                    ").description(" + q(or(n.text(), "Algo que merece atención especial.")) + ").build()";
            case "bulletedList" -> use("BulletedList") + ".builder().items(List.of(\"Primer punto\", \"Segundo punto\", \"Tercer punto\")).build()" + hidden(useList());
            case "statusList" -> use("StatusList") + ".builder().items(" + listOf(List.of(
                    statusItem("Operativo", "OK"), statusItem("Degradado", "Aviso"), statusItem("Caído", "Error"))) + ").build()";
            case "checklist" -> use("Checklist") + ".builder()" +
                    (n.title() != null && !n.title().isBlank() ? ".title(" + q(n.title()) + ")" : "") + ".items(" + listOf(List.of(
                    checklistItem("Hecho", true), checklistItem("También hecho", true), checklistItem("Pendiente", false))) + ").build()";
            case "fileList" -> use("FileList") + ".builder().files(" + listOf(List.of(
                    use("FileItem") + ".builder().name(\"contrato.pdf\").size(\"1,2 MB\").build()",
                    "FileItem.builder().name(\"foto.png\").size(\"340 KB\").build()")) + ").build()";
            case "separator" -> use("Separator") + ".builder().build()";
            case "entityHeader" -> use("EntityHeader") + ".builder().title(" + q(or(n.title(), "Entidad")) +
                    ").subtitle(" + q(or(n.text(), "metadatos · estado")) + ").build()";
            case "emptyState" -> use("EmptyState") + ".builder().icon(\"🗇\").title(" + q(or(n.title(), or(n.text(), "Nada por aquí todavía"))) + ").build()";
            case "skeleton" -> use("Skeleton") + ".builder().variant(" + use("SkeletonVariant") + ".text).count(3).build()";
            case "progressBar" -> use("ProgressBar") + ".builder().max(100).value(40).build()";
            case "meter" -> use("Meter") + ".builder().label(" + q(or(n.title(), "Medidor")) + ").value(72.0).max(100.0).build()";
            case "taskProgress" -> use("TaskProgress") + ".builder().label(" + q(or(n.title(), "Tareas")) + ").total(5).done(3).build()";
            case "progressSteps" -> progressSteps(List.of());
            case "timeline" -> use("Timeline") + ".builder().items(" + listOf(List.of(
                    timelineItem("t1", "Creado", "hace 2 días"), timelineItem("t2", "Aprobado", "ayer"), timelineItem("t3", "Enviado", "hoy"))) + ").build()";
            case "calendar" -> use("Calendar") + ".builder().month(" + useLocalDate() + ".now().withDayOfMonth(1)).events(" + listOf(List.of(
                    use("CalendarEvent") + ".builder().id(\"e1\").title(" + q(or(n.title(), "Evento")) + ").date(LocalDate.now()).build()")) + ").build()";
            case "kanban" -> use("Kanban") + ".builder().columns(" + listOf(List.of(
                    kanbanColumn("todo", "Por hacer", 2), kanbanColumn("doing", "En curso", 1), kanbanColumn("done", "Hecho", 1))) + ").build()";
            case "gantt" -> use("Gantt") + ".builder().tasks(" + listOf(List.of(
                    ganttTask("g1", "Análisis", 0, 7, 1.0), ganttTask("g2", "Diseño", 5, 14, 0.5), ganttTask("g3", "Construcción", 12, 24, 0.1))) + ").build()";
            case "trendChart" -> use("TrendChart") + ".builder()" +
                    (n.title() != null && !n.title().isBlank() ? ".title(" + q(n.title()) + ")" : "") +
                    ".values(List.of(3.0, 5.0, 4.0, 8.0, 7.0, 10.0)).labels(List.of(\"L\", \"M\", \"X\", \"J\", \"V\", \"S\")).build()" + hidden(useList());
            case "heatmap" -> {
                var cells = new ArrayList<String>();
                var sample = new double[]{3, 6, 2, 8, 5, 1, 7};
                for (var i = 0; i < sample.length; i++) {
                    cells.add(use("HeatCell") + ".builder().date(" + useLocalDate() + ".now().minusDays(" + (sample.length - 1 - i) + ")).value(" + sample[i] + ").build()");
                }
                yield use("Heatmap") + ".builder().cells(" + listOf(cells) + ").build()";
            }
            case "funnel" -> use("Funnel") + ".builder().stages(" + listOf(List.of(
                    funnelStage("Visitas", 100), funnelStage("Interesados", 70), funnelStage("Ofertas", 45), funnelStage("Cierres", 25))) + ").build()";
            case "orgChart" -> use("OrgChart") + ".builder().root(" + use("OrgNode") + ".builder().id(\"root\").title(" + q(or(n.title(), "Dirección")) +
                    ").children(" + listOf(List.of(orgNode("a", "Área A"), orgNode("b", "Área B"))) + ").build()).build()";
            case "featureGrid" -> use("FeatureGrid") + ".builder().columns(3).features(" + listOf(List.of(
                    feature("⚡", "Rápido"), feature("🔒", "Seguro"), feature("🧩", "Modular"))) + ").build()";
            case "testimonials" -> use("Testimonials") + ".builder().items(" + listOf(List.of(
                    use("Testimonial") + ".builder().quote(" + q(or(n.text(), "Nos cambió la forma de trabajar.")) + ").author(\"Cliente contento\").build()")) + ").build()";
            case "faq" -> use("Faq") + ".builder().items(" + listOf(List.of(
                    faqItem("¿Cómo empiezo?", "Creando tu primer proyecto."), faqItem("¿Cuánto cuesta?", "Depende del plan."))) + ").build()";
            case "commentThread" -> use("CommentThread") + ".builder().comments(" + listOf(List.of(
                    comment("c1", "Ana", "Esto está casi listo"), comment("c2", "Luis", "Le doy un repaso y cierro"))) + ").build()";
            case "comparisonCard" -> use("ComparisonCard") + ".builder().title(" + q(or(n.title(), "Comparativa")) +
                    ").leftLabel(\"Básico\").leftValue(\"✓\").rightLabel(\"Pro\").rightValue(\"✓✓\").build()";
            case "kpi", "metricCard" -> metricCard(or(n.title(), "kpi".equals(n.kind()) ? "KPI" : "Métrica"));
            case "stat" -> use("Stat") + ".builder().label(" + q(or(n.title(), "Estadística")) + ").value(\"1.234\").build()";
            // ---- Mateu enterprise/booking wave ----
            case "planningBoard" -> use("PlanningBoard") + ".builder().from(" + useLocalDate() + ".now()).to(LocalDate.now().plusDays(13)).resources(" + listOf(List.of(
                    use("PlanningResource") + ".builder().id(\"r1\").label(\"Recurso A\").build()",
                    "PlanningResource.builder().id(\"r2\").label(\"Recurso B\").build()")) +
                    ").blocks(" + listOf(List.of(
                    use("PlanningBlock") + ".builder().id(\"b1\").resourceId(\"r1\").start(LocalDate.now().plusDays(1)).end(LocalDate.now().plusDays(4)).label(\"Bloque\").build()")) + ").build()";
            case "offerCard" -> use("OfferCard") + ".builder().title(" + q(or(n.title(), "Una oferta irresistible")) +
                    ").subtitle(" + q(or(n.text(), "Lo que la hace especial")) +
                    ").features(List.of(\"Ventaja uno\", \"Ventaja dos\")).priceLabel(\"59 €\").actionLabel(\"Añadir\").build()" + hidden(useList());
            case "addOnPicker" -> use("AddOnPicker") + ".builder().totalLabel(\"Total\").currency(\"€\").items(" + listOf(List.of(
                    use("AddOn") + ".builder().id(\"a1\").icon(\"🧖\").title(\"Spa\").price(25.0).build()",
                    "AddOn.builder().id(\"a2\").icon(\"🍳\").title(\"Desayuno\").price(12.0).build()")) + ").build()";
            case "paymentPicker" -> use("PaymentPicker") + ".builder().methods(" + listOf(List.of(
                    use("PaymentMethod") + ".builder().id(\"card\").label(\"Tarjeta\").build()",
                    "PaymentMethod.builder().id(\"transfer\").label(\"Transferencia\").build()")) +
                    ").confirmLabel(\"Confirmar y pagar\").build()";
            case "pricingTable" -> use("PricingTable") + ".builder().plans(" + listOf(List.of(
                    use("PricingPlan") + ".builder().id(\"basic\").name(\"Básico\").price(\"9 €\").period(\"mes\").features(List.of(\"Una cosa\")).ctaLabel(\"Elegir\").build()",
                    "PricingPlan.builder().id(\"pro\").name(\"Pro\").price(\"29 €\").period(\"mes\").featured(true).features(List.of(\"Una cosa\", \"Otra cosa\")).ctaLabel(\"Elegir\").build()")) + ").build()";
            case "processMonitor" -> use("ProcessMonitor") + ".builder().items(" + listOf(List.of(
                    use("ProcessItem") + ".builder().id(\"p1\").name(\"Nóminas\").ok(12).warnings(0).errors(0).status(\"ok\").build()",
                    "ProcessItem.builder().id(\"p2\").name(\"Facturación\").ok(9).warnings(2).errors(0).status(\"warn\").build()")) + ").build()";
            case "resourceGrid" -> use("ResourceGrid") + ".builder().columns(3).items(" + listOf(List.of(
                    use("ResourceItem") + ".builder().id(\"s1\").title(\"Estándar\").statusLabel(\"disponible\").build()",
                    "ResourceItem.builder().id(\"s2\").title(\"Superior\").statusLabel(\"disponible\").recommended(true).build()",
                    "ResourceItem.builder().id(\"s3\").title(\"Suite\").statusLabel(\"disponible\").build()")) + ").build()";
            case "taskQueue" -> use("TaskQueue") + ".builder().groups(" + listOf(List.of(
                    use("QueueGroup") + ".builder().label(" + q(or(n.title(), "Pendientes")) + ").items(" + listOf(List.of(
                    use("QueueItem") + ".builder().id(\"t1\").title(\"Revisar contrato\").build()",
                    "QueueItem.builder().id(\"t2\").title(\"Llamar al cliente\").build()")) + ").build()")) + ").build()";
            case "ledger" -> use("Ledger") + ".builder().currency(\"€\").totalLabel(\"Total\").total(265.0).lines(" + listOf(List.of(
                    use("LedgerLine") + ".builder().concept(\"Habitación\").amount(240.0).build()",
                    "LedgerLine.builder().concept(\"Spa\").amount(25.0).build()")) + ").build()";
            case "chat" -> n.params() != null && n.params().get("sseUrl") != null
                    ? use("Chat") + ".builder().sseUrl(" + q(n.params().get("sseUrl")) + ")" +
                        (n.params().get("uploadUrl") != null ? ".uploadUrl(" + q(n.params().get("uploadUrl")) + ")" : "") + ".build()"
                    : use("EmptyState") + ".builder().icon(\"💬\").title(\"Chat\").description(" +
                        q("El chat necesita su URL SSE: añade el parámetro sseUrl al nodo") + ").build()";
            case "markdown" -> use("Markdown") + ".builder().markdown(" + q(or(n.text(), "# Título\\n\\nTexto con **negritas**.")) + ").build()";
            case "breadcrumbs" -> use("Breadcrumbs") + ".builder().currentItemText(" + q(or(n.title(), "Aquí")) +
                    ").breadcrumbs(" + listOf(List.of("new " + use("Breadcrumb") + "(\"Inicio\", \"/\")")) + ").build()";
            // ---- interaction leaves ----
            case "button" -> actionButton(or(n.label(), "Botón"), n.useCaseId(), n.mappingId(), null);
            case "fab" -> actionButton("+", n.useCaseId(), n.mappingId(), "border-radius:50%;width:48px;height:48px;font-size:20px");
            case "filterBar" -> use("HorizontalLayout") + ".builder().spacing(true).content(" +
                    listOf(List.of(button("Estado ▾"), button("Fecha ▾"), button("Tipo ▾"))) + ").build()";
            case "menuBar" -> use("HorizontalLayout") + ".builder().spacing(true).content(" +
                    listOf(List.of(button("Inicio"), button("Opciones"))) + ").build()";
            case "appContext" -> button(or(n.label(), "Contexto ▾"));
            // ---- data-bound leaves: wired when the designer connected them ----
            case "form" -> form(n);
            case "field" -> standaloneField(n);
            case "listing" -> listing(n, false);
            case "crud" -> listing(n, true);
            // a kind with no builder of its own: its content still renders (a container from the
            // design contract), else an honest placeholder naming the kind
            default -> kids.isEmpty()
                    ? use("Text") + ".builder().text(" + q("[" + n.kind() + "]") + ").build()"
                    : vertical(kids);
        };
    }

    // ---- data-bound components ----

    /** A form node with a viewmodel: Mateu Form + FormFields bound to generated page fields. */
    private String form(UiComponentNodeEntity n) {
        var model = wiring == null || n.modelId() == null ? null : wiring.modelById().apply(n.modelId());
        if (model == null || model.fields() == null || model.fields().isEmpty()) return unwired(n);
        // children narrow the form to a subset of the viewmodel's fields
        var kids = n.children() == null ? List.<UiComponentNodeEntity>of() : n.children();
        var selected = new ArrayList<ModelFieldEntity>();
        var labelOverride = new LinkedHashMap<String, String>();
        for (var c : kids) {
            if (!"field".equals(c.kind()) || c.fieldId() == null) continue;
            model.fields().stream().filter(f -> c.fieldId().equals(f.id())).findFirst().ifPresent(f -> {
                selected.add(f);
                if (c.label() != null && !c.label().isBlank()) labelOverride.put(f.id(), c.label());
            });
        }
        var fields = selected.isEmpty() ? model.fields().stream().filter(ModelFieldEntity::basicType).toList() : selected;
        if (fields.isEmpty()) return unwired(n);
        var formFields = new ArrayList<String>();
        for (var f : fields) {
            bindingField(f);
            formFields.add(formField(f, labelOverride.get(f.id())));
        }
        // A use case on the form becomes its save button (bindings first: the command reads them)
        var actionId = wireAction(n.useCaseId(), n.mappingId());
        return use("Form", "fluent") + ".builder().title(" + q(or(n.title(), or(n.label(), model.name()))) +
                ").content(" + listOf(formFields) + ")" +
                (actionId == null ? "" : ".buttons(" + listOf(List.of(
                        use("Button") + ".builder().label(\"Guardar\").actionId(" + q(actionId) + ").build()")) + ")") +
                ".build()";
    }

    private String actionButton(String label, String useCaseId, String mappingId, String style) {
        var actionId = wireAction(useCaseId, mappingId);
        return use("Button") + ".builder().label(" + q(label) + ")" +
                (actionId == null ? "" : ".actionId(" + q(actionId) + ")") +
                (style == null ? "" : ".style(" + q(style) + ")") + ".build()";
    }

    /** A loose field node: bound to its viewmodel through a one-field, headerless form. */
    private String standaloneField(UiComponentNodeEntity n) {
        var model = wiring == null || n.fieldId() == null ? null : wiring.modelByFieldId().apply(n.fieldId());
        var field = model == null ? null
                : model.fields().stream().filter(f -> n.fieldId().equals(f.id())).findFirst().orElse(null);
        if (field == null) return unwired(n);
        bindingField(field);
        return use("Form", "fluent") + ".builder().noHeader(true).content(" +
                listOf(List.of(formField(field, n.label()))) + ").build()";
    }

    /** Everything a query-wired node resolves to; null when the node is not (fully) wired. */
    private record QueryWire(QueryServiceEntity qs, io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryOperationEntity op,
                             ModelEntity outModel, String qsType, String rowType, String providerField) {}

    /** Resolves a node's query wiring, registers imports and the injected provider. */
    private QueryWire queryWire(UiComponentNodeEntity n) {
        var qs = wiring == null || n.queryServiceId() == null ? null : wiring.queryServiceById().apply(n.queryServiceId());
        if (qs == null || qs.operations() == null || qs.operations().isEmpty()) return null;
        var op = qs.operations().stream()
                .filter(o -> o.id() != null && o.id().equals(n.queryOperationId()))
                .findFirst().orElse(qs.operations().get(0));
        var outModel = op.outputModelId() == null ? null : wiring.modelById().apply(op.outputModelId());
        var contextPackage = wiring.contextPackageByContextId().apply(qs.boundedContextId());
        if (outModel == null || outModel.fields() == null || contextPackage == null) return null;

        var qsType = wiring.typeName().apply(qs.name());
        var rowType = wiring.typeName().apply(outModel.name());
        imports.add(contextPackage + ".application.query." + qsType);
        imports.add(contextPackage + ".application.query.dto." + rowType);
        imports.add("org.springframework.beans.factory.ObjectProvider");
        // Field injection ON PURPOSE: the App class extends its home page, and an inherited
        // constructor requirement would break that plain `class Home extends X` generation.
        imports.add("org.springframework.beans.factory.annotation.Autowired");
        var providerField = uncap(qsType) + "Provider";
        services.putIfAbsent(providerField, "@Autowired transient ObjectProvider<" + qsType + "> " + providerField + ";");
        return new QueryWire(qs, op, outModel, qsType, rowType, providerField);
    }

    /** The row field that identifies a record: one named «id», or the first basic field. */
    private static ModelFieldEntity rowKeyField(ModelEntity outModel) {
        return outModel.fields().stream()
                .filter(f -> f.basicType() && "id".equalsIgnoreCase(f.name()))
                .findFirst()
                .orElseGet(() -> outModel.fields().stream().filter(ModelFieldEntity::basicType).findFirst().orElse(null));
    }

    /** The fetch statement(s) leaving the operation's rows in {@code all}. */
    private static String fetchAll(QueryWire w) {
        var cardinality = w.op().cardinality() == null ? "Single" : w.op().cardinality().name();
        var opCall = "queryService." + uncap(w.op().name()) + "(null)";
        return switch (cardinality) {
            case "List" -> "            var all = " + opCall + ";";
            case "Page" -> "            var all = " + opCall + ".getContent();";
            default -> "            var one = " + opCall + ";\n" +
                    "            var all = one == null ? List.<" + w.rowType() + ">of() : List.of(one);";
        };
    }

    /** A listing/crud node with a query operation: a nested ListingBackend reading from it. */
    private String listing(UiComponentNodeEntity n, boolean crud) {
        var wire = queryWire(n);
        if (wire == null) return unwired(n);
        var qsType = wire.qsType();
        var rowType = wire.rowType();
        var outModel = wire.outModel();
        var providerField = wire.providerField();
        for (var cls : List.of("NoFilters", "ListingData", "Pageable", "GridColumn", "FieldDataType")) use(cls);
        use("Listing", "fluent");
        use("Trigger", "fluent");
        use("OnLoadTrigger", "fluent");
        use("OnCustomEventTrigger", "fluent");
        imports.add("io.mateu.uidl.annotations.SubscriptionSource");
        imports.add("io.mateu.uidl.interfaces.ListingBackend");
        imports.add("io.mateu.uidl.fluent.TriggersSupplier");

        var className = uniqueNestedName(rowType + (crud ? "Crud" : "Listing"));
        var fetch = fetchAll(wire);
        var columns = new ArrayList<String>();
        for (var f : outModel.fields()) {
            if (!f.basicType()) continue;
            columns.add("GridColumn.builder().id(" + q(f.name()) + ").label(" + q(cap(f.name())) +
                    ").dataType(FieldDataType." + dataType(f) + ").build()");
        }
        if (columns.isEmpty()) return unwired(n);
        var title = or(n.title(), or(n.label(), null));

        // A detail page turns rows into links: selection navigates to the ficha's route + key.
        // Only composed fichas qualify — a plain page never gets the wildcard @Route, so
        // navigating to route/key from here would land on a URL no generated class resolves.
        var detailPage = wiring.pageById() == null || n.detailPageId() == null
                ? null : wiring.pageById().apply(n.detailPageId());
        if (detailPage != null && (detailPage.content() == null || detailPage.content().isEmpty())) {
            detailPage = null;
        }
        var keyField = detailPage == null ? null : rowKeyField(outModel);
        var listingExtras = "";
        var detailHandler = "";
        if (detailPage != null && keyField != null) {
            use("UICommand");
            use("GridLayout", "fluent");
            var route = or(detailPage.route(), "/" + detailPage.id());
            listingExtras = ".gridLayout(GridLayout.table).rowsSelectionEnabled(true).onRowSelectionChangedActionId(\"open-detail\")";
            detailHandler = """

                        @Override
                        public List<String> supportedActions() {
                            var actions = new java.util.ArrayList<>(ListingBackend.super.supportedActions());
                            actions.add("open-detail");
                            return actions;
                        }

                        @Override
                        public boolean supportsAction(String actionId) {
                            return "open-detail".equals(actionId) || ListingBackend.super.supportsAction(actionId);
                        }

                        @Override
                        public Object handleAction(String actionId, HttpRequest httpRequest) {
                            if ("open-detail".equals(actionId)) {
                                var selected = httpRequest.getSelectedRows(%s.class);
                                if (selected == null || selected.isEmpty()) {
                                    return null;
                                }
                                var key = String.valueOf(selected.get(0).%s());
                                return UICommand.navigateTo("%s/" + java.net.URLEncoder.encode(key, java.nio.charset.StandardCharsets.UTF_8));
                            }
                            return ListingBackend.super.handleAction(actionId, httpRequest);
                        }
                """.formatted(rowType, keyField.name(), route);
        }

        nested.add("""
                    /** %s reads from %s.%s — generated from the designed %s node. */
                    @Service
                    @Scope("prototype")
                    public static class %s implements ListingBackend<NoFilters, %s>, ComponentTreeSupplier, TriggersSupplier {

                        private final ObjectProvider<%s> queryServiceProvider;

                        public %s(ObjectProvider<%s> queryServiceProvider) {
                            this.queryServiceProvider = queryServiceProvider;
                        }

                        @Override
                        public ListingData<%s> search(String searchText, NoFilters filters, Pageable pageable, HttpRequest httpRequest) {
                            var queryService = queryServiceProvider == null ? null : queryServiceProvider.getIfAvailable();
                            if (queryService == null) {
                                return new ListingData<>(new io.mateu.uidl.data.Page<>(searchText, pageable.size(), pageable.page(), 0, List.of()),
                                        "Implementa %s en el módulo custom para alimentar este listado.");
                            }
                %s
                            var filtered = searchText == null || searchText.isBlank()
                                    ? all
                                    : all.stream().filter(row -> String.valueOf(row).toLowerCase().contains(searchText.toLowerCase())).toList();
                            var items = filtered.stream().skip((long) pageable.page() * pageable.size()).limit(pageable.size()).toList();
                            return new ListingData<>(new io.mateu.uidl.data.Page<>(searchText, pageable.size(), pageable.page(), filtered.size(), items), "Sin datos.");
                        }
                %s
                        @Override
                        public Component component(HttpRequest httpRequest) {
                            return Listing.builder()%s.searchable(%s)%s.columns(%s).build();
                        }

                        @Override
                        public List<Trigger> triggers(HttpRequest httpRequest) {
                            // load on open, and reload whenever a page action reports changed data
                            return List.of(new OnLoadTrigger("search"),
                                    OnCustomEventTrigger.builder().actionId("search")
                                            .eventName("modux-data-changed")
                                            .source(SubscriptionSource.DOCUMENT).build());
                        }
                    }""".formatted(
                className, qsType, uncap(wire.op().name()), crud ? "crud" : "listing",
                className, rowType,
                qsType,
                className, qsType,
                rowType,
                qsType,
                fetch,
                detailHandler,
                title == null ? "" : ".title(" + q(title) + ")", crud,
                listingExtras,
                listOf(columns).replace("\n                ", "\n                        ")));

        return "new " + className + "(" + providerField + ")";
    }

    /**
     * A node with a use case attached: injects the generated use case, gives the button an
     * actionId, and adds the handleAction case that builds the command from the page's
     * binding fields (by name; anything the form does not edit travels as null).
     */
    private String wireAction(String useCaseId, String mappingId) {
        if (wiring == null || wiring.useCaseById() == null || useCaseId == null || useCaseId.isBlank()) return null;
        var useCase = wiring.useCaseById().apply(useCaseId);
        var contextPackage = useCase == null ? null : wiring.contextPackageByUseCaseId().apply(useCaseId);
        if (useCase == null || contextPackage == null) return null;

        // Mirror the use-case generator's naming exactly: capitalize(name) + folder slug.
        var ucClass = cap(useCase.name()) + "UseCase";
        var cmdClass = cap(useCase.name()) + "Command";
        var ucPackage = contextPackage + ".application.usecases." + useCase.name().toLowerCase().replaceAll("[^a-z0-9]", "");
        imports.add(ucPackage + "." + ucClass);
        imports.add(ucPackage + "." + cmdClass);
        imports.add("org.springframework.beans.factory.annotation.Autowired");
        imports.add("java.util.List");
        use("Message");

        // Field injection so `class Home extends ComposedPage` keeps its no-arg constructor;
        // required=false so the app still boots when the use case lives in another service.
        var field = uncap(ucClass);
        services.putIfAbsent(field, "@Autowired(required = false) transient " + ucClass + " " + field + ";");

        // Same slug but another wiring (a homonym use case, or the same one with a different
        // mapping) must NOT share the actionId — the second button would fire the first wiring.
        var base = "run-" + useCase.name().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        var actionId = base;
        for (var n = 2; conflicts(actionId, useCase, mappingId); n++) actionId = base + "-" + n;
        actionWirings.putIfAbsent(actionId, new ActionWiring(useCase, mappingId));
        return actionId;
    }

    private boolean conflicts(String actionId, UseCaseEntity useCase, String mappingId) {
        var existing = actionWirings.get(actionId);
        return existing != null
                && !(existing.useCase().id().equals(useCase.id())
                        && java.util.Objects.equals(existing.mappingId(), mappingId));
    }

    /**
     * The supportedActions() + handleAction() pair, or null when no node fires actions.
     * Command arguments resolve HERE, once every form has contributed its binding
     * fields — a button may wire a use case before the form that edits its input.
     */
    private String actionHandler() {
        if (actionWirings.isEmpty()) return null;
        var cases = new ArrayList<String>();
        for (var entry : actionWirings.entrySet()) {
            var useCase = entry.getValue().useCase();
            var mapping = entry.getValue().mappingId() == null || wiring.mappingById() == null
                    ? null : wiring.mappingById().apply(entry.getValue().mappingId());
            var ucClass = cap(useCase.name()) + "UseCase";
            var cmdClass = cap(useCase.name()) + "Command";
            var field = uncap(ucClass);
            var args = "";
            if (useCase.inputModelId() != null && !useCase.inputModelId().isBlank()) {
                var inputModel = wiring.modelById().apply(useCase.inputModelId());
                if (inputModel != null && inputModel.fields() != null) {
                    args = String.join(", ", inputModel.fields().stream()
                            .map(f -> argFor(f, mapping)).toList());
                }
            }
            use("UICommand");
            cases.add("""
                                case "%s" -> {
                                    if (%s == null) {
                                        yield Message.warning("No hay implementación de %s en este servicio");
                                    }
                                    %s.handle(new %s(%s));
                                    // the toast, plus the event every wired listing refreshes on
                                    yield List.of(Message.success("%s ejecutado"), UICommand.dispatchEvent("modux-data-changed"));
                                }""".formatted(entry.getKey(), field, ucClass, field, cmdClass, args, cap(useCase.name())));
        }
        return """
                    @Override
                    public List<String> supportedActions() {
                        return List.of(%s);
                    }

                    @Override
                    public Object handleAction(String actionId, HttpRequest httpRequest) {
                        return switch (actionId) {
                %s
                            default -> null;
                        };
                    }""".formatted(
                String.join(", ", actionWirings.keySet().stream().map(ComponentTreeJava::q).toList()),
                String.join("\n", cases));
    }

    /**
     * When this page is the ficha a crud/listing node navigates to: onHydrated() takes the
     * routed key, loads the rows through that node's query operation, and copies the matching
     * record into the page's binding fields — the form opens pre-filled.
     */
    private String hydration(UiComponentNodeEntity detailSource) {
        var wire = queryWire(detailSource);
        if (wire == null || bindings.isEmpty()) return null;
        var keyField = rowKeyField(wire.outModel());
        if (keyField == null) return null;
        var assigns = wire.outModel().fields().stream()
                .filter(f -> f.basicType() && bindings.containsKey(f.name()))
                .map(f -> "                    " + f.name() + " = row." + f.name() + "();")
                .toList();
        if (assigns.isEmpty()) return null;
        imports.add("io.mateu.uidl.interfaces.PostHydrationHandler");
        return """
                    @Override
                    public void onHydrated(HttpRequest httpRequest) {
                        var key = httpRequest.lastPathItem();
                        if (key == null || key.isBlank()) {
                            return;
                        }
                        key = java.net.URLDecoder.decode(key, java.nio.charset.StandardCharsets.UTF_8);
                        var queryService = %s.getIfAvailable();
                        if (queryService == null) {
                            return;
                        }
                %s
                        for (var row : all) {
                            if (key.equals(String.valueOf(row.%s()))) {
                %s
                                return;
                            }
                        }
                    }""".formatted(
                wire.providerField(),
                fetchAll(wire),
                keyField.name(),
                String.join("\n", assigns));
    }

    /**
     * The expression feeding one command field: the mapping's rule decides which page
     * binding travels there (name match is only the fallback when no mapping applies).
     * A declared rule that cannot resolve yields an explicit null — never a name guess.
     */
    private String argFor(ModelFieldEntity target, ModelMappingEntity mapping) {
        if (mapping != null && mapping.rules() != null) {
            var rule = mapping.rules().stream()
                    .filter(r -> target.id().equals(r.targetFieldId()))
                    .findFirst().orElse(null);
            if (rule != null) {
                var sourceModel = mapping.sourceModelId() == null || mapping.sourceModelId().isBlank()
                        ? null : wiring.modelById().apply(mapping.sourceModelId());
                var source = sourceModel == null || sourceModel.fields() == null || rule.sourceFieldId() == null
                        ? null
                        : sourceModel.fields().stream()
                                .filter(f -> rule.sourceFieldId().equals(f.id()))
                                .findFirst().orElse(null);
                return source != null && bindings.containsKey(source.name()) ? source.name() : "null";
            }
        }
        return bindings.containsKey(target.name()) ? target.name() : "null";
    }

    /** The designer left this node unconnected: say exactly what is missing. */
    private String unwired(UiComponentNodeEntity n) {
        var what = switch (n.kind()) {
            case "form" -> "asigna un model al formulario en el diseñador";
            case "field" -> "asigna un campo del viewmodel en el diseñador";
            default -> "asigna un query service y su operación en el diseñador";
        };
        return use("EmptyState") + ".builder().icon(\"🧩\").title(" +
                q(or(n.label(), or(n.title(), n.kind()))) +
                ").description(" + q("Componente «" + n.kind() + "» sin datos: " + what) + ").build()";
    }

    private void bindingField(ModelFieldEntity f) {
        bindings.putIfAbsent(f.name(), javaType(f) + " " + f.name() + ";");
    }

    private String formField(ModelFieldEntity f, String labelOverride) {
        use("FieldDataType");
        return use("FormField") + ".builder().id(" + q(f.name()) + ").label(" +
                q(labelOverride != null && !labelOverride.isBlank() ? labelOverride : cap(f.name())) +
                ").dataType(FieldDataType." + dataType(f) + ").build()";
    }

    private String dataType(ModelFieldEntity f) {
        return f.type() == null ? "string" : f.type().name();
    }

    private String javaType(ModelFieldEntity f) {
        var type = f.type() == null ? "string" : f.type().name();
        return switch (type) {
            case "integer" -> "Integer";
            case "number", "money" -> imp("java.math.BigDecimal");
            case "bool" -> "Boolean";
            case "date" -> imp("java.time.LocalDate");
            case "time" -> imp("java.time.LocalTime");
            case "dateTime" -> imp("java.time.LocalDateTime");
            default -> "String";
        };
    }

    private String imp(String fqn) {
        imports.add(fqn);
        return fqn.substring(fqn.lastIndexOf('.') + 1);
    }

    private String uniqueNestedName(String base) {
        var name = base;
        var i = 2;
        while (nestedNameTaken(name)) name = base + i++;
        return name;
    }

    private boolean nestedNameTaken(String name) {
        return nested.stream().anyMatch(c -> c.contains("class " + name + " "));
    }

    private String use(String cls, String pkg) {
        imports.add("io.mateu.uidl." + pkg + "." + cls);
        return cls;
    }

    private static String uncap(String s) {
        return s.isEmpty() ? s : Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }

    private static String cap(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    // ---- shared fragments ----

    private String vertical(List<UiComponentNodeEntity> items) {
        return use("VerticalLayout") + ".builder().spacing(true).content(" + listOf(map(items)) + ").build()";
    }

    private String text(String value, String container) {
        return use("Text") + ".builder().text(" + q(value) + ").container(" + use("TextContainer") + "." + container + ").build()";
    }

    private String button(String label) {
        return use("Button") + ".builder().label(" + q(label) + ").build()";
    }

    private String metricCard(String title) {
        return use("MetricCard") + ".builder().title(" + q(title) + ").value(\"1.234\").build()";
    }

    private String progressSteps(List<UiComponentNodeEntity> kids) {
        var steps = new ArrayList<String>();
        var titles = kids.stream().map(c -> or(c.title(), or(c.label(), null))).filter(t -> t != null).toList();
        if (titles.isEmpty()) titles = List.of("Paso 1", "Paso 2", "Paso 3");
        for (var i = 0; i < titles.size(); i++) {
            var status = i == 0 ? "done" : i == 1 ? "current" : "upcoming";
            steps.add(use("Step") + ".builder().id(\"s" + (i + 1) + "\").title(" + q(titles.get(i)) + ").status(\"" + status + "\").build()");
        }
        return use("ProgressSteps") + ".builder().steps(" + listOf(steps) + ").build()";
    }

    private String statusItem(String title, String status) {
        return use("StatusItem") + ".builder().title(" + q(title) + ").status(" + q(status) + ").build()";
    }

    private String checklistItem(String label, boolean done) {
        return use("ChecklistItem") + ".builder().label(" + q(label) + ").done(" + done + ").build()";
    }

    private String timelineItem(String id, String title, String timestamp) {
        return use("TimelineItem") + ".builder().id(\"" + id + "\").title(" + q(title) + ").timestamp(" + q(timestamp) + ").build()";
    }

    private String kanbanColumn(String id, String title, int cards) {
        var cardExprs = new ArrayList<String>();
        for (var i = 1; i <= cards; i++) {
            cardExprs.add(use("KanbanCard") + ".builder().id(\"" + id + i + "\").title(\"Tarjeta " + i + "\").build()");
        }
        return use("KanbanColumn") + ".builder().id(\"" + id + "\").title(" + q(title) + ").cards(" + listOf(cardExprs) + ").build()";
    }

    private String ganttTask(String id, String title, int fromDays, int toDays, double progress) {
        return use("GanttTask") + ".builder().id(\"" + id + "\").title(" + q(title) + ").start(" + useLocalDate() + ".now().plusDays(" + fromDays +
                ")).end(LocalDate.now().plusDays(" + toDays + ")).progress(" + progress + ").build()";
    }

    private String funnelStage(String label, double value) {
        return use("FunnelStage") + ".builder().label(" + q(label) + ").value(" + value + ").build()";
    }

    private String orgNode(String id, String title) {
        return use("OrgNode") + ".builder().id(\"" + id + "\").title(" + q(title) + ").build()";
    }

    private String feature(String icon, String title) {
        return use("Feature") + ".builder().icon(" + q(icon) + ").title(" + q(title) + ").build()";
    }

    private String faqItem(String question, String answer) {
        return use("FaqItem") + ".builder().question(" + q(question) + ").answer(" + q(answer) + ").build()";
    }

    private String comment(String id, String author, String textValue) {
        return use("Comment") + ".builder().id(\"" + id + "\").author(" + q(author) + ").text(" + q(textValue) + ").build()";
    }

    // ---- plumbing ----

    private List<String> map(List<UiComponentNodeEntity> items) {
        return items.stream().map(this::expr).toList();
    }

    private List<String> prepend(String first, List<UiComponentNodeEntity> rest) {
        var out = new ArrayList<String>();
        out.add(first);
        out.addAll(map(rest));
        return out;
    }

    private String listOf(List<String> exprs) {
        useList();
        return exprs.isEmpty() ? "List.of()" : "List.of(\n                " + String.join(",\n                ", exprs) + ")";
    }

    private String use(String cls) {
        imports.add("io.mateu.uidl.data." + cls);
        return cls;
    }

    private String useList() {
        imports.add("java.util.List");
        return "";
    }

    private String useLocalDate() {
        imports.add("java.time.LocalDate");
        return "LocalDate";
    }

    /** Registers an import for a class referenced inside an already-built fragment. */
    private String hidden(String ignored) {
        return "";
    }

    private static String or(String v, String fallback) {
        return v != null && !v.isBlank() ? v : fallback;
    }

    private static String q(String s) {
        return '"' + s.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\r", "\\r").replace("\n", "\\n").replace("\t", "\\t") + '"';
    }
}
