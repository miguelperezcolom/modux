package io.mateu.modux.modeldrivengenerator.application.usecases.project.generatehla;

import io.mateu.modux.modeldrivengenerator.application.usecases.model.lint.ModelSnapshot;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.decision.vo.DecisionStatus;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.PiiClassification;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.process.vo.ProcessStepType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DeploymentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProcessEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;

import io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold.CrudUseCases;
import io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold.CrudListingQuery;
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiMenuItemEntity;

import java.util.List;
import java.util.Objects;

/**
 * Renders the design document (HLA) of a project FROM the model: prose from {@code objective} and
 * descriptions, the ADR table from {@code decisions}, and every diagram derived — structural view
 * (mermaid flowchart), business processes (mermaid sequence diagrams), aggregate lifecycles
 * (mermaid state diagrams), transversal concerns from the declared flags (what each context puts
 * on the broker, and which publishing services have an outbox), exposed contracts, the deployment
 * when the model declares environments, and open points from PROPOSED decisions. Sections the model
 * has nothing for are left out, and the rest are numbered without gaps.
 *
 * <p>The document the team receives is a <em>report of the model</em>: it cannot drift from the
 * spec because it is generated from it. Pure and deterministic — unit-testable, diff-stable.
 */
public final class HlaDocumentRenderer {

    private HlaDocumentRenderer() {}

    /**
     * The document's own words, in the project's language: English unless the project speaks
     * Spanish — the rule of the generated UI ({@code GenerateCodeUseCase.speaksSpanish}).
     */
    private record Words(boolean es) {
        String t(String spanish, String english) {
            return es ? spanish : english;
        }
    }

    /** Numbers the top-level sections as they are written: a section the model has nothing for leaves no gap. */
    private static final class Sections {
        private int last;

        int next() {
            return ++last;
        }
    }

    public static String render(ModelSnapshot m) {
        var project = m.projects().isEmpty() ? null : m.projects().get(0);
        var w = new Words(project != null && GenerateCodeUseCase.speaksSpanish(project));
        var md = new StringBuilder();
        var n = new Sections();

        md.append("# HLA — ").append(project != null ? project.name() : w.t("modelo", "model")).append("\n\n");
        md.append(w.t("> Documento generado desde el modelo modux — no editar a mano: es un informe de la especificación.\n\n",
                "> Document generated from the modux model — do not edit by hand: it is a report of the specification.\n\n"));

        contextAndObjective(md, project, w, n);
        decisions(md, m, w, n);
        structuralView(md, m, project, w, n);
        var responsibilities = n.next();
        responsibilities(md, m, project, w, responsibilities);
        contextDetails(md, m, project, w, responsibilities);
        processes(md, m, w, n);
        lifecycles(md, m, w, n);
        transversals(md, m, project, w, n);
        contracts(md, m, w, n);
        deployment(md, m, project, w, n);
        openPoints(md, m, w, n);

        return md.toString();
    }

    private static void contextAndObjective(StringBuilder md, ProjectEntity project, Words w, Sections n) {
        md.append("## ").append(n.next()).append(w.t(". Contexto y objetivo\n\n", ". Context and objective\n\n"));
        if (project != null && project.objective() != null && !project.objective().isBlank()) {
            md.append(project.objective().trim()).append("\n\n");
        } else {
            md.append(w.t("_(sin objetivo declarado — rellena `project.objective` en el modelo)_\n\n",
                    "_(no objective declared — fill in `project.objective` in the model)_\n\n"));
        }
    }

    private static void decisions(StringBuilder md, ModelSnapshot m, Words w, Sections n) {
        md.append("## ").append(n.next()).append(w.t(". Decisiones (ADR)\n\n", ". Decisions (ADR)\n\n"));
        if (m.decisions().isEmpty()) {
            md.append(w.t("_Sin decisiones registradas._\n\n", "_No decisions recorded._\n\n"));
            return;
        }
        md.append(w.t("| # | Decisión | Motivo | Estado |\n", "| # | Decision | Rationale | Status |\n")).append("|---|---|---|---|\n");
        var ordered = m.decisions().stream()
                .sorted(java.util.Comparator.comparingInt((io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DecisionEntity d) ->
                        d.id() != null ? d.id().length() : 0)
                        .thenComparing(d -> nvl(d.id())))
                .toList();
        for (var d : ordered) {
            md.append("| ").append(d.id())
                    .append(" | **").append(nvl(d.name())).append("** — ").append(nvl(d.decision()))
                    .append(" | ").append(nvl(d.rationale()))
                    .append(" | ").append(d.status() != null ? d.status().name() : "—")
                    .append(" |\n");
        }
        md.append("\n");
    }

