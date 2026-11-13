package io.mateu.modux.modeldrivengenerator.application.usecases.model.lint;

import io.mateu.modux.modeldrivengenerator.application.usecases.flow.coherence.FlowContextMapCoherenceService;
import io.mateu.modux.modeldrivengenerator.application.usecases.flow.coherence.FlowContextMapFinding;
import io.mateu.modux.modeldrivengenerator.application.usecases.interaction.shared.InteractionBackingResolver;
import io.mateu.modux.modeldrivengenerator.application.usecases.interaction.shared.InteractionCatalog;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.flow.vo.FlowArchetype;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.interaction.vo.InteractionParticipantType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.interaction.vo.InteractionTriggerKind;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.PiiClassification;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.boundedcontext.vo.KpiMeasure;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.process.vo.ProcessStepType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.saga.vo.SagaStepType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.OperationCarrier;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DeploymentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AiAgentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * The built-in rule catalog of the model linter. Each rule is a small pure function over a
 * {@link ModelSnapshot}; add new rules here (or as separate {@link LintRule} beans) as the
 * meta-model grows.
 */
public final class LintRules {

    private LintRules() {}

    public static List<LintRule> all() {
        var rules = new java.util.ArrayList<LintRule>(catalog());
        rules.addAll(ConflictRules.all());
        return List.copyOf(rules);
    }

    private static List<LintRule> catalog() {
        return List.of(
                new FlowContextRelation(),
                new SubscriptionIdempotency(),
                new IntegrationEventDlq(),
                new ProjectionRebuild(),
                new SagaCompensation(),
                new OrphanUseCase(),
                new AggregateInvariants(),
                new EventSourcingSnapshot(),
                new LifecycleCoherence(),
                new PiiAnonymization(),
                new PiiCrossContext(),
                new AuditedEventSourcing(),
                new ProcessHumanRole(),
                new ProcessDeadlineEscalation(),
                new AccessPolicyExpression(),
                new KpiValueField(),
                new SubdomainClassification(),
                new TenancyDeclared(),
                new NotifiesExternalSystem(),
                new OpenDecisions(),
                new ModelOrphan(),
                new CrossContextDataAccess(),
                new CrossServiceConsumption(),
                new ModuleNotInService(),
                new ModuleInManyServices(),
                new BoundedContextReadPath(),
                new BoundedContextWritePath(),
                new UseCasePipeline(),
                new OperationPipeline(),
                new OperationStepIllegalForCarrier(),
                new CustomStepIntent(),
                new WorkflowDag(),
                new WorkflowTrigger(),
                new WorkflowHome(),
                new WorkflowStepTarget(),
                new WorkflowDependsScope(),
                new PolicyWithoutTrigger(),
                new PolicyExposedAsUi(),
                new ProjectionSource(),
                new AgentWithoutTools(),
                new ExternalAgentDirectTools(),
                new McpGatewayEmpty(),
                new AgentDelegationCycle(),
                new RagOrphan(),
                new ApiOperationUnwired(),
                new InteractionDanglingParticipant(),
                new InteractionMessageWithoutBacking());
    }

    /** A published operation nobody implements is a broken promise. */
    static class ApiOperationUnwired implements LintRule {
        public String id() { return "api-operation-unwired"; }
        public String description() { return "Every API operation should wire to a context or use case"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.apis().stream()
                    .flatMap(api -> api.operations().stream()
                            .filter(op -> op.targetBoundedContextId() == null && op.targetUseCaseId() == null)
                            .map(op -> new LintFinding(id(), LintSeverity.WARNING, "ApiOperation",
                                    op.id(), api.name() + "." + op.name(),
                                    "Operación publicada sin implementador: apúntala a un bounded"
                                            + " context, un caso de uso o una policy.")))
                    .toList();
        }
    }

    /**
     * An interaction pointing at something that no longer exists is a broken story. One finding
     * per (interaction, dangling ref) — the trigger ref (an event NAME when the trigger kind is
     * EVENT) and every message endpoint — so a deleted element referenced by ten messages does
     * not spam ten identical warnings. Backing of the affected messages is not checked
     * separately (see {@link InteractionMessageWithoutBacking}): the dangling warning wins.
     */
    static class InteractionDanglingParticipant implements LintRule {
        public String id() { return "interaction-dangling-participant"; }
        public String description() { return "Interaction refs (trigger, message endpoints) should resolve to catalog elements"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var catalog = catalogOf(m);
            var findings = new ArrayList<LintFinding>();
            for (var interaction : m.interactions()) {
                var triggerRef = interaction.triggerRef();
                if (triggerRef != null && !triggerRef.isBlank() && !triggerResolves(catalog, interaction)) {
                    findings.add(new LintFinding(id(), LintSeverity.WARNING, "Interaction",
                            interaction.id(), interaction.name(),
                            "El disparador '" + triggerRef + "' no resuelve a ningún elemento"
                                    + (interaction.triggerKind() == InteractionTriggerKind.EVENT
                                            ? " (no existe ningún evento con ese nombre)." : ".")));
                }
                // ref → where it shows up ("mensaje 2 (origen)", …), in first-appearance order
                var occurrences = new java.util.LinkedHashMap<String, List<String>>();
                for (int i = 0; i < interaction.messages().size(); i++) {
                    var message = interaction.messages().get(i);
                    if (message.fromRef() != null) {
                        occurrences.computeIfAbsent(message.fromRef(), k -> new ArrayList<>())
                                .add("mensaje " + (i + 1) + " (origen)");
                    }
                    if (message.toRef() != null) {
                        occurrences.computeIfAbsent(message.toRef(), k -> new ArrayList<>())
                                .add("mensaje " + (i + 1) + " (destino)");
                    }
                }
                occurrences.forEach((ref, where) -> {
                    if (catalog.typeOf(ref) != InteractionParticipantType.UNKNOWN) return;
                    findings.add(new LintFinding(id(), LintSeverity.WARNING, "Interaction",
                            interaction.id(), interaction.name(),
                            "La referencia '" + ref + "' (" + String.join(", ", where)
                                    + ") no resuelve a ningún elemento del modelo."));
                });
            }
            return findings;
        }

        /** The trigger is an element id — or an event NAME when the kind is EVENT. */
        private static boolean triggerResolves(InteractionCatalog catalog, InteractionEntity interaction) {
            var triggerRef = interaction.triggerRef();
            if (interaction.triggerKind() == InteractionTriggerKind.EVENT) {
                return catalog.domainEvents().stream().anyMatch(e -> InteractionCatalog.sameEventName(e.name(), triggerRef))
                        || catalog.applicationEvents().stream().anyMatch(e -> InteractionCatalog.sameEventName(e.name(), triggerRef));
            }
            return catalog.typeOf(triggerRef) != InteractionParticipantType.UNKNOWN;
        }
    }

