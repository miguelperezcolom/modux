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
import io.mateu.modux.modeldrivengenerator.application.usecases.project.generatecode.GenerateCodeUseCase;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiMenuItemEntity;

import java.util.List;
import java.util.Objects;

/**
 * Renders the design document (HLA) of a project FROM the model: prose from {@code objective} and
 * descriptions, the ADR table from {@code decisions}, and every diagram derived — structural view
 * (mermaid flowchart), business processes (mermaid sequence diagrams), aggregate lifecycles
 * (mermaid state diagrams), transversal concerns from the declared flags, exposed contracts, and
 * open points from PROPOSED decisions.
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

    public static String render(ModelSnapshot m) {
        var project = m.projects().isEmpty() ? null : m.projects().get(0);
        var w = new Words(project != null && GenerateCodeUseCase.speaksSpanish(project));
        var md = new StringBuilder();

        md.append("# HLA — ").append(project != null ? project.name() : w.t("modelo", "model")).append("\n\n");
        md.append(w.t("> Documento generado desde el modelo modux — no editar a mano: es un informe de la especificación.\n\n",
                "> Document generated from the modux model — do not edit by hand: it is a report of the specification.\n\n"));

        contextAndObjective(md, project, w);
        decisions(md, m, w);
        structuralView(md, m, project, w);
        responsibilities(md, m, project, w);
        contextDetails(md, m, w);
        processes(md, m, w);
        lifecycles(md, m, w);
        transversals(md, m, project, w);
        contracts(md, m, w);
        openPoints(md, m, w);

        return md.toString();
    }

    // --- §1 -------------------------------------------------------------------

    private static void contextAndObjective(StringBuilder md, ProjectEntity project, Words w) {
        md.append(w.t("## 1. Contexto y objetivo\n\n", "## 1. Context and objective\n\n"));
        if (project != null && project.objective() != null && !project.objective().isBlank()) {
            md.append(project.objective().trim()).append("\n\n");
        } else {
            md.append(w.t("_(sin objetivo declarado — rellena `project.objective` en el modelo)_\n\n",
                    "_(no objective declared — fill in `project.objective` in the model)_\n\n"));
        }
    }

    // --- §2 -------------------------------------------------------------------

    private static void decisions(StringBuilder md, ModelSnapshot m, Words w) {
        md.append(w.t("## 2. Decisiones (ADR)\n\n", "## 2. Decisions (ADR)\n\n"));
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

    // --- §3 -------------------------------------------------------------------

    private static void structuralView(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w) {
        md.append(w.t("## 3. Vista estructural", "## 3. Structural view")).append("\n\n```mermaid\nflowchart LR\n");
        for (var service : m.services()) {
            md.append("  subgraph ").append(id(service.id())).append("[\"").append(w.t("servicio ", "service ")).append(service.name()).append("\"]\n");
            for (var boundedContextId : nvlList(service.moduleIds()).stream()
                    .map(mid -> m.modules().stream().filter(mm -> mm.id().equals(mid)).findFirst().orElse(null))
                    .filter(java.util.Objects::nonNull)
                    .map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity::boundedContextId)
                    .distinct().toList()) {
                var boundedContext = boundedContextById(m, boundedContextId);
                if (boundedContext == null) continue;
                var label = boundedContext.name() + (boundedContext.subdomainType() != null ? " · " + boundedContext.subdomainType().name() : "");
                md.append("    ").append(id(boundedContextId)).append("[\"").append(label).append("\"]\n");
            }
            md.append("  end\n");
        }
        for (var app : m.uiAdapters()) {
            md.append("  ").append(id(app.id())).append("[/\"app ").append(app.name()).append("\"/]\n");
            menuOf(app.menuItems()).stream().map(item -> boundedContextOfMenuItem(m, item))
                    .filter(java.util.Objects::nonNull).distinct()
                    .forEach(bc -> md.append("  ").append(id(app.id())).append(" --> ").append(id(bc.id())).append("\n"));
        }
        for (var external : m.externalSystems()) {
            md.append("  ").append(id(external.id())).append("[[\"").append(external.name()).append("\"]]\n");
        }
        for (var rel : m.contextMapRelations()) {
            md.append("  ").append(id(rel.sourceBoundedContextId())).append(" -->|").append(nvl(rel.type()))
                    .append("| ").append(id(rel.targetBoundedContextId())).append("\n");
        }
        for (var flow : m.flows()) {
            var source = boundedContextOfAggregate(m, flow.triggerAggregateId());
            if (source == null || flow.targetBoundedContextId() == null) continue;
            md.append("  ").append(id(source.id())).append(" -.->|").append(nvl(flow.triggerEvent()))
                    .append("| ").append(id(flow.targetBoundedContextId())).append("\n");
        }
        md.append("```\n\n");
    }

    // --- §4 -------------------------------------------------------------------

    private static void responsibilities(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w) {
        md.append(w.t("## 4. Responsabilidades por contenedor\n\n", "## 4. Responsibilities per container\n\n"));
        md.append(w.t("| Contenedor | Subdominio | Responsabilidad |\n", "| Container | Subdomain | Responsibility |\n")).append("|---|---|---|\n");
        for (var boundedContext : m.boundedContexts()) {
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
        for (var external : m.externalSystems()) {
            md.append("| ").append(external.name()).append(w.t(" _(externo)_ | — | ", " _(external)_ | — | "))
                    .append(nvl(external.description())).append(" |\n");
        }
        md.append("\n");
    }

    // --- §5 -------------------------------------------------------------------

    private static void processes(StringBuilder md, ModelSnapshot m, Words w) {
        if (m.processes().isEmpty()) return;
        md.append(w.t("## 5. Procesos de negocio\n\n", "## 5. Business processes\n\n"));
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

    // --- §6 -------------------------------------------------------------------

    private static void lifecycles(StringBuilder md, ModelSnapshot m, Words w) {
        var withLifecycle = m.aggregates().stream().filter(a -> a.lifecycle() != null).toList();
        if (withLifecycle.isEmpty()) return;
        md.append(w.t("## 6. Ciclos de vida\n\n", "## 6. Lifecycles\n\n"));
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

    // --- §7 -------------------------------------------------------------------

    private static void transversals(StringBuilder md, ModelSnapshot m, ProjectEntity project, Words w) {
        md.append(w.t("## 7. Aspectos transversales\n\n", "## 7. Cross-cutting concerns\n\n"));

        var idempotent = m.useCases().stream().filter(UseCaseEntity::idempotencyEnabled).toList();
        if (!idempotent.isEmpty()) {
            md.append(w.t("- **Idempotencia**: ", "- **Idempotency**: ")).append(idempotent.stream()
                    .map(uc -> uc.name() + w.t(" (clave `", " (key `") + nvl(uc.idempotencyKeyField()) + "`)")
                    .reduce((a, b) -> a + ", " + b).orElse("")).append(".\n");
        }
        var events = m.domainEvents();
        if (!events.isEmpty()) {
            long published = events.stream().filter(e -> e.publishAsIntegrationEvent()).count();
            long dlq = events.stream().filter(e -> e.deadLetterQueueEnabled()).count();
            md.append(w.t("- **Eventos**: ", "- **Events**: ")).append(events.size()).append(w.t(" eventos de dominio, ", " domain events, "))
                    .append(published).append(w.t(" publicados como integración, ", " published as integration events, "))
                    .append(dlq).append(w.t(" con DLQ.\n", " with a DLQ.\n"));
        }
        var withOutbox = m.services().stream().filter(s -> s.outboxEnabled()).map(s -> s.name()).toList();
        var withoutOutbox = m.services().stream().filter(s -> !s.outboxEnabled()).map(s -> s.name()).toList();
        if (!events.isEmpty() && !m.services().isEmpty()) {
            md.append("- **Outbox**: ").append(withOutbox.isEmpty() ? w.t("ningún servicio", "no service")
                    : String.join(", ", withOutbox)).append(withOutbox.isEmpty() ? ""
                    : w.t(" guarda cada evento en la misma transacción que el cambio de estado y lo envía un relé",
                          " stores each event in the same transaction as the state change, and a relay sends it"));
            if (!withoutOutbox.isEmpty()) {
                md.append("; ").append(String.join(", ", withoutOutbox))
                        .append(w.t(" publica directamente: un fallo entre guardar y publicar pierde el evento",
                                " publishes directly: a failure between saving and publishing loses the event"));
            }
            md.append(".\n");
        }
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

    // --- §8 -------------------------------------------------------------------

    private static void contracts(StringBuilder md, ModelSnapshot m, Words w) {
        md.append(w.t("## 8. Contratos expuestos\n\n", "## 8. Exposed contracts\n\n"));
        for (var app : m.uiAdapters()) {
            md.append(w.t("### Aplicación ", "### Application ")).append(app.name()).append("\n\n");
            menuOf(app.menuItems()).forEach(item -> md.append("- ").append(nvl(item.label())).append("\n"));
            md.append("\n");
        }
        for (var api : m.apis()) {
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

    // --- §9 -------------------------------------------------------------------

    private static void openPoints(StringBuilder md, ModelSnapshot m, Words w) {
        md.append(w.t("## 9. Puntos abiertos\n\n", "## 9. Open points\n\n"));
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

    // --- helpers ----------------------------------------------------------------

    private static void contextDetails(StringBuilder md, ModelSnapshot m, Words w) {
        for (var boundedContext : m.boundedContexts()) {
            md.append("### ").append(boundedContext.name()).append("\n\n");
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
        }
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