    private static void structuralView(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w, Sections n) {
        md.append("## ").append(n.next()).append(w.t(". Vista estructural", ". Structural view")).append("\n\n```mermaid\nflowchart LR\n");
        var hosted = new java.util.HashSet<String>();
        for (var service : orderedServices(m, project)) {
            md.append("  subgraph ").append(id(service.id())).append("[\"").append(w.t("servicio ", "service ")).append(service.name()).append("\"]\n");
            for (var boundedContextId : contextIdsOf(m, service)) {
                var boundedContext = boundedContextById(m, boundedContextId);
                if (boundedContext == null) continue;
                hosted.add(boundedContextId);
                md.append("    ").append(id(boundedContextId)).append("[\"").append(contextLabel(boundedContext)).append("\"]\n");
            }
            md.append("  end\n");
        }
        // a context no service hosts yet is still part of the system
        for (var boundedContext : orderedContexts(m, project)) {
            if (hosted.contains(boundedContext.id())) continue;
            md.append("  ").append(id(boundedContext.id())).append("[\"").append(contextLabel(boundedContext)).append("\"]\n");
        }
        // the edges are collected first and written once: two menu items or two calls make one line
        var edges = new java.util.LinkedHashSet<String>();
        for (var app : byId(m.uiAdapters(), a -> a.id())) {
            md.append("  ").append(id(app.id())).append("[/\"app ").append(app.name()).append("\"/]\n");
            menuOf(app.menuItems()).stream().map(item -> boundedContextOfMenuItem(m, item))
                    .filter(java.util.Objects::nonNull)
                    .forEach(bc -> edges.add(id(app.id()) + " --> " + id(bc.id())));
        }
        for (var external : byId(m.externalSystems(), e -> e.id())) {
            md.append("  ").append(id(external.id())).append("[[\"").append(external.name()).append("\"]]\n");
        }
        for (var rel : byId(m.contextMapRelations(), r -> r.id())) {
            edges.add(id(rel.sourceBoundedContextId()) + " -->|" + label(rel.type()) + "| " + id(rel.targetBoundedContextId()));
        }
        for (var flow : byId(m.flows(), f -> f.id())) {
            var source = sourceOfFlow(m, flow);
            if (source == null || flow.targetBoundedContextId() == null) continue;
            edges.add(id(source.id()) + " -.->|" + label(flow.triggerEvent()) + "| " + id(flow.targetBoundedContextId()));
        }
        // synchronous calls out of a context: another context's use case or query, an external system
        for (var boundedContext : orderedContexts(m, project)) {
            for (var useCase : nvlList(boundedContext.useCaseIds()).stream().map(ucId -> useCaseById(m, ucId))
                    .filter(java.util.Objects::nonNull).toList()) {
                for (var step : nvlList(useCase.steps())) {
                    if (step.type() == null) continue;
                    switch (step.type()) {
                        case CallUseCase -> {
                            var target = m.boundedContexts().stream()
                                    .filter(bc -> nvlList(bc.useCaseIds()).contains(step.useCaseId())).findFirst().orElse(null);
                            var called = useCaseById(m, step.useCaseId());
                            if (target != null && called != null && !target.id().equals(boundedContext.id())) {
                                edges.add(id(boundedContext.id()) + " -->|" + label(called.name()) + "| " + id(target.id()));
                            }
                        }
                        case CallQueryService -> {
                            var queryService = queryServiceById(m, step.queryServiceId());
                            if (queryService != null && queryService.boundedContextId() != null
                                    && !queryService.boundedContextId().equals(boundedContext.id())) {
                                edges.add(id(boundedContext.id()) + " -->|" + label(queryService.name()) + "| " + id(queryService.boundedContextId()));
                            }
                        }
                        case CallExternalUseCase -> {
                            var external = externalOfUseCase(m, step.externalUseCaseId());
                            if (external != null) {
                                var called = nvlList(external.useCases()).stream()
                                        .filter(u -> Objects.equals(u.id(), step.externalUseCaseId())).findFirst().orElseThrow();
                                edges.add(id(boundedContext.id()) + " -->|" + label(called.name()) + "| " + id(external.id()));
                            }
                        }
                        default -> { }
                    }
                }
            }
        }
        // data a projection copies into a context: another context's aggregate, an external system's
        for (var projection : byId(m.projections(), p -> p.id())) {
            var target = contextOfProjection(m, projection);
            if (target == null) continue;
            String source = null;
            if (projection.sourceAggregateId() != null) {
                var bc = boundedContextOfAggregate(m, projection.sourceAggregateId());
                if (bc != null && !bc.id().equals(target.id())) source = bc.id();
            } else if (projection.sourceExternalUseCaseId() != null) {
                var external = externalOfUseCase(m, projection.sourceExternalUseCaseId());
                if (external != null) source = external.id();
            } else if (projection.sourceExternalTableId() != null) {
                var external = externalOfTable(m, projection.sourceExternalTableId());
                if (external != null) source = external.id();
            }
            if (source != null) edges.add(id(source) + " ==>|" + label(projection.name()) + "| " + id(target.id()));
        }
        edges.forEach(edge -> md.append("  ").append(edge).append("\n"));
        md.append("```\n\n");
        md.append(w.t("_Flechas: continua — relación del mapa de contextos (su tipo) o llamada síncrona (lo que llama); "
                        + "discontinua — evento que lleva un flujo; gruesa — datos que copia una proyección._\n\n",
                "_Arrows: solid — context-map relation (its type) or synchronous call (what it calls); "
                        + "dotted — event carried by a flow; thick — data a projection copies._\n\n"));
    }

    private static void responsibilities(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w, int section) {
        md.append("## ").append(section).append(w.t(". Responsabilidades por contenedor\n\n", ". Responsibilities per container\n\n"));
        md.append(w.t("| Contenedor | Subdominio | Responsabilidad |\n", "| Container | Subdomain | Responsibility |\n")).append("|---|---|---|\n");
        for (var boundedContext : orderedContexts(m, project)) {
            var notes = new StringBuilder(nvl(boundedContext.description()));
            nvlList(boundedContext.bffs()).forEach(b -> notes.append(notes.isEmpty() ? "" : " ")
                    .append("**BFF** ").append(b.name()).append(" (").append(nvl(b.basePath())).append(")."));
            nvlList(boundedContext.acls()).forEach(a -> notes.append(notes.isEmpty() ? "" : " ")
                    .append(w.t("**ACL** hacia ", "**ACL** to ")).append(a.externalSystem()).append("."));
            // "the read side lives elsewhere" — the delegated read side is an architectural fact
            if (boundedContext.readSideBoundedContextId() != null || boundedContext.readSideExternalSystemId() != null) {
                var target = boundedContext.readSideBoundedContextId() != null
                        ? boundedContextById(m, boundedContext.readSideBoundedContextId()) != null
                                ? boundedContextById(m, boundedContext.readSideBoundedContextId()).name() : boundedContext.readSideBoundedContextId()
                        : boundedContext.readSideExternalSystemId();
                notes.append(notes.isEmpty() ? "" : " ").append(w.t("**Lectura delegada** en ", "**Delegated read side** in ")).append(target)
                        .append(boundedContext.readSideVia() != null ? w.t(" vía ", " via ") + boundedContext.readSideVia() : "").append(".");
            }
            md.append("| ").append(boundedContext.name())
                    .append(" | ").append(boundedContext.subdomainType() != null ? boundedContext.subdomainType().name() : "—")
                    .append(" | ").append(notes.isEmpty() ? "—" : notes.toString()).append(" |\n");
        }
        for (var external : byId(m.externalSystems(), e -> e.id())) {
            md.append("| ").append(external.name()).append(w.t(" _(externo)_ | — | ", " _(external)_ | — | "))
                    .append(nvl(external.description())).append(" |\n");
        }
        md.append("\n");
    }