    /**
     * A message without a mechanism that performs it is intent only — the materialization
     * gestures close that gap. Backing comes straight from the {@link InteractionBackingResolver}
     * (the same computation the editor's projection shows), never re-derived here. Messages
     * touching a DANGLING endpoint are skipped: {@link InteractionDanglingParticipant} already
     * names that problem precisely, and backing cannot be meaningfully evaluated against an
     * element that does not exist — so no double warnings.
     */
    static class InteractionMessageWithoutBacking implements LintRule {
        public String id() { return "interaction-message-without-backing"; }
        public String description() { return "Every interaction message should ride on a declared mechanism"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var catalog = catalogOf(m);
            var findings = new ArrayList<LintFinding>();
            for (var interaction : m.interactions()) {
                for (int i = 0; i < interaction.messages().size(); i++) {
                    var message = interaction.messages().get(i);
                    if (catalog.typeOf(message.fromRef()) == InteractionParticipantType.UNKNOWN
                            || catalog.typeOf(message.toRef()) == InteractionParticipantType.UNKNOWN) {
                        continue; // dangling wins — see interaction-dangling-participant
                    }
                    if (InteractionBackingResolver.isBacked(catalog, message)) continue;
                    findings.add(new LintFinding(id(), LintSeverity.WARNING, "Interaction",
                            interaction.id(), interaction.name(),
                            "Mensaje " + (i + 1) + " (" + message.fromRef() + " → " + message.toRef()
                                    + (message.kind() != null ? ", " + message.kind().name() : "")
                                    + ") sin mecanismo que lo realice — materialízalo o ajusta la secuencia."));
                }
            }
            return findings;
        }
    }

    /** A knowledge base nobody queries is dead weight — link it to an agent or drop it. */
    static class RagOrphan implements LintRule {
        public String id() { return "rag-orphan"; }
        public String description() { return "A RAG should be queried by some AI agent"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var queried = new HashSet<String>();
            m.aiAgents().forEach(a -> queried.addAll(a.ragIds()));
            return m.rags().stream()
                    .filter(r -> !queried.contains(r.id()))
                    .map(r -> new LintFinding(id(), LintSeverity.INFO, "Rag", r.id(),
                            r.name(),
                            "RAG sin consumidor: ningún agente lo consulta — lígalo a un agente"
                                    + " o elimínalo."))
                    .toList();
        }
    }

    /** An AI agent acts through its tools — any of them. */
    static class AgentWithoutTools implements LintRule {
        public String id() { return "agent-without-tools"; }
        public String description() { return "An AI agent needs at least one tool to act"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.aiAgents().stream()
                    .filter(a -> a.allowedUseCaseIds().isEmpty()
                            && a.allowedExternalUseCaseIds().isEmpty()
                            && a.allowedMcpServerIds().isEmpty()
                            && a.allowedApiOperationIds().isEmpty()
                            && a.allowedQueryServiceIds().isEmpty()
                            && a.delegateAgentIds().isEmpty()
                            && a.mcpGatewayIds().isEmpty())
                    .map(a -> new LintFinding(id(), LintSeverity.INFO, "AiAgent", a.id(),
                            a.name(),
                            "Agente sin herramientas: no consume casos de uso, query services,"
                                    + " operaciones (de API o externas), servidores MCP, gateways"
                                    + " ni delega en otros agentes — no puede actuar."))
                    .toList();
        }
    }

    /** An external agent enters through MCP gateways — never touching internals directly. */
    static class ExternalAgentDirectTools implements LintRule {
        public String id() { return "external-agent-direct-tools"; }
        public String description() { return "External agents should consume ONLY through MCP gateways"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.aiAgents().stream()
                    .filter(AiAgentEntity::external)
                    .filter(a -> !a.allowedUseCaseIds().isEmpty()
                            || !a.allowedQueryServiceIds().isEmpty()
                            || !a.allowedApiOperationIds().isEmpty()
                            || !a.ragIds().isEmpty()
                            || !a.reactsToEventIds().isEmpty())
                    .map(a -> new LintFinding(id(), LintSeverity.WARNING, "AiAgent", a.id(),
                            a.name(),
                            "Agente EXTERNO con herramientas internas directas — debe entrar por"
                                    + " un gateway MCP, que es quien cura y protege la superficie."))
                    .toList();
        }
    }

    /** A gateway that exposes nothing serves nothing. */
    static class McpGatewayEmpty implements LintRule {
        public String id() { return "mcp-gateway-empty"; }
        public String description() { return "An MCP gateway should expose at least one tool surface"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.mcpGateways().stream()
                    .filter(g -> g.mcpServerIds().isEmpty() && g.apiIds().isEmpty()
                            && g.apiOperationIds().isEmpty() && g.useCaseIds().isEmpty()
                            && g.ragIds().isEmpty())
                    .map(g -> new LintFinding(id(), LintSeverity.INFO, "McpGateway", g.id(),
                            g.name(),
                            "Gateway MCP vacío: no agrega ni expone nada — conéctale APIs,"
                                    + " operaciones, casos de uso, servidores MCP o RAGs."))
                    .toList();
        }
    }

    /** A delegation cycle between agents loops forever. */
    static class AgentDelegationCycle implements LintRule {
        public String id() { return "agent-delegation-cycle"; }
        public String description() { return "Agent delegation must not form cycles"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var delegates = new java.util.HashMap<String, List<String>>();
            for (var agent : m.aiAgents()) {
                delegates.put(agent.id(), agent.delegateAgentIds());
            }
            var findings = new ArrayList<LintFinding>();
            for (var agent : m.aiAgents()) {
                if (reaches(agent.id(), agent.id(), delegates, new HashSet<>())) {
                    findings.add(new LintFinding(id(), LintSeverity.WARNING, "AiAgent",
                            agent.id(), agent.name(),
                            "Ciclo de delegación: este agente acaba delegándose a sí mismo."));
                }
            }
            return findings;
        }

        private static boolean reaches(String from, String target,
                                       java.util.Map<String, List<String>> delegates,
                                       Set<String> visited) {
            for (var next : delegates.getOrDefault(from, List.of())) {
                if (next.equals(target)) return true;
                if (visited.add(next) && reaches(next, target, delegates, visited)) return true;
            }
            return false;
        }
    }

    /**
     * A projection needs a source: event handlers, an aggregate's state, or something
     * external to poll (an operation or a legacy table).
     */
    static class ProjectionSource implements LintRule {
        public String id() { return "projection-source"; }
        public String description() { return "A projection must fold events or project some source"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.projections().stream()
                    .filter(p -> (p.handlers() == null || p.handlers().isEmpty())
                            && p.sourceAggregateId() == null
                            && p.sourceExternalUseCaseId() == null
                            && p.sourceExternalTableId() == null)
                    .map(p -> new LintFinding(id(), LintSeverity.WARNING, "Projection", p.id(),
                            p.name(),
                            "Proyección sin fuente: ni maneja eventos ni proyecta un agregado,"
                                    + " operación o tabla externa — el read model nunca se"
                                    + " alimentará."))
                    .toList();
        }
    }

