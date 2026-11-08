package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import java.util.List;
import java.util.Set;

/**
 * A node of a page's content tree: a Mateu layout (with children) or a leaf component.
 * Configuration is typed (not a map) so CatalogReflection walks the {@code *Id} fields
 * and referential integrity comes for free.
 */
@lombok.Builder(toBuilder = true)
public record UiComponentNodeEntity(
        /** Stable identity — the editor edits, moves and removes nodes by id. */
        String id,
        /** One of {@link #KINDS}: a layout or a component. */
        String kind,
        /** Heading (cards, tabs, metric cards…). */
        String title,
        /** Free text (text components). */
        String text,
        /** Caption (buttons, fields…). */
        String label,
        /** The use case a button fires. */
        String useCaseId,
        /** The model mapping applied when firing the use case. */
        String mappingId,
        /** The viewmodel a form edits. */
        String modelId,
        /** The query service a listing reads from. */
        String queryServiceId,
        String queryOperationId,
        /** The viewmodel field a field component binds to. */
        String fieldId,
        /** Rendering stereotype (fields). */
        String stereotype,
        /** Columns spanned inside a form/grid layout. */
        Integer colspan,
        /** Nested content — layouts are trees. */
        List<UiComponentNodeEntity> children,
        /** The hand-written code this component delegates to (the component is CUSTOM). */
        String customCodeId,
        /**
         * Extra kind-specific parameters (theme, slim, gridLayout…) — the Mateu component
         * catalog's knobs, populated e.g. by the Figma importer from the design contract.
         */
        java.util.Map<String, String> params,
        /** The page a crud/listing row opens when clicked (its ficha). */
        String detailPageId
) {

    /** Backward-compatible constructor (pre-detailPageId callers and stores). */
    public UiComponentNodeEntity(String id, String kind, String title, String text, String label,
                                 String useCaseId, String mappingId, String modelId,
                                 String queryServiceId, String queryOperationId, String fieldId,
                                 String stereotype, Integer colspan,
                                 List<UiComponentNodeEntity> children, String customCodeId,
                                 java.util.Map<String, String> params) {
        this(id, kind, title, text, label, useCaseId, mappingId, modelId, queryServiceId,
                queryOperationId, fieldId, stereotype, colspan, children, customCodeId, params, null);
    }

    /** Backward-compatible constructor (pre-params callers and stores). */
    public UiComponentNodeEntity(String id, String kind, String title, String text, String label,
                                 String useCaseId, String mappingId, String modelId,
                                 String queryServiceId, String queryOperationId, String fieldId,
                                 String stereotype, Integer colspan,
                                 List<UiComponentNodeEntity> children, String customCodeId) {
        this(id, kind, title, text, label, useCaseId, mappingId, modelId, queryServiceId,
                queryOperationId, fieldId, stereotype, colspan, children, customCodeId, null, null);
    }

    /** Backward-compatible constructor (pre-customCodeId callers and stores). */
    public UiComponentNodeEntity(String id, String kind, String title, String text, String label,
                                 String useCaseId, String mappingId, String modelId,
                                 String queryServiceId, String queryOperationId, String fieldId,
                                 String stereotype, Integer colspan,
                                 List<UiComponentNodeEntity> children) {
        this(id, kind, title, text, label, useCaseId, mappingId, modelId, queryServiceId,
                queryOperationId, fieldId, stereotype, colspan, children, null, null, null);
    }

    /** Kinds that lay out other nodes — only these carry children. */
    public static final Set<String> LAYOUT_KINDS = Set.of(
            "verticalLayout", "horizontalLayout", "formLayout", "splitLayout", "tabLayout",
            "tab", "accordionLayout", "card", "gridLayout", "boardLayout", "dashboardLayout",
            "masterDetailLayout", "foldoutLayout", "carouselLayout", "appLayout",
            // Mateu design-contract containers (Figma importer)
            "section", "zones", "wizard", "app", "hero", "toolbar", "scoreboard", "pageHeader",
            // Mateu design-contract v2 containers (io.mateu:mateu-uidl META-INF/mateu/contract.json)
            "accordion", "accordionPanel", "avatarGroup", "boardLayoutItem", "boardLayoutRow",
            "buttonGroup", "confirmDialog", "container", "contentLayout", "contextMenu",
            "dashboardPanel", "details", "dialog", "div", "drawer", "dropZone", "foldoutPanel",
            "formItem", "formRow", "formSection", "formSubSection", "fullWidth", "grid",
            "gridGroupColumn", "popover", "responsiveGrid", "scroller", "slotted", "split", "tabs",
            "tooltip",
            // v2 page templates: the FormTemplates are laid out with the kinds above by the
            // importer; these are the Java-archetype frames, kept as placeholder nodes
            "pageTemplate", "templatePart", "calendarPage", "collectionDetail", "dashboard",
            "dataManagement", "foldout", "ganttPage", "generalOverview", "guidedProcessDrawer",
            "heroSearch", "itemOverview", "smartSearchPage", "todoList", "welcome");

    /** Leaf components. */
    public static final Set<String> COMPONENT_KINDS = Set.of(
            "form", "listing", "button", "field", "text", "metricCard", "menuBar",
            // Mateu design-contract components (see mateu design/figma/contract.json)
            "notice", "bulletedList", "separator", "statusList", "entityHeader", "kpi",
            "taskProgress", "meter", "progressBar", "progressSteps", "banner", "calloutCard",
            "emptyState", "skeleton", "timeline", "kanban", "gantt", "calendar", "stat",
            "trendChart", "heatmap", "funnel", "orgChart", "featureGrid", "testimonials", "faq",
            "commentThread", "fileList", "checklist", "comparisonCard", "crud", "filterBar",
            "fab", "appContext",
            // Mateu's enterprise/booking wave (dispatched components, 2026-07)
            "planningBoard", "offerCard", "addOnPicker", "paymentPicker", "pricingTable",
            "processMonitor", "resourceGrid", "taskQueue", "ledger", "chat", "markdown",
            "breadcrumbs",
            // Mateu design-contract v2 components
            "actionPanel", "anchor", "avatar", "badge", "bpmn", "chart", "cookieConsent",
            "formEditor", "gridColumn", "icon", "image", "map", "matrixGrid", "messageInput",
            "messageList", "notFound", "notification", "recordMerge", "virtualList", "workflow");

    /** Every valid node kind. */
    public static final Set<String> KINDS;

    static {
        var kinds = new java.util.HashSet<>(LAYOUT_KINDS);
        kinds.addAll(COMPONENT_KINDS);
        KINDS = Set.copyOf(kinds);
    }
}