    private static void processes(StringBuilder md, ModelSnapshot m, Words w, Sections n) {
        if (m.processes().isEmpty()) return;
        md.append("## ").append(n.next()).append(w.t(". Procesos de negocio\n\n", ". Business processes\n\n"));
        for (var process : m.processes()) {
            md.append("### ").append(process.name()).append("\n\n");
            if (process.description() != null) md.append(process.description()).append("\n\n");
            if (process.sla() != null) md.append(w.t("_SLA extremo a extremo: ", "_End-to-end SLA: ")).append(process.sla()).append("_\n\n");
            md.append("```mermaid\nsequenceDiagram\n  autonumber\n");
            var owner = boundedContextById(m, process.ownerBoundedContextId());
            var ownerName = owner != null ? owner.name() : nvl(process.ownerBoundedContextId());
            md.append("  participant SAGA as ").append(process.name()).append(" (saga · ").append(ownerName).append(")\n");
            md.append(w.t("  Note over SAGA: arranca con ", "  Note over SAGA: starts on ")).append(nvl(process.triggerEvent())).append("\n");
            for (var step : process.steps()) {
                if (step.type() == ProcessStepType.HUMAN) {
                    var role = nvl(step.roleId());
                    md.append("  SAGA->>").append(id(role)).append(w.t(": tarea '", ": task '")).append(step.name()).append("'");
                    if (step.deadline() != null) md.append(w.t(" (plazo ", " (deadline ")).append(step.deadline()).append(")");
                    md.append("\n");
                    if (step.escalationRoleId() != null) {
                        md.append("  Note over ").append(id(role)).append(w.t(": vencida → escala a ", ": overdue → escalates to "))
                                .append(step.escalationRoleId()).append("\n");
                    }
                } else {
                    var useCase = useCaseById(m, step.useCaseId());
                    var target = useCase != null ? useCase.name() : nvl(step.useCaseId());
                    md.append("  SAGA->>EXEC: ").append(target).append("\n");
                    if (step.compensationUseCaseId() != null && !step.compensationUseCaseId().isBlank()) {
                        var comp = useCaseById(m, step.compensationUseCaseId());
                        md.append(w.t("  Note over EXEC: compensación: ", "  Note over EXEC: compensation: "))
                                .append(comp != null ? comp.name() : step.compensationUseCaseId()).append("\n");
                    }
                }
            }
            var completion = process.onCompletionEventName() != null && !process.onCompletionEventName().isBlank()
                    ? process.onCompletionEventName() : process.name() + "Completed";
            md.append(w.t("  Note over SAGA: publica ", "  Note over SAGA: publishes ")).append(completion).append("\n```\n\n");
        }
    }

    private static void lifecycles(StringBuilder md, ModelSnapshot m, Words w, Sections n) {
        var withLifecycle = m.aggregates().stream().filter(a -> a.lifecycle() != null).toList();
        if (withLifecycle.isEmpty()) return;
        md.append("## ").append(n.next()).append(w.t(". Ciclos de vida\n\n", ". Lifecycles\n\n"));
        for (var aggregate : withLifecycle) {
            var lc = aggregate.lifecycle();
            md.append("### ").append(aggregate.name()).append("\n\n```mermaid\nstateDiagram-v2\n");
            if (lc.initialState() != null) {
                md.append("  [*] --> ").append(lc.initialState()).append("\n");
            }
            for (var t : lc.transitions()) {
                var operation = aggregate.operations().stream()
                        .filter(o -> Objects.equals(o.id(), t.operationId()))
                        .map(o -> o.name()).findFirst().orElse(null);
                md.append("  ").append(t.fromState()).append(" --> ").append(t.toState());
                if (operation != null) md.append(": ").append(operation);
                md.append("\n");
            }
            // terminal states (no outgoing transitions) flow to [*]
            for (var state : lc.states()) {
                boolean hasOutgoing = lc.transitions().stream().anyMatch(t -> state.equals(t.fromState()));
                if (!hasOutgoing) md.append("  ").append(state).append(" --> [*]\n");
            }
            md.append("```\n\n");
        }
    }

    private static void transversals(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w, Sections n) {
        md.append("## ").append(n.next()).append(w.t(". Aspectos transversales\n\n", ". Cross-cutting concerns\n\n"));

        var idempotent = m.useCases().stream().filter(UseCaseEntity::idempotencyEnabled).toList();
        if (!idempotent.isEmpty()) {
            md.append(w.t("- **Idempotencia**: ", "- **Idempotency**: ")).append(idempotent.stream()
                    .map(uc -> uc.name() + w.t(" (clave `", " (key `") + nvl(uc.idempotencyKeyField()) + "`)")
                    .reduce((a, b) -> a + ", " + b).orElse("")).append(".\n");
        }
        var traffic = traffic(m, project);
        events(md, m, traffic, w);
        outbox(md, m, project, traffic, w);
        var piiFields = m.models().stream()
                .flatMap(model -> model.fields() == null ? java.util.stream.Stream.<String>empty() : model.fields().stream()
                        .filter(f -> f.piiClassification() != null && f.piiClassification() != PiiClassification.NONE)
                        .map(f -> model.name() + "." + f.name() + " (" + f.piiClassification()
                                + (f.anonymizationStrategy() != null ? " → " + f.anonymizationStrategy() : "") + ")"))
                .toList();
        if (!piiFields.isEmpty()) {
            md.append("- **PII**: ").append(String.join(", ", piiFields)).append(".\n");
        }
        var tenancy = m.deployments().stream().map(DeploymentEntity::tenancyStrategy)
                .filter(java.util.Objects::nonNull).findFirst().orElse(null);
        if (tenancy != null) {
            md.append("- **Tenancy**: ").append(tenancy.name()).append(".\n");
        }
        for (var boundedContext : m.boundedContexts()) {
            for (var policy : boundedContext.accessPolicies()) {
                md.append(w.t("- **Acceso por datos** (", "- **Data-based access** (")).append(boundedContext.name()).append("): ")
                        .append(policy.name()).append(" — `").append(nvl(policy.expression())).append("`.\n");
            }
            for (var kpi : boundedContext.kpis()) {
                md.append("- **KPI** (").append(boundedContext.name()).append("): ").append(kpi.name())
                        .append(" — ").append(kpi.measure() != null ? kpi.measure().name() : "—")
                        .append(kpi.valueField() != null ? w.t(" de ", " of ") + kpi.valueField() : "")
                        .append(w.t(" por ", " by ")).append(String.join("+", kpi.dimensionFields()))
                        .append(kpi.timeGrain() != null ? " · " + kpi.timeGrain().name() : "").append(".\n");
            }
        }
        var audited = m.aggregates().stream().filter(AggregateEntity::audited).map(AggregateEntity::name).toList();
        if (!audited.isEmpty()) {
            md.append(w.t("- **Auditoría**: ", "- **Audit**: ")).append(String.join(", ", audited)).append(".\n");
        }
        md.append("\n");
    }