    // --- policies (use-case-shaped reactions, the lilac sticky) -----------------

    /**
     * A policy is reaction logic: if no event ever invokes it (subscription action,
     * flow, process step or workflow step), it never runs.
     */
    static class PolicyWithoutTrigger implements LintRule {
        public String id() { return "policy-without-trigger"; }
        public String description() { return "A policy must be invoked by some event reaction"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var invoked = new HashSet<String>();
            for (var s : m.subscriptions()) {
                if (s.actions() == null) continue;
                s.actions().forEach(a -> { if (a.useCaseId() != null) invoked.add(a.useCaseId()); });
            }
            m.flows().forEach(f -> { if (f.targetUseCaseId() != null) invoked.add(f.targetUseCaseId()); });
            m.processes().forEach(p -> p.steps().forEach(s -> {
                if (s.useCaseId() != null) invoked.add(s.useCaseId());
            }));
            m.workflows().forEach(w -> w.steps().forEach(s -> {
                if (s.targetUseCaseId() != null) invoked.add(s.targetUseCaseId());
            }));
            return m.useCases().stream()
                    .filter(uc -> uc.policy())
                    .filter(uc -> !invoked.contains(uc.id()))
                    .map(uc -> new LintFinding(id(), LintSeverity.WARNING, "UseCase", uc.id(),
                            uc.name(),
                            "Policy sin disparador: ningún evento la invoca (subscription, flow,"
                                    + " proceso o workflow) — nunca se ejecutará."))
                    .toList();
        }
    }

    /** A policy reacts to events; deriving a UI from it contradicts its nature. */
    static class PolicyExposedAsUi implements LintRule {
        public String id() { return "policy-exposed-as-ui"; }
        public String description() { return "Policies should not derive UIs"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.useCases().stream()
                    .filter(uc -> uc.policy() && uc.exposedAsUi())
                    .map(uc -> new LintFinding(id(), LintSeverity.WARNING, "UseCase", uc.id(),
                            uc.name(),
                            "Policy expuesta como UI: una policy reacciona a eventos, no la usa"
                                    + " una persona — quita exposedAsUi o hazla caso de uso normal."))
                    .toList();
        }
    }

    // --- workflows (cross-context orchestrators) --------------------------------

    /** A cycle in a workflow's dependency graph means some steps can never start. */
    static class WorkflowDag implements LintRule {
        public String id() { return "workflow-dag"; }
        public String description() { return "A workflow's step dependencies must form a DAG"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var workflow : m.workflows()) {
                var dependsOn = new java.util.HashMap<String, List<String>>();
                for (var step : workflow.steps()) {
                    dependsOn.put(step.id(), step.dependsOnStepIds());
                }
                var cycleStep = findCycle(dependsOn);
                if (cycleStep != null) {
                    findings.add(new LintFinding(id(), LintSeverity.ERROR, "Workflow",
                            workflow.id(), workflow.name(),
                            "Dependency cycle through step '" + cycleStep
                                    + "' — the steps in the cycle can never start."));
                }
            }
            return findings;
        }

        /** A step id on some dependency cycle, or null when the graph is a DAG. */
        private static String findCycle(java.util.Map<String, List<String>> dependsOn) {
            var done = new HashSet<String>();
            var inProgress = new HashSet<String>();
            for (var stepId : dependsOn.keySet()) {
                var found = visit(stepId, dependsOn, done, inProgress);
                if (found != null) return found;
            }
            return null;
        }

        private static String visit(String stepId, java.util.Map<String, List<String>> dependsOn,
                                    Set<String> done, Set<String> inProgress) {
            if (done.contains(stepId)) return null;
            if (inProgress.contains(stepId)) return stepId;
            inProgress.add(stepId);
            for (var dep : dependsOn.getOrDefault(stepId, List.of())) {
                var found = visit(dep, dependsOn, done, inProgress);
                if (found != null) return found;
            }
            inProgress.remove(stepId);
            done.add(stepId);
            return null;
        }
    }

    /** A workflow without a trigger event never starts. */
    static class WorkflowTrigger implements LintRule {
        public String id() { return "workflow-trigger"; }
        public String description() { return "Every workflow should declare its trigger event"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.workflows().stream()
                    .filter(w -> w.triggerEvent() == null || w.triggerEvent().isBlank())
                    .map(w -> new LintFinding(id(), LintSeverity.WARNING, "Workflow", w.id(), w.name(),
                            "No trigger event — the workflow never starts."))
                    .toList();
        }
    }

    /**
     * A workflow has to be reachable from SOME context, or it generates nothing.
     *
     * <p>A workflow lives outside every bounded context, but its EventConductor definition has to
     * end up on a running service's classpath — and the service that will certainly be running
     * when the workflow starts is the one the trigger comes from. When nothing says where it
     * starts, generation has nowhere to put the file and writes none, which is exactly the kind of
     * silence this rule exists to break.
     */
    static class WorkflowHome implements LintRule {
        public String id() { return "workflow-home"; }
        public String description() {
            return "Every workflow must be startable from a bounded context";
        }
        public List<LintFinding> apply(ModelSnapshot m) {
            var owned = new HashSet<String>();
            for (var context : m.boundedContexts()) {
                addAll(owned, context.aggregateIds());
                addAll(owned, context.useCaseIds());
                addAll(owned, context.domainServiceIds());
            }
            return m.workflows().stream()
                    .filter(w -> !homed(w, owned))
                    .map(w -> new LintFinding(id(), LintSeverity.ERROR, "Workflow", w.id(), w.name(),
                            "No se sabe desde qué contexto arranca: no genera definición para el"
                                    + " motor. Dale un trigger (agregado, servicio de dominio o"
                                    + " caso de uso), o un paso con caso de uso."))
                    .toList();
        }

        private static boolean homed(
                io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowEntity w,
                Set<String> owned) {
            if (owned.contains(w.triggerAggregateId())
                    || owned.contains(w.triggerDomainServiceId())
                    || owned.contains(w.triggerUseCaseId())) {
                return true;
            }
            return w.steps() != null && w.steps().stream()
                    .anyMatch(s -> owned.contains(s.targetUseCaseId()));
        }

        private static void addAll(Set<String> target, List<String> source) {
            if (source != null) target.addAll(source);
        }
    }

    /** A workflow step's event must start a task somewhere: a use case, for now. */
    static class WorkflowStepTarget implements LintRule {
        public String id() { return "workflow-step-target"; }
        public String description() { return "Every workflow step should start a use case"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var workflow : m.workflows()) {
                for (var step : workflow.steps()) {
                    if (step.targetUseCaseId() == null || step.targetUseCaseId().isBlank()) {
                        findings.add(new LintFinding(id(), LintSeverity.WARNING, "Workflow",
                                workflow.id(), workflow.name(),
                                "Step '" + step.name() + "' starts no use case — its event has no reaction."));
                    }
                }
            }
            return findings;
        }
    }

    /**
     * Step dependencies must stay inside the workflow's own graph. The global referential check
     * accepts any existing id, so a dependsOn pointing at ANOTHER workflow's step passes it.
     */
    static class WorkflowDependsScope implements LintRule {
        public String id() { return "workflow-depends-scope"; }
        public String description() { return "Step dependencies must reference steps of the same workflow"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var workflow : m.workflows()) {
                var ownIds = workflow.steps().stream().map(s -> s.id()).collect(HashSet<String>::new,
                        HashSet::add, HashSet::addAll);
                for (var step : workflow.steps()) {
                    for (var dep : step.dependsOnStepIds()) {
                        if (!ownIds.contains(dep)) {
                            findings.add(new LintFinding(id(), LintSeverity.ERROR, "Workflow",
                                    workflow.id(), workflow.name(),
                                    "Step '" + step.name() + "' depends on '" + dep
                                            + "', which is not a step of this workflow."));
                        }
                    }
                }
            }
            return findings;
        }
    }

    // --- cross-context coherence ---------------------------------------------

    /** Every cross-context flow should be backed by a declared strategic relation. */
    static class FlowContextRelation implements LintRule {
        public String id() { return "flow-context-relation"; }
        public String description() { return "Cross-context flows should be backed by a context-map relation"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return FlowContextMapCoherenceService.analyze(m.flows(), m.aggregates(), m.boundedContexts(), m.contextMapRelations()).stream()
                    .filter(f -> f.status() == FlowContextMapFinding.Status.MISSING_RELATION
                            || f.status() == FlowContextMapFinding.Status.REVERSED)
                    .map(f -> new LintFinding(id(), LintSeverity.WARNING, "Flow", f.flowId(), f.flowName(), f.message()))
                    .toList();
        }
    }

    // --- event-driven hygiene -------------------------------------------------

    /** Cross-context consumption without idempotency duplicates side effects on redelivery. */
    static class SubscriptionIdempotency implements LintRule {
        public String id() { return "subscription-idempotency"; }
        public String description() { return "Subscriptions should be idempotent"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.subscriptions().stream()
                    .filter(s -> !s.idempotencyEnabled())
                    .map(s -> new LintFinding(id(), LintSeverity.WARNING, "Subscription", s.id(), s.name(),
                            "Idempotency is off — redelivered events will duplicate side effects."))
                    .toList();
        }
    }

    /** An integration event without a dead-letter queue loses failed deliveries silently. */
    static class IntegrationEventDlq implements LintRule {
        public String id() { return "integration-event-dlq"; }
        public String description() { return "Integration events should have a dead-letter queue"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.integrationEvents().stream()
                    .filter(e -> !e.deadLetterQueueEnabled())
                    .map(e -> new LintFinding(id(), LintSeverity.WARNING, "IntegrationEvent", e.id(), e.name(),
                            "No dead-letter queue — failed deliveries are lost silently."))
                    .toList();
        }
    }

    /** A projection without a rebuild strategy cannot recover from bugs or schema changes. */
    static class ProjectionRebuild implements LintRule {
        public String id() { return "projection-rebuild"; }
        public String description() { return "Projections should declare a rebuild strategy"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.projections().stream()
                    .filter(p -> p.rebuildStrategy() == null || p.rebuildStrategy().isBlank())
                    // a state projection rebuilds itself: its source republishes the whole state on startup
                    .filter(p -> p.sourceAggregateId() == null || p.sourceAggregateId().isBlank())
                    .map(p -> new LintFinding(id(), LintSeverity.WARNING, "Projection", p.id(), p.name(),
                            "No rebuild strategy — the read model cannot recover from projection bugs."))
                    .toList();
        }
    }

    /** Saga steps with side effects should declare how to undo them. */
    static class SagaCompensation implements LintRule {
        private static final Set<SagaStepType> SIDE_EFFECTING =
                Set.of(SagaStepType.CallUseCase, SagaStepType.CallAggregateOperation,
                        SagaStepType.SaveAggregate, SagaStepType.CallGateway);
        public String id() { return "saga-compensation"; }
        public String description() { return "Side-effecting saga steps should have compensation"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var saga : m.sagas()) {
                var compensationIds = saga.steps() == null ? Set.<String>of() : saga.steps().stream()
                        .map(s -> s.compensatingStepId()).filter(Objects::nonNull).collect(HashSet::new, HashSet::add, HashSet::addAll);
                if (saga.steps() == null) continue;
                for (var step : saga.steps()) {
                    if (SIDE_EFFECTING.contains(step.type())
                            && (step.compensatingStepId() == null || step.compensatingStepId().isBlank())
                            && !compensationIds.contains(step.id())) {
                        findings.add(new LintFinding(id(), LintSeverity.INFO, "Saga", saga.id(), saga.name(),
                                "Step '" + step.name() + "' has side effects but no compensation."));
                    }
                }
            }
            return findings;
        }
    }

    // --- structure ------------------------------------------------------------

    /** A use case owned by no boundedContext is invisible to generation and the context map. */
    static class OrphanUseCase implements LintRule {
        public String id() { return "orphan-use-case"; }
        public String description() { return "Every use case should belong to a boundedContext"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var owned = new HashSet<String>();
            m.boundedContexts().forEach(mod -> {
                if (mod.useCaseIds() != null) owned.addAll(mod.useCaseIds());
            });
            return m.useCases().stream()
                    .filter(uc -> !owned.contains(uc.id()))
                    .map(uc -> new LintFinding(id(), LintSeverity.WARNING, "UseCase", uc.id(), uc.name(),
                            "Not referenced by any boundedContext — orphan use cases are skipped by generation."))
                    .toList();
        }
    }

    /** Behaviour without invariants is a hint of an anemic aggregate. */
    static class AggregateInvariants implements LintRule {
        public String id() { return "aggregate-invariants"; }
        public String description() { return "Aggregates with operations should declare invariants"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.aggregates().stream()
                    .filter(a -> !a.operations().isEmpty() && a.invariants().isEmpty())
                    .map(a -> new LintFinding(id(), LintSeverity.INFO, "Aggregate", a.id(), a.name(),
                            "Has operations but no invariants — what makes this aggregate consistent?"))
                    .toList();
        }
    }

    /** Event-sourced aggregates without snapshots degrade linearly with history length. */
    static class EventSourcingSnapshot implements LintRule {
        public String id() { return "event-sourcing-snapshot"; }
        public String description() { return "Event-sourced aggregates should declare a snapshot frequency"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.aggregates().stream()
                    .filter(a -> a.eventSourcingEnabled() && a.snapshotFrequency() == null)
                    .map(a -> new LintFinding(id(), LintSeverity.INFO, "Aggregate", a.id(), a.name(),
                            "Event-sourced without snapshots — replay cost grows with history."))
                    .toList();
        }
    }

    // --- lifecycle --------------------------------------------------------------

    /** The declared state machine must be internally coherent. */
    static class LifecycleCoherence implements LintRule {
        public String id() { return "lifecycle-coherence"; }
        public String description() { return "Aggregate lifecycles must be coherent state machines"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var a : m.aggregates()) {
                var lc = a.lifecycle();
                if (lc == null) continue;
                var states = new HashSet<>(lc.states());
                if (lc.initialState() == null || !states.contains(lc.initialState())) {
                    findings.add(finding(a, LintSeverity.ERROR,
                            "Initial state '" + lc.initialState() + "' is not one of the declared states."));
                }
                var operationIds = a.operations().stream().map(o -> o.id()).collect(HashSet::new, HashSet::add, HashSet::addAll);
                for (var t : lc.transitions()) {
                    if (t.fromState() == null || !states.contains(t.fromState())) {
                        findings.add(finding(a, LintSeverity.ERROR,
                                "Transition '" + t.id() + "' starts at unknown state '" + t.fromState() + "'."));
                    }
                    if (t.toState() == null || !states.contains(t.toState())) {
                        findings.add(finding(a, LintSeverity.ERROR,
                                "Transition '" + t.id() + "' ends at unknown state '" + t.toState() + "'."));
                    }
                    if (t.operationId() != null && !operationIds.contains(t.operationId())) {
                        findings.add(finding(a, LintSeverity.WARNING,
                                "Transition '" + t.id() + "' references operation '" + t.operationId()
                                        + "', which is not an operation of this aggregate."));
                    }
                }
                // reachability from the initial state
                if (lc.initialState() != null && states.contains(lc.initialState())) {
                    var reached = new HashSet<String>();
                    var queue = new ArrayDeque<String>();
                    queue.add(lc.initialState());
                    reached.add(lc.initialState());
                    while (!queue.isEmpty()) {
                        var current = queue.poll();
                        for (var t : lc.transitions()) {
                            if (current.equals(t.fromState()) && t.toState() != null && reached.add(t.toState())) {
                                queue.add(t.toState());
                            }
                        }
                    }
                    for (var state : lc.states()) {
                        if (!reached.contains(state)) {
                            findings.add(finding(a, LintSeverity.WARNING,
                                    "State '" + state + "' is unreachable from the initial state."));
                        }
                    }
                }
            }
            return findings;
        }
        private LintFinding finding(AggregateEntity a, LintSeverity severity, String message) {
            return new LintFinding(id(), severity, "Aggregate", a.id(), a.name(), message);
        }
    }

    // --- compliance -------------------------------------------------------------

    /** PII fields should say how they are anonymized on erasure requests. */
    static class PiiAnonymization implements LintRule {
        public String id() { return "pii-anonymization"; }
        public String description() { return "PII fields should declare an anonymization strategy"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var model : m.models()) {
                if (model.fields() == null) continue;
                for (var f : model.fields()) {
                    if (isPii(f) && (f.anonymizationStrategy() == null
                            || f.anonymizationStrategy() == io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.AnonymizationStrategy.NONE)) {
                        findings.add(new LintFinding(id(), LintSeverity.INFO, "Model", model.id(), model.name(),
                                "Field '" + f.name() + "' is classified as " + f.piiClassification()
                                        + " but declares no anonymization strategy (GDPR erasure)."));
                    }
                }
            }
            return findings;
        }
    }

    /** PII crossing a context boundary through a flow deserves an explicit decision. */
    static class PiiCrossContext implements LintRule {
        public String id() { return "pii-cross-context"; }
        public String description() { return "PII materialized into another context should be a conscious decision"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var flow : m.flows()) {
                if (flow.materializedFields() == null || flow.materializedFields().isEmpty()) continue;
                var model = modelOfAggregate(m, flow.triggerAggregateId());
                if (model == null || model.fields() == null) continue;
                for (var f : model.fields()) {
                    if (isPii(f) && flow.materializedFields().contains(f.name())) {
                        findings.add(new LintFinding(id(), LintSeverity.WARNING, "Flow", flow.id(), flow.name(),
                                "Materializes PII field '" + f.name() + "' into another context — every copy "
                                        + "multiplies the erasure surface. Confirm it is needed."));
                    }
                }
            }
            return findings;
        }
    }

    /** An audit trail is strongest (and cheapest) when the aggregate is event-sourced. */
    static class AuditedEventSourcing implements LintRule {
        public String id() { return "audited-event-sourcing"; }
        public String description() { return "Audited aggregates benefit from event sourcing"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.aggregates().stream()
                    .filter(a -> a.audited() && !a.eventSourcingEnabled())
                    .map(a -> new LintFinding(id(), LintSeverity.INFO, "Aggregate", a.id(), a.name(),
                            "Audited without event sourcing — consider ES: the event log IS the audit trail."))
                    .toList();
        }
    }

    // --- processes ---------------------------------------------------------------

    /** A human task nobody owns lands on no worklist. */
    static class ProcessHumanRole implements LintRule {
        public String id() { return "process-human-role"; }
        public String description() { return "HUMAN process steps must assign a role"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var p : m.processes()) {
                for (var s : p.steps()) {
                    if (s.type() == ProcessStepType.HUMAN && (s.roleId() == null || s.roleId().isBlank())) {
                        findings.add(new LintFinding(id(), LintSeverity.WARNING, "Process", p.id(), p.name(),
                                "Human step '" + s.name() + "' has no role — the task lands on nobody's worklist."));
                    }
                }
            }
            return findings;
        }
    }

    /** A deadline that nobody hears about is not a deadline. */
    static class ProcessDeadlineEscalation implements LintRule {
        public String id() { return "process-deadline-escalation"; }
        public String description() { return "Deadline-bounded steps should declare escalation"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var p : m.processes()) {
                for (var s : p.steps()) {
                    if (s.deadline() != null && !s.deadline().isBlank()
                            && (s.escalationRoleId() == null || s.escalationRoleId().isBlank())) {
                        findings.add(new LintFinding(id(), LintSeverity.INFO, "Process", p.id(), p.name(),
                                "Step '" + s.name() + "' has a deadline but no escalation role."));
                    }
                }
            }
            return findings;
        }
    }

    // --- authorization / metrics / strategy ---------------------------------------

    /** A policy without an expression grants nothing and protects nothing. */
    static class AccessPolicyExpression implements LintRule {
        public String id() { return "access-policy-expression"; }
        public String description() { return "Access policies must have an expression"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var mod : m.boundedContexts()) {
                for (var p : mod.accessPolicies()) {
                    if (p.expression() == null || p.expression().isBlank()) {
                        findings.add(new LintFinding(id(), LintSeverity.WARNING, "BoundedContext", mod.id(), mod.name(),
                                "Access policy '" + p.name() + "' has no expression."));
                    }
                }
            }
            return findings;
        }
    }

    /** SUM/AVG/MIN/MAX need a field to aggregate. */
    static class KpiValueField implements LintRule {
        public String id() { return "kpi-value-field"; }
        public String description() { return "Non-COUNT KPIs need a value field"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var mod : m.boundedContexts()) {
                for (var k : mod.kpis()) {
                    if (k.measure() != null && k.measure() != KpiMeasure.COUNT
                            && (k.valueField() == null || k.valueField().isBlank())) {
                        findings.add(new LintFinding(id(), LintSeverity.ERROR, "BoundedContext", mod.id(), mod.name(),
                                "KPI '" + k.name() + "' uses " + k.measure() + " but declares no value field."));
                    }
                }
            }
            return findings;
        }
    }

    /** Classifying subdomains is the whole point of strategic design: where to invest. */
    static class SubdomainClassification implements LintRule {
        public String id() { return "subdomain-classification"; }
        public String description() { return "BoundedContexts should be classified core/supporting/generic"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.boundedContexts().stream()
                    .filter(mod -> mod.subdomainType() == null)
                    .map(mod -> new LintFinding(id(), LintSeverity.INFO, "BoundedContext", mod.id(), mod.name(),
                            "No subdomain classification — is this CORE, SUPPORTING or GENERIC?"))
                    .toList();
        }
    }

    /** Tenancy is painful to retrofit; make the decision explicit even if it is NONE. */
    static class TenancyDeclared implements LintRule {
        public String id() { return "tenancy-declared"; }
        public String description() { return "Projects should declare a tenancy strategy"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.projects().stream()
                    .filter(p -> m.deployments().stream()
                            .noneMatch(d -> DeploymentEntity.idFor(p.id()).equals(d.id()) && d.tenancyStrategy() != null))
                    .map(p -> new LintFinding(id(), LintSeverity.INFO, "Project", p.id(), p.name(),
                            "No tenancy strategy declared — say NONE explicitly if single-tenant."))
                    .toList();
        }
    }

    /** NOTIFIES flows target outside systems that should exist on the map. */
    static class NotifiesExternalSystem implements LintRule {
        public String id() { return "notifies-external-system"; }
        public String description() { return "NOTIFIES flows should have declared external systems"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            boolean anyExternal = !m.externalSystems().isEmpty();
            if (anyExternal) return List.of();
            return m.flows().stream()
                    .filter(f -> f.archetype() == FlowArchetype.NOTIFIES)
                    .map(f -> new LintFinding(id(), LintSeverity.INFO, "Flow", f.id(), f.name(),
                            "Notifies an external system, but the project declares none — add it to the "
                                    + "context map (externalSystems) so the integration is visible."))
                    .toList();
        }
    }

    /** The open-points inbox: PROPOSED decisions are the questions still driving the design. */
    static class OpenDecisions implements LintRule {
        public String id() { return "open-decisions"; }
        public String description() { return "Proposed decisions are open design questions"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.decisions().stream()
                    .filter(d -> d.status() == io.mateu.modux.modeldrivengenerator.domain.aggregates.decision.vo.DecisionStatus.PROPOSED)
                    .map(d -> new LintFinding(id(), LintSeverity.INFO, "Decision", d.id(), d.name(),
                            "Open decision: " + (d.decision() != null ? d.decision() : "(sin enunciado)")
                                    + " — resolve it (ACCEPTED/…) and reflect the outcome in the model."))
                    .toList();
        }
    }

    /**
     * Data living in another subdomain is consumed through its API (query service) or materialized
     * as a projection — never by reaching into the foreign aggregate directly. This rule catches a
     * use case whose steps read/write an aggregate owned by a different boundedContext.
     */
    static class CrossContextDataAccess implements LintRule {
        private static final Set<io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType> AGGREGATE_ACCESS =
                Set.of(io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.ReadAggregate,
                        io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallAggregateOperation,
                        io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.SaveAggregate);
        public String id() { return "cross-context-data-access"; }
        public String description() { return "Foreign-context data is consumed via API or projection, not by touching the aggregate"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var boundedContext : m.boundedContexts()) {
                if (boundedContext.useCaseIds() == null) continue;
                for (var useCaseId : boundedContext.useCaseIds()) {
                    var useCase = m.useCases().stream().filter(uc -> uc.id().equals(useCaseId)).findFirst().orElse(null);
                    if (useCase == null || useCase.steps() == null) continue;
                    for (var step : useCase.steps()) {
                        if (!AGGREGATE_ACCESS.contains(step.type()) || step.aggregateId() == null) continue;
                        var owner = m.boundedContexts().stream()
                                .filter(other -> other.aggregateIds() != null && other.aggregateIds().contains(step.aggregateId()))
                                .findFirst().orElse(null);
                        if (owner != null && !owner.id().equals(boundedContext.id())) {
                            findings.add(new LintFinding(id(), LintSeverity.WARNING, "UseCase",
                                    useCase.id(), useCase.name(),
                                    "Step '" + step.name() + "' " + step.type() + " on aggregate '" + step.aggregateId()
                                            + "', owned by context '" + owner.name() + "' — consume it through "
                                            + owner.name() + "'s API (query service) or materialize a projection "
                                            + "(MATERIALIZES flow) instead of touching the foreign aggregate."));
                        }
                    }
                }
            }
            return findings;
        }
    }

    /**
     * A use case consumes functionality (a use case or a query service) in the same or another
     * subdomain. Same service → in-process interface, fine. BoundedContexts distributed into different
     * services → the call crosses a process boundary, which requires an API: the provider must be
     * exposed (gRPC/REST). The deriver (Derive APIs) can fix these automatically.
     */
    static class CrossServiceConsumption implements LintRule {
        public String id() { return "cross-service-consumption"; }
        public String description() { return "Cross-service consumption requires the provider to expose an API"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var boundedContext : m.boundedContexts()) {
                if (boundedContext.useCaseIds() == null) continue;
                for (var useCaseId : boundedContext.useCaseIds()) {
                    var consumerService = io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology
                            .serviceOfElement(m.services(), m.modules(), boundedContext.id(), useCaseId);
                    var consumer = m.useCases().stream().filter(uc -> uc.id().equals(useCaseId)).findFirst().orElse(null);
                    if (consumer == null || consumer.steps() == null) continue;
                    for (var step : consumer.steps()) {
                        if (step.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallUseCase
                                && step.useCaseId() != null) {
                            var provider = m.useCases().stream().filter(uc -> uc.id().equals(step.useCaseId())).findFirst().orElse(null);
                            var providerBoundedContext = m.boundedContexts().stream()
                                    .filter(other -> other.useCaseIds() != null && other.useCaseIds().contains(step.useCaseId()))
                                    .findFirst().orElse(null);
                            if (provider == null || providerBoundedContext == null) continue;
                            if (crossesService(m, consumerService, providerBoundedContext.id(), provider.id())
                                    && !provider.exposedAsGrpc() && !provider.exposedAsRest()) {
                                // generation turns it into a REST call: a client here, the endpoint there
                                findings.add(new LintFinding(id(), LintSeverity.INFO, "UseCase",
                                        consumer.id(), consumer.name(),
                                        "Calls use case '" + provider.name() + "' of another service: it goes over REST "
                                                + "(a generated client here, its /v1 endpoint there) — a network call that can fail."));
                            }
                        }
                        if (step.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallQueryService
                                && step.queryServiceId() != null) {
                            var provider = m.queryServices().stream()
                                    .filter(qs -> qs.id().equals(step.queryServiceId())).findFirst().orElse(null);
                            if (provider == null) continue;
                            if (crossesService(m, consumerService, provider.boundedContextId(), provider.id()) && !provider.exposedAsGrpc()) {
                                findings.add(new LintFinding(id(), LintSeverity.WARNING, "UseCase",
                                        consumer.id(), consumer.name(),
                                        "Consumes query service '" + provider.name() + "' deployed in another service — "
                                                + "the call crosses a process boundary: expose it as gRPC (or run Derive APIs)."));
                            }
                        }
                    }
                }
            }
            return findings;
        }
        private static boolean crossesService(ModelSnapshot m, io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity consumerService, String providerBoundedContextId, String providerElementId) {
            var providerService = io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology
                    .serviceOfElement(m.services(), m.modules(), providerBoundedContextId, providerElementId);
            if (consumerService == null || providerService == null) return false;
            return !Objects.equals(consumerService.id(), providerService.id());
        }
    }

    /** Models are the axis of the system — a model no station references is dead weight. */
    static class ModelOrphan implements LintRule {
        public String id() { return "model-orphan"; }
        public String description() { return "Every model should be used by at least one station"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var referenced = new HashSet<String>();
            m.aggregates().forEach(a -> referenced.add(a.modelId()));
            m.entities().forEach(e -> referenced.add(e.modelId()));
            m.readModels().forEach(rm -> referenced.add(rm.modelId()));
            m.pages().forEach(p -> referenced.add(p.modelId()));
            m.useCases().forEach(uc -> { referenced.add(uc.inputModelId()); referenced.add(uc.outputModelId()); });
            m.domainEvents().forEach(ev -> { referenced.add(ev.modelId()); referenced.add(ev.integrationModelId()); });
            m.subscriptions().forEach(s -> referenced.add(s.inputModelId()));
            m.modelMappings().forEach(mm -> { referenced.add(mm.sourceModelId()); referenced.add(mm.targetModelId()); });
            m.queryServices().forEach(qs -> {
                if (qs.operations() != null) qs.operations().forEach(op -> {
                    referenced.add(op.inputModelId());
                    referenced.add(op.outputModelId());
                });
            });
            return m.models().stream()
                    .filter(model -> !referenced.contains(model.id()))
                    .map(model -> new LintFinding(id(), LintSeverity.INFO, "Model", model.id(), model.name(),
                            "No station references this model — dead weight or work in progress?"))
                    .toList();
        }
    }

    // --- the authoring path (see getting-started/authoring-path): these rules turn the natural
    // modeling sequence — topology → models → read/write sides → relations → operations — into
    // next-step feedback instead of leaving it as tribal knowledge -------------------------------

    /** Step 1 of the path: a module nobody deploys is a dead end (and so is its bounded context). */
    static class ModuleNotInService implements LintRule {
        public String id() { return "module-not-in-service"; }
        public String description() { return "Every module should be deployed by a service"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var deployed = new HashSet<String>();
            m.services().forEach(s -> {
                if (s.moduleIds() != null) deployed.addAll(s.moduleIds());
            });
            return m.modules().stream()
                    .filter(mod -> !deployed.contains(mod.id()))
                    .map(mod -> new LintFinding(id(), LintSeverity.WARNING, "Module", mod.id(), mod.name(),
                            "Not deployed by any service — it will never be generated or deployed."))
                    .toList();
        }
    }

    /** A module deploys in exactly ONE service: two services building the same module is a topology bug. */
    static class ModuleInManyServices implements LintRule {
        public String id() { return "module-in-many-services"; }
        public String description() { return "A module must be deployed by at most one service"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var module : m.modules()) {
                var owners = m.services().stream()
                        .filter(s -> s.moduleIds() != null && s.moduleIds().contains(module.id()))
                        .map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity::name)
                        .toList();
                if (owners.size() > 1) {
                    findings.add(new LintFinding(id(), LintSeverity.ERROR, "Module", module.id(), module.name(),
                            "Deployed by " + owners.size() + " services (" + String.join(", ", owners)
                                    + ") — every element would run twice. Pick one."));
                }
            }
            return findings;
        }
    }

    /** Step 2 of the path: state without a read side is invisible — unless the read side lives elsewhere. */
    static class BoundedContextReadPath implements LintRule {
        public String id() { return "boundedContext-read-path"; }
        public String description() { return "BoundedContexts holding state should expose a way to read it"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.boundedContexts().stream()
                    .filter(mod -> mod.aggregateIds() != null && !mod.aggregateIds().isEmpty())
                    // declared read delegation ("the read side lives elsewhere") satisfies the path
                    .filter(mod -> isBlank(mod.readSideBoundedContextId()) && isBlank(mod.readSideExternalSystemId()))
                    .filter(mod -> mod.readModelIds() == null || mod.readModelIds().isEmpty())
                    .filter(mod -> m.queryServices().stream().noneMatch(qs -> mod.id().equals(qs.boundedContextId())))
                    .filter(mod -> {
                        var boundedContextModels = new HashSet<String>();
                        mod.aggregateIds().forEach(aggId -> {
                            var model = modelOfAggregate(m, aggId);
                            if (model != null) boundedContextModels.add(model.id());
                        });
                        return m.pages().stream().noneMatch(p -> boundedContextModels.contains(p.modelId()));
                    })
                    .map(mod -> new LintFinding(id(), LintSeverity.INFO, "BoundedContext", mod.id(), mod.name(),
                            "Has aggregates but no query service, read model or page — how is this state read?"))
                    .toList();
        }
    }

    /** Step 2 of the path: an aggregate no station writes to is decoration. */
    static class BoundedContextWritePath implements LintRule {
        public String id() { return "boundedContext-write-path"; }
        public String description() { return "BoundedContexts holding aggregates should have a way to write them"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.boundedContexts().stream()
                    .filter(mod -> mod.aggregateIds() != null && !mod.aggregateIds().isEmpty())
                    .filter(mod -> isEmpty(mod.useCaseIds()) && isEmpty(mod.subscriptionIds())
                            && isEmpty(mod.scheduledTriggerIds()))
                    .filter(mod -> m.processes().stream().noneMatch(p -> mod.id().equals(p.ownerBoundedContextId())))
                    .filter(mod -> m.flows().stream().noneMatch(f -> mod.id().equals(f.targetBoundedContextId())))
                    .map(mod -> new LintFinding(id(), LintSeverity.INFO, "BoundedContext", mod.id(), mod.name(),
                            "Has aggregates but no use cases, subscriptions, processes, flows or triggers"
                                    + " — who writes to them?"))
                    .toList();
        }
    }

    /**
     * Step 4 of the path: every operation is a pipeline — gather, transform, then write or
     * return. A use case whose steps do neither of the last two does nothing observable.
     */
    static class UseCasePipeline implements LintRule {
        public String id() { return "use-case-pipeline"; }
        public String description() { return "Use cases with steps should end in a write or a return"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.useCases().stream()
                    .filter(uc -> uc.steps() != null && !uc.steps().isEmpty())
                    .filter(uc -> uc.outputModelId() == null)
                    .filter(uc -> uc.steps().stream()
                            .filter(s -> s.type() != null)
                            .map(s -> s.type().phase())
                            .noneMatch(p -> p == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.StepPhase.WRITE
                                    || p == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.StepPhase.COMPOSE
                                    || p == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.StepPhase.CUSTOM))
                    .map(uc -> new LintFinding(id(), LintSeverity.INFO, "UseCase", uc.id(), uc.name(),
                            "Its steps only gather/transform, and it declares no output model — it neither"
                                    + " writes nor returns. What does this use case do?"))
                    .toList();
        }
    }

    /**
     * Step 4 of the path: a Custom step is a two-zone hook, and its spec is natural language.
     * With an intent, the scaffold documents itself and {@code mvn modux:ai-complete} can propose
     * the implementation; without it, the hook is a TODO with no contract.
     */
    static class CustomStepIntent implements LintRule {
        public String id() { return "custom-step-intent"; }
        public String description() { return "Custom steps should state their intent in natural language"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.useCases().stream()
                    .filter(uc -> uc.steps() != null)
                    .flatMap(uc -> uc.steps().stream()
                            .filter(s -> s.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.Custom)
                            .filter(s -> isBlank(s.intent()))
                            .map(s -> new LintFinding(id(), LintSeverity.INFO, "UseCaseStep", s.id(),
                                    uc.name() + "." + s.name(),
                                    "Custom step without an intent — describe what it does in natural language"
                                            + " so the scaffold self-documents and ai-complete can propose the code.")))
                    .toList();
        }
    }

    /**
     * Step 4 of the path, for aggregate operations: no sets, no emits, no output = decoration —
     * unless the operation carries a natural-language intent (the spec of its two-zone hook).
     */
    static class OperationPipeline implements LintRule {
        public String id() { return "operation-pipeline"; }
        public String description() { return "Aggregate operations should write state, emit events or return"; }
        public List<LintFinding> apply(ModelSnapshot m) {
            return m.aggregates().stream()
                    .flatMap(a -> a.operations().stream()
                            .filter(op -> (op.steps() == null || op.steps().isEmpty())
                                    && isBlank(op.sets()) && isBlank(op.emits())
                                    && op.outputModelId() == null && isBlank(op.intent()))
                            .map(op -> new LintFinding(id(), LintSeverity.INFO, "Operation", op.id(),
                                    a.name() + "." + op.name(),
                                    "Neither sets state, emits events nor returns a model — declare its"
                                            + " effect, or state its intent in natural language.")))
                    .toList();
        }
    }

    /**
     * A modeled operation body may only contain step types legal for its carrier — the purity
     * table of {@code operation-body.md} §3, sourced from {@link OperationCarrier}. An aggregate
     * method may not {@code CallGateway} (I/O belongs to the use case), a domain service may not
     * {@code SetField} (it owns no state). Recurses into control-flow branches so a
     * {@code CallGateway} buried in the {@code else} of an aggregate {@code If} is still caught.
     * Legacy operations authored with {@code preconditions}/{@code sets}/{@code emits} carry no
     * modeled {@code steps} and are left alone until migrated.
     */
    static class OperationStepIllegalForCarrier implements LintRule {
        public String id() { return "operation-step-illegal-for-carrier"; }
        public String description() {
            return "An operation step's type must be legal for its carrier (aggregate/domain service)";
        }
        public List<LintFinding> apply(ModelSnapshot m) {
            var findings = new ArrayList<LintFinding>();
            for (var a : m.aggregates()) {
                for (var op : a.operations()) {
                    walk(op, OperationCarrier.AGGREGATE, a.name(), findings);
                }
            }
            for (var ds : m.domainServices()) {
                for (var op : ds.operations()) {
                    walk(op, OperationCarrier.DOMAIN_SERVICE, ds.name(), findings);
                }
            }
            return findings;
        }

        private void walk(OperationEntity op, OperationCarrier carrier, String ownerName,
                          List<LintFinding> out) {
            if (op.steps() == null) {
                return;
            }
            checkSteps(op.steps(), carrier, ownerName + "." + op.name(), out);
        }

        private void checkSteps(List<OperationStepEntity> steps, OperationCarrier carrier,
                                String path, List<LintFinding> out) {
            for (var step : steps) {
                if (!carrier.allows(step.type())) {
                    out.add(new LintFinding(id(), LintSeverity.ERROR, "OperationStep", step.id(),
                            path + " › " + step.name(),
                            "Step type " + step.type() + " is not legal in " + carrierLabel(carrier)
                                    + " — it stays pure (see operation-body.md §3)."));
                }
                if (step.then() != null) checkSteps(step.then(), carrier, path, out);
                if (step.elseSteps() != null) checkSteps(step.elseSteps(), carrier, path, out);
                if (step.body() != null) checkSteps(step.body(), carrier, path, out);
            }
        }

        private static String carrierLabel(OperationCarrier carrier) {
            return carrier == OperationCarrier.AGGREGATE ? "an aggregate method" : "a domain service";
        }
    }

    private static boolean isEmpty(List<String> list) {
        return list == null || list.isEmpty();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    // --- shared helpers ------------------------------------------------------------

    /** The catalog the interaction rules resolve refs and backing against, built from the snapshot. */
    private static InteractionCatalog catalogOf(ModelSnapshot m) {
        return new InteractionCatalog(m.roles(), m.uiAdapters(), m.pages(), m.useCases(),
                m.aggregates(), m.domainServices(), m.queryServices(), m.readModels(),
                m.externalSystems(),
                m.apis(), m.aiAgents(), m.processes(), m.workflows(), m.flows(),
                m.subscriptions(), m.domainEvents(), m.applicationEvents());
    }

    private static boolean isPii(ModelFieldEntity f) {
        return f.piiClassification() != null && f.piiClassification() != PiiClassification.NONE;
    }

    private static ModelEntity modelOfAggregate(ModelSnapshot m, String aggregateId) {
        if (aggregateId == null) return null;
        var aggregate = m.aggregates().stream().filter(a -> a.id().equals(aggregateId)).findFirst().orElse(null);
        if (aggregate == null || aggregate.modelId() == null) return null;
        return m.models().stream().filter(mo -> mo.id().equals(aggregate.modelId())).findFirst().orElse(null);
    }

}