    /** How something leaves a context: an event a flow carries, an integration event, an aggregate's state. */
    private enum TrafficKind { FLOW, INTEGRATION, STATE }

    /**
     * Something a context puts on the broker: what (an event, or the aggregate whose state travels),
     * the context it leaves and the contexts it reaches (when the model says), and whether it has a DLQ.
     */
    private record Traffic(TrafficKind kind, String what, String sourceBoundedContextId,
                           java.util.LinkedHashSet<String> targetBoundedContextIds, boolean dlq) {}

    /**
     * Everything the contexts publish, from what the generator turns into broker traffic: a flow's
     * trigger event (always published, with a DLQ — {@code FlowExpander}), a domain event flagged
     * {@code publishAsIntegrationEvent}, an explicit integration event, and the state of an
     * aggregate that a projection copies ({@code AggregateStateProjections}).
     */
    private static List<Traffic> traffic(ModelSnapshot m, ProjectEntity project) {
        var traffic = new java.util.LinkedHashMap<String, Traffic>();
        for (var flow : m.flows()) {
            var source = sourceOfFlow(m, flow);
            if (source == null || flow.triggerEvent() == null) continue;
            var item = traffic.computeIfAbsent(TrafficKind.FLOW + "|" + source.id() + "|" + flow.triggerEvent(),
                    k -> new Traffic(TrafficKind.FLOW, flow.triggerEvent(), source.id(), new java.util.LinkedHashSet<>(), true));
            if (flow.targetBoundedContextId() != null) item.targetBoundedContextIds().add(flow.targetBoundedContextId());
        }
        var carried = traffic.values().stream().map(t -> t.sourceBoundedContextId() + "|" + t.what()).collect(java.util.stream.Collectors.toSet());
        for (var boundedContext : orderedContexts(m, project)) {
            for (var event : nvlList(boundedContext.domainEventIds()).stream()
                    .map(eventId -> m.domainEvents().stream().filter(e -> e.id().equals(eventId)).findFirst().orElse(null))
                    .filter(e -> e != null && e.publishAsIntegrationEvent()).toList()) {
                if (carried.contains(boundedContext.id() + "|" + event.name())) continue;
                traffic.putIfAbsent(TrafficKind.INTEGRATION + "|" + boundedContext.id() + "|" + event.name(),
                        new Traffic(TrafficKind.INTEGRATION, event.name(), boundedContext.id(), new java.util.LinkedHashSet<>(),
                                event.deadLetterQueueEnabled()));
            }
        }
        for (var event : m.integrationEvents()) {
            if (event.boundedContextId() == null || carried.contains(event.boundedContextId() + "|" + event.name())) continue;
            traffic.putIfAbsent(TrafficKind.INTEGRATION + "|" + event.boundedContextId() + "|" + event.name(),
                    new Traffic(TrafficKind.INTEGRATION, event.name(), event.boundedContextId(), new java.util.LinkedHashSet<>(),
                            event.deadLetterQueueEnabled()));
        }
        for (var projection : m.projections()) {
            if (projection.sourceAggregateId() == null || projection.sourceAggregateId().isBlank()) continue;
            var aggregate = m.aggregates().stream().filter(a -> a.id().equals(projection.sourceAggregateId())).findFirst().orElse(null);
            var source = boundedContextOfAggregate(m, projection.sourceAggregateId());
            if (aggregate == null || source == null) continue;
            var item = traffic.computeIfAbsent(TrafficKind.STATE + "|" + source.id() + "|" + aggregate.name(),
                    k -> new Traffic(TrafficKind.STATE, aggregate.name(), source.id(), new java.util.LinkedHashSet<>(), false));
            var target = contextOfProjection(m, projection);
            if (target != null) item.targetBoundedContextIds().add(target.id());
        }
        // in the order of the contexts (the store's order is not meaningful); stable within each
        var contextOrder = orderedContexts(m, project).stream().map(BoundedContextEntity::id).toList();
        java.util.Comparator<String> byContext = java.util.Comparator.comparingInt(bcId ->
                contextOrder.contains(bcId) ? contextOrder.indexOf(bcId) : Integer.MAX_VALUE);
        return traffic.values().stream()
                .map(t -> new Traffic(t.kind(), t.what(), t.sourceBoundedContextId(),
                        t.targetBoundedContextIds().stream().sorted(byContext.thenComparing(java.util.Comparator.naturalOrder()))
                                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new)), t.dlq()))
                .sorted(java.util.Comparator.comparing(Traffic::sourceBoundedContextId, byContext)
                        .thenComparing(Traffic::what))
                .toList();
    }

    private static void events(StringBuilder md, ModelSnapshot m, List<Traffic> traffic, Words w) {
        var events = m.domainEvents();
        if (events.isEmpty() && traffic.isEmpty()) return;
        md.append(w.t("- **Eventos**: ", "- **Events**: ")).append(events.size())
                .append(events.size() == 1 ? w.t(" evento de dominio.", " domain event.") : w.t(" eventos de dominio.", " domain events."));
        var flows = traffic.stream().filter(t -> t.kind() == TrafficKind.FLOW).toList();
        if (!flows.isEmpty()) {
            md.append(flows.size() == 1
                    ? w.t(" Un flujo lleva 1 de ellos por Kafka, con DLQ: ", " A flow carries 1 of them through Kafka, with a DLQ: ")
                    : w.t(" Los flujos llevan " + flows.size() + " de ellos por Kafka, cada uno con DLQ: ",
                            " Flows carry " + flows.size() + " of them through Kafka, each with a DLQ: "))
                    .append(joinTraffic(m, flows, w)).append(".");
        }
        var integration = traffic.stream().filter(t -> t.kind() == TrafficKind.INTEGRATION).toList();
        if (!integration.isEmpty()) {
            md.append(w.t(" Publicados como eventos de integración: ", " Published as integration events: "))
                    .append(joinTraffic(m, integration, w)).append(".");
        }
        var state = traffic.stream().filter(t -> t.kind() == TrafficKind.STATE).toList();
        if (!state.isEmpty()) {
            md.append(state.size() == 1
                    ? w.t(" Una proyección copia el estado de 1 agregado: ", " A projection copies the state of 1 aggregate: ")
                    : w.t(" Las proyecciones copian el estado de " + state.size() + " agregados: ",
                            " Projections copy the state of " + state.size() + " aggregates: "))
                    .append(joinTraffic(m, state, w)).append(".");
        }
        var published = traffic.stream().filter(t -> t.kind() != TrafficKind.STATE)
                .map(t -> t.sourceBoundedContextId() + "|" + t.what()).collect(java.util.stream.Collectors.toSet());
        var publishedNames = traffic.stream().filter(t -> t.kind() != TrafficKind.STATE).map(Traffic::what)
                .collect(java.util.stream.Collectors.toSet());
        long inside = events.stream().filter(e -> {
            var owner = m.boundedContexts().stream().filter(bc -> nvlList(bc.domainEventIds()).contains(e.id())).findFirst().orElse(null);
            return owner != null ? !published.contains(owner.id() + "|" + e.name()) : !publishedNames.contains(e.name());
        }).count();
        if (traffic.stream().noneMatch(t -> t.kind() != TrafficKind.STATE)) {
            if (!events.isEmpty()) md.append(w.t(" Ninguno sale de su contexto.", " None of them leaves its context."));
        } else if (inside == 1) {
            md.append(w.t(" El otro se queda en su contexto.", " The other one stays inside its context."));
        } else if (inside > 1) {
            md.append(w.t(" Los otros " + inside + " se quedan en su contexto.", " The other " + inside + " stay inside their context."));
        }
        md.append("\n");
    }

    /** {@code PurchasePlaced (Sales → Payments), …} — with "(DLQ)" for an integration event that has one. */
    private static String joinTraffic(ModelSnapshot m, List<Traffic> items, Words w) {
        return items.stream().map(t -> {
            var targets = t.targetBoundedContextIds().stream().map(targetId -> nameOf(m, targetId)).toList();
            var route = nameOf(m, t.sourceBoundedContextId())
                    + (targets.isEmpty() ? "" : " → " + String.join(", ", targets));
            return t.what() + " (" + route + (t.kind() == TrafficKind.INTEGRATION && t.dlq() ? ", DLQ" : "") + ")";
        }).collect(java.util.stream.Collectors.joining(", "));
    }

    /**
     * The outbox only matters to the services that publish: those hosting a context that puts
     * something on the broker. A service that publishes nothing is neither praised nor blamed.
     */
    private static void outbox(StringBuilder md, ModelSnapshot m, ProjectEntity project, List<Traffic> traffic, Words w) {
        var publishers = traffic.stream().map(Traffic::sourceBoundedContextId).collect(java.util.stream.Collectors.toSet());
        var publishing = orderedServices(m, project).stream()
                .filter(s -> contextIdsOf(m, s).stream().anyMatch(publishers::contains)).toList();
        if (publishing.isEmpty()) return;
        var withOutbox = publishing.stream().filter(s -> s.outboxEnabled()).map(s -> s.name()).toList();
        var withoutOutbox = publishing.stream().filter(s -> !s.outboxEnabled()).map(s -> s.name()).toList();
        var parts = new java.util.ArrayList<String>();
        if (!withOutbox.isEmpty()) {
            parts.add(joinNames(withOutbox, w) + (withOutbox.size() == 1
                    ? w.t(" guarda cada evento en la misma transacción que el cambio de estado y lo envía un relé",
                            " stores each event in the same transaction as the state change, and a relay sends it")
                    : w.t(" guardan cada evento en la misma transacción que el cambio de estado y lo envía un relé",
                            " store each event in the same transaction as the state change, and a relay sends it")));
        }
        if (!withoutOutbox.isEmpty()) {
            parts.add(joinNames(withoutOutbox, w) + (withoutOutbox.size() == 1
                    ? w.t(" publica directamente", " publishes directly")
                    : w.t(" publican directamente", " publish directly"))
                    + w.t(": un fallo entre guardar y publicar pierde el evento",
                            ": a failure between saving and publishing loses the event"));
        }
        md.append("- **Outbox**: ").append(String.join("; ", parts)).append(".\n");
    }

    /** {@code A}, {@code A and B}, {@code A, B and C} — {@code y} in Spanish. */
    private static String joinNames(List<String> names, Words w) {
        if (names.size() <= 1) return String.join("", names);
        return String.join(", ", names.subList(0, names.size() - 1)) + w.t(" y ", " and ") + names.get(names.size() - 1);
    }

    private static void contracts(StringBuilder md, ModelSnapshot m, Words w, Sections n) {
        md.append("## ").append(n.next()).append(w.t(". Contratos expuestos\n\n", ". Exposed contracts\n\n"));
        for (var app : byId(m.uiAdapters(), a -> a.id())) {
            md.append(w.t("### Aplicación ", "### Application ")).append(app.name()).append("\n\n");
            menuOf(app.menuItems()).forEach(item -> md.append("- ").append(nvl(item.label())).append("\n"));
            md.append("\n");
        }
        for (var api : byId(m.apis(), a -> a.id())) {
            md.append("### API ").append(api.name()).append("\n\n")
                    .append(w.t("| Método | Ruta | Operación |\n", "| Method | Path | Operation |\n")).append("|---|---|---|\n");
            nvlList(api.operations()).forEach(op -> md.append("| ").append(nvl(op.httpMethod())).append(" | `")
                    .append(nvl(op.path())).append("` | ").append(nvl(op.name())).append(" |\n"));
            md.append("\n");
        }
        for (var boundedContext : m.boundedContexts()) {
            for (var bff : nvlList(boundedContext.bffs())) {
                md.append("### ").append(bff.name()).append(" (").append(nvl(bff.basePath())).append(")\n\n");
                if (bff.description() != null) md.append(bff.description()).append("\n\n");
            }
        }
        var exposed = m.useCases().stream()
                .filter(uc -> uc.exposedAsRest() || uc.exposedAsGrpc() || uc.exposedAsMcp())
                .toList();
        if (!exposed.isEmpty()) {
            md.append("| Use case | REST | gRPC | MCP |\n|---|---|---|---|\n");
            for (var uc : exposed) {
                md.append("| ").append(uc.name())
                        .append(" | ").append(uc.exposedAsRest()
                                ? nvl(uc.restHttpMethod()) + " " + nvl(uc.restPath()) : "—")
                        .append(" | ").append(uc.exposedAsGrpc()
                                ? nvl(uc.grpcServiceName()) + "." + nvl(uc.grpcMethodName()) : "—")
                        .append(" | ").append(uc.exposedAsMcp() ? "✓" : "—")
                        .append(" |\n");
            }
            md.append("\n");
        }
    }

    private static void openPoints(StringBuilder md, ModelSnapshot m, Words w, Sections n) {
        md.append("## ").append(n.next()).append(w.t(". Puntos abiertos\n\n", ". Open points\n\n"));
        var open = m.decisions().stream().filter(d -> d.status() == DecisionStatus.PROPOSED).toList();
        if (open.isEmpty()) {
            md.append(w.t("_Ninguno — todas las decisiones registradas están resueltas._\n",
                    "_None — every recorded decision is resolved._\n"));
            return;
        }
        for (var d : open) {
            md.append("1. **").append(nvl(d.name())).append("** — ").append(nvl(d.decision())).append("\n");
        }
    }

    /** One numbered subsection per context under the responsibilities: what it owns and what it reads. */
    private static void contextDetails(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w, int section) {
        int sub = 0;
        for (var boundedContext : orderedContexts(m, project)) {
            md.append("### ").append(section).append(".").append(++sub).append(" ").append(boundedContext.name()).append("\n\n");
            int before = md.length();
            var aggregates = nvlList(boundedContext.aggregateIds()).stream()
                    .map(id -> m.aggregates().stream().filter(a -> a.id().equals(id)).findFirst().orElse(null))
                    .filter(java.util.Objects::nonNull).toList();
            if (!aggregates.isEmpty()) {
                md.append(w.t("**Agregados**\n\n", "**Aggregates**\n\n"));
                aggregates.forEach(a -> md.append("- **").append(a.name()).append("**: ").append(fieldsOf(m, a.modelId())).append("\n"));
                md.append("\n");
            }
            var scaffolded = aggregates.stream().flatMap(a -> CrudUseCases.idsOf(a.id()).stream()).toList();
            var useCases = nvlList(boundedContext.useCaseIds()).stream()
                    .filter(id -> !scaffolded.contains(id)).map(id -> useCaseById(m, id))
                    .filter(java.util.Objects::nonNull).toList();
            if (!useCases.isEmpty()) {
                md.append(w.t("**Casos de uso** (además del CRUD de cada agregado)\n\n| Caso de uso | Qué hace |\n",
                        "**Use cases** (besides each aggregate's CRUD)\n\n| Use case | What it does |\n")).append("|---|---|\n");
                useCases.forEach(uc -> md.append("| ").append(uc.name()).append(" | ").append(behaviourOf(uc)).append(" |\n"));
                md.append("\n");
            }
            var readModels = byId(m.readModels(), rm -> rm.id()).stream()
                    .filter(rm -> boundedContext.id().equals(rm.boundedContextId()) || nvlList(boundedContext.readModelIds()).contains(rm.id()))
                    .toList();
            if (!readModels.isEmpty()) {
                md.append(w.t("**Modelos de lectura**\n\n", "**Read models**\n\n"));
                for (var readModel : readModels) {
                    md.append("- **").append(readModel.name()).append("**");
                    var feeding = m.projections().stream().filter(p -> readModel.id().equals(p.readModelId())).toList();
                    var sources = feeding.stream().map(p -> w.t("proyección ", "projection ") + p.name() + sourceOfProjection(m, p, w)).toList();
                    if (!sources.isEmpty()) md.append(" ← ").append(String.join("; ", sources));
                    if (readModel.description() != null && !readModel.description().isBlank()) md.append(". ").append(oneLine(readModel.description()));
                    md.append("\n");
                }
                md.append("\n");
            }
            // the queries the context answers, besides the listing every aggregate's CRUD has
            var crudListings = m.aggregates().stream().map(a -> CrudListingQuery.idFor(a.id())).collect(java.util.stream.Collectors.toSet());
            var queries = byId(m.queryServices(), qs -> qs.id()).stream()
                    .filter(qs -> boundedContext.id().equals(qs.boundedContextId()) && !crudListings.contains(qs.id())).toList();
            if (!queries.isEmpty()) {
                md.append(w.t("**Consultas**\n\n", "**Queries**\n\n"));
                for (var queryService : queries) {
                    var operations = nvlList(queryService.operations()).stream().map(op -> {
                        var shape = new java.util.ArrayList<String>();
                        if (op.groupBy() != null && !op.groupBy().isBlank()) shape.add(w.t("agrupado por `", "grouped by `") + op.groupBy() + "`");
                        if (op.filter() != null && !op.filter().isBlank()) shape.add(w.t("solo `", "only `") + op.filter() + "`");
                        var output = modelName(m, op.outputModelId());
                        return nvl(op.name()) + (output != null ? " → " + output : "")
                                + (shape.isEmpty() ? "" : " (" + String.join(", ", shape) + ")");
                    }).toList();
                    md.append("- **").append(queryService.name()).append("**")
                            .append(operations.isEmpty() ? "" : ": " + String.join("; ", operations)).append("\n");
                }
                md.append("\n");
            }
            if (md.length() == before) {
                md.append(w.t("_Sin agregados, casos de uso, modelos de lectura ni consultas propios._\n\n",
                        "_No aggregates, use cases, read models or queries of its own._\n\n"));
            }
        }
    }

    /** Where a projection's data comes from: {@code : state of Concert (Catalog)}, {@code : table venues of Legacy}… */
    private static String sourceOfProjection(ModelSnapshot m, io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEntity p, Words w) {
        if (p.sourceAggregateId() != null) {
            var aggregate = m.aggregates().stream().filter(a -> a.id().equals(p.sourceAggregateId())).findFirst().orElse(null);
            var bc = boundedContextOfAggregate(m, p.sourceAggregateId());
            return w.t(": estado de ", ": state of ") + (aggregate != null ? aggregate.name() : p.sourceAggregateId())
                    + (bc != null ? " (" + bc.name() + ")" : "");
        }
        if (p.sourceExternalUseCaseId() != null) {
            var external = externalOfUseCase(m, p.sourceExternalUseCaseId());
            var useCase = external == null ? null : nvlList(external.useCases()).stream()
                    .filter(u -> Objects.equals(u.id(), p.sourceExternalUseCaseId())).findFirst().orElse(null);
            return ": `" + (useCase != null ? useCase.name() : p.sourceExternalUseCaseId()) + "`"
                    + (external != null ? w.t(" de ", " of ") + external.name() : "");
        }
        if (p.sourceExternalTableId() != null) {
            var external = externalOfTable(m, p.sourceExternalTableId());
            var table = external == null ? null : nvlList(external.tables()).stream()
                    .filter(t -> Objects.equals(t.id(), p.sourceExternalTableId())).findFirst().orElse(null);
            return w.t(": tabla `", ": table `") + (table != null ? table.name() : p.sourceExternalTableId()) + "`"
                    + (external != null ? w.t(" de ", " of ") + external.name() : "");
        }
        var handled = nvlList(p.handlers()).size();
        return handled == 0 ? "" : w.t(": " + handled + " eventos", ": " + handled + " events");
    }

    /** Where the system runs — only when the model declares environments. */
    private static void deployment(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w, Sections n) {
        var deployment = m.deployments().stream()
                .filter(d -> project == null || project.id() == null || project.id().equals(d.projectId()))
                .filter(d -> !d.environments().isEmpty()).findFirst().orElse(null);
        if (deployment == null) return;
        md.append("## ").append(n.next()).append(w.t(". Despliegue\n\n", ". Deployment\n\n"));
        if (deployment.dockerRegistry() != null && !deployment.dockerRegistry().isBlank()) {
            md.append(w.t("Las imágenes se publican en `", "Images are pushed to `")).append(deployment.dockerRegistry()).append("`.");
        }
        var providers = new java.util.ArrayList<String>();
        addProvider(providers, w.t("base de datos", "database"), deployment.database());
        addProvider(providers, w.t("broker", "broker"), deployment.messageBrokerType());
        addProvider(providers, w.t("identidad", "identity"), deployment.iamProvider());
        addProvider(providers, w.t("caché", "cache"), deployment.cacheProvider());
        addProvider(providers, w.t("ficheros", "files"), deployment.fileStorageProvider());
        addProvider(providers, w.t("correo", "email"), deployment.emailProvider());
        addProvider(providers, w.t("secretos", "secrets"), deployment.secretsProvider());
        addProvider(providers, w.t("trazas", "tracing"), deployment.tracingProvider());
        addProvider(providers, w.t("métricas", "metrics"), deployment.metricsProvider());
        addProvider(providers, w.t("logs", "logging"), deployment.loggingProvider());
        addProvider(providers, "LLM", deployment.llmProvider());
        if (!providers.isEmpty()) {
            md.append(md.charAt(md.length() - 1) == '.' ? " " : "").append(w.t("Proveedores: ", "Providers: "))
                    .append(String.join(", ", providers)).append(".");
        }
        if (md.charAt(md.length() - 1) == '.') md.append("\n\n");
        md.append(w.t("| Entorno | Destino | Dónde | Entrada |\n", "| Environment | Target | Where | Ingress |\n")).append("|---|---|---|---|\n");
        for (var env : deployment.environments()) {
            if (env.environment() == null) continue;
            // the same rule the generator applies (GenerateCodeUseCase's deploy targets)
            var target = env.deployTarget() != null && !env.deployTarget().isBlank() ? env.deployTarget().toUpperCase()
                    : (env.kubernetesContext() != null && !env.kubernetesContext().isBlank() ? "KUBERNETES" : "DOCKER");
            var where = new java.util.ArrayList<String>();
            if ("KUBERNETES".equals(target)) {
                if (env.kubernetesNamespace() != null && !env.kubernetesNamespace().isBlank()) where.add(w.t("namespace `", "namespace `") + env.kubernetesNamespace() + "`");
                if (env.kubernetesContext() != null && !env.kubernetesContext().isBlank()) where.add(w.t("contexto `", "context `") + env.kubernetesContext() + "`");
            } else {
                where.add("docker compose");
            }
            var ingress = new java.util.ArrayList<String>();
            if (env.ingressDomain() != null && !env.ingressDomain().isBlank()) ingress.add("`" + env.ingressDomain().trim() + "`");
            if (Boolean.TRUE.equals(env.ingressTlsEnabled())) ingress.add("TLS" + (env.certIssuer() != null ? " (" + env.certIssuer() + ")" : ""));
            if (env.dnsProvider() != null && !env.dnsProvider().isBlank()) ingress.add("DNS " + env.dnsProvider());
            md.append("| ").append(env.environment()).append(" | ").append(target.equals("KUBERNETES") ? "Kubernetes" : "Docker")
                    .append(" | ").append(where.isEmpty() ? "—" : String.join(" · ", where))
                    .append(" | ").append(ingress.isEmpty() ? "—" : String.join(" · ", ingress)).append(" |\n");
        }
        md.append("\n");
        var services = orderedServices(m, project);
        if (!services.isEmpty()) {
            md.append(w.t("Cada entorno ejecuta todos los servicios:\n\n| Servicio | Puerto | Contextos |\n",
                    "Every environment runs every service:\n\n| Service | Port | Contexts |\n")).append("|---|---|---|\n");
            for (var service : services) {
                var contexts = contextIdsOf(m, service).stream().map(bcId -> {
                    var bc = boundedContextById(m, bcId);
                    return bc != null ? bc.name() : bcId;
                }).toList();
                md.append("| ").append(service.name()).append(" | ").append(service.port() != null ? service.port().toString() : "—")
                        .append(" | ").append(contexts.isEmpty() ? "—" : String.join(", ", contexts)).append(" |\n");
            }
            md.append("\n");
        }
    }

    private static void addProvider(List<String> providers, String what, Object value) {
        if (value != null && !value.toString().isBlank()) providers.add(what + " " + value);
    }

    // --- helpers ----------------------------------------------------------------

    /** The services in the order the project lists them (the store's order is not meaningful). */
    private static List<io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity> orderedServices(ModelSnapshot m, ProjectEntity project) {
        var order = project != null && project.serviceIds() != null ? project.serviceIds() : List.<String>of();
        return m.services().stream()
                .sorted(java.util.Comparator.comparingInt(s -> order.contains(s.id()) ? order.indexOf(s.id()) : Integer.MAX_VALUE))
                .toList();
    }

    /** The contexts in the order of the services that host them, then any unhosted one. */
    private static List<BoundedContextEntity> orderedContexts(ModelSnapshot m, ProjectEntity project) {
        var ids = new java.util.LinkedHashSet<String>();
        orderedServices(m, project).forEach(s -> ids.addAll(contextIdsOf(m, s)));
        var ordered = new java.util.ArrayList<BoundedContextEntity>();
        ids.forEach(bcId -> {
            var bc = boundedContextById(m, bcId);
            if (bc != null) ordered.add(bc);
        });
        m.boundedContexts().stream().filter(bc -> !ids.contains(bc.id())).forEach(ordered::add);
        return ordered;
    }

    /** The contexts a service hosts, through its modules. */
    private static List<String> contextIdsOf(ModelSnapshot m, io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity service) {
        return nvlList(service.moduleIds()).stream()
                .map(mid -> m.modules().stream().filter(mm -> mm.id().equals(mid)).findFirst().orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity::boundedContextId)
                .filter(java.util.Objects::nonNull)
                .distinct().toList();
    }

    private static String contextLabel(BoundedContextEntity boundedContext) {
        return boundedContext.name() + (boundedContext.subdomainType() != null ? " · " + boundedContext.subdomainType().name() : "");
    }

    /** The context a flow leaves: its trigger aggregate's, or the one owning its trigger domain service or use case. */
    private static BoundedContextEntity sourceOfFlow(ModelSnapshot m, io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity flow) {
        var byAggregate = boundedContextOfAggregate(m, flow.triggerAggregateId());
        if (byAggregate != null) return byAggregate;
        if (flow.triggerDomainServiceId() != null) {
            return m.boundedContexts().stream().filter(bc -> nvlList(bc.domainServiceIds()).contains(flow.triggerDomainServiceId()))
                    .findFirst().orElse(null);
        }
        if (flow.triggerUseCaseId() != null) {
            return m.boundedContexts().stream().filter(bc -> nvlList(bc.useCaseIds()).contains(flow.triggerUseCaseId()))
                    .findFirst().orElse(null);
        }
        return null;
    }

    /** The context a projection writes into: the one listing it, else its read model's. */
    private static BoundedContextEntity contextOfProjection(ModelSnapshot m, io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEntity projection) {
        var listing = m.boundedContexts().stream().filter(bc -> nvlList(bc.projectionIds()).contains(projection.id())).findFirst().orElse(null);
        if (listing != null) return listing;
        return m.readModels().stream().filter(rm -> rm.id().equals(projection.readModelId())).findFirst()
                .map(rm -> rm.boundedContextId() == null ? null : boundedContextById(m, rm.boundedContextId())).orElse(null);
    }

    private static io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemEntity externalOfUseCase(ModelSnapshot m, String externalUseCaseId) {
        if (externalUseCaseId == null) return null;
        return m.externalSystems().stream()
                .filter(e -> nvlList(e.useCases()).stream().anyMatch(u -> externalUseCaseId.equals(u.id())))
                .findFirst().orElse(null);
    }

    private static io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemEntity externalOfTable(ModelSnapshot m, String tableId) {
        if (tableId == null) return null;
        return m.externalSystems().stream()
                .filter(e -> nvlList(e.tables()).stream().anyMatch(t -> tableId.equals(t.id())))
                .findFirst().orElse(null);
    }

    private static io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryServiceEntity queryServiceById(ModelSnapshot m, String id) {
        if (id == null) return null;
        return m.queryServices().stream().filter(qs -> qs.id().equals(id)).findFirst().orElse(null);
    }

    /** The name of a context or, when a flow targets one, of an external system; else the id itself. */
    private static String nameOf(ModelSnapshot m, String id) {
        var boundedContext = boundedContextById(m, id);
        if (boundedContext != null) return boundedContext.name();
        return m.externalSystems().stream().filter(e -> Objects.equals(e.id(), id)).findFirst()
                .map(e -> e.name()).orElse(id);
    }

    private static String modelName(ModelSnapshot m, String modelId) {
        if (modelId == null) return null;
        return m.models().stream().filter(model -> model.id().equals(modelId)).findFirst().map(model -> model.name()).orElse(null);
    }

    /** The elements by id: the store's order is not meaningful, the document's must be stable. */
    private static <T> List<T> byId(List<T> elements, java.util.function.Function<T, String> id) {
        return elements.stream().sorted(java.util.Comparator.comparing(e -> nvl(id.apply(e)))).toList();
    }

    /** A mermaid edge label: no characters that close it. */
    private static String label(String text) {
        return text == null ? "" : text.replaceAll("[|\"\\[\\]{}()<>]", " ").trim();
    }

    private static String fieldsOf(ModelSnapshot m, String modelId) {
        return m.models().stream().filter(model -> model.id().equals(modelId)).findFirst()
                .map(model -> nvlList(model.fields()).stream().map(f -> f.name()).collect(java.util.stream.Collectors.joining(", ")))
                .orElse("—");
    }

    /** What the use case is for: its description, or else the intent modelled on its steps. */
    private static String behaviourOf(UseCaseEntity useCase) {
        if (useCase.description() != null && !useCase.description().isBlank()) return oneLine(useCase.description());
        var intents = nvlList(useCase.steps()).stream().map(step -> step.intent())
                .filter(intent -> intent != null && !intent.isBlank()).map(HlaDocumentRenderer::oneLine)
                .collect(java.util.stream.Collectors.joining(" "));
        return intents.isEmpty() ? "—" : intents;
    }

    private static String oneLine(String text) {
        return text.replaceAll("\\s+", " ").replace("|", "\\|").trim();
    }

    private static List<UiMenuItemEntity> menuOf(List<UiMenuItemEntity> items) {
        return nvlList(items).stream().flatMap(item -> java.util.stream.Stream.concat(
                java.util.stream.Stream.of(item), menuOf(item.children()).stream())).toList();
    }

    private static BoundedContextEntity boundedContextOfMenuItem(ModelSnapshot m, UiMenuItemEntity item) {
        if (item.aggregateId() != null) return boundedContextOfAggregate(m, item.aggregateId());
        if (item.queryServiceId() != null) {
            var queryService = queryServiceById(m, item.queryServiceId());
            return queryService == null || queryService.boundedContextId() == null ? null
                    : boundedContextById(m, queryService.boundedContextId());
        }
        return item.useCaseId() == null ? null : m.boundedContexts().stream()
                .filter(bc -> nvlList(bc.useCaseIds()).contains(item.useCaseId())).findFirst().orElse(null);
    }

    private static BoundedContextEntity boundedContextById(ModelSnapshot m, String id) {
        return m.boundedContexts().stream().filter(mod -> mod.id().equals(id)).findFirst().orElse(null);
    }

    private static BoundedContextEntity boundedContextOfAggregate(ModelSnapshot m, String aggregateId) {
        if (aggregateId == null) return null;
        return m.boundedContexts().stream()
                .filter(mod -> mod.aggregateIds() != null && mod.aggregateIds().contains(aggregateId))
                .findFirst().orElse(null);
    }

    private static UseCaseEntity useCaseById(ModelSnapshot m, String id) {
        if (id == null) return null;
        return m.useCases().stream().filter(uc -> uc.id().equals(id)).findFirst().orElse(null);
    }

    /** Mermaid-safe node id. */
    private static String id(String raw) {
        return raw == null ? "unknown" : raw.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private static String nvl(String s) {
        return s == null ? "" : s;
    }

    private static <T> List<T> nvlList(List<T> list) {
        return list != null ? list : List.of();
    }
}
