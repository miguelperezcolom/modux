package io.mateu.modux.modeldrivengenerator.infra.in.rest;

import io.mateu.modux.modeldrivengenerator.application.usecases.flow.coherence.FlowContextMapCoherenceService;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.flow.vo.FlowArchetype;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.boundedcontext.vo.SubdomainType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.process.vo.ProcessStepType;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InvariantEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InvariantConditionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AreaEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ArchimateRelationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.NoteEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProcessStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AclEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AggregateEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.AiAgentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModuleEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SagaEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SagaStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ButtonGroupEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.CustomCodeEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GroupButtonEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.GatewayBranchConditionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowGatewayEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiOperationImplementationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProxyApiEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProxyOperationRouteEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApiOperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ApplicationEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseEntity;
import io.mateu.modux.modeldrivengenerator.application.out.store.ModelStore;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ContextMapRelationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainEventEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DomainServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DiagramEdgeEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DiagramEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DiagramNodeEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DiagramPointEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.EntityEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ValueObjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalApiOperationUseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReferencedProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemTableEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemUseCaseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.McpGatewayEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.McpServerEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.RagContentSourceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.RagEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.RoleEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.FlowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelMappingEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelMappingRuleEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.TransformationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.TransformationRefEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.BoundedContextEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.OperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ScheduledTriggerEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageButtonEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.EtlFlowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.DocumentEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.IdentityProviderEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.NotificationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.EtlStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageWizardStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryOperationEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.PageFieldConfigEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiAdapterEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiComponentNodeEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UiMenuItemEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UseCaseStepEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProcessEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ProjectionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.QueryServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ReadModelEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ServiceEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.UrlEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.SubscriptionEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ViewEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.WorkflowStepEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.mateu.modux.modeldrivengenerator.application.usecases.model.CatalogReflection;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * JSON API consumed by the graphical editor web component (editor/ package,
 * &lt;modux-editor-connected&gt;). Serves a projection of the model, applies the
 * editor's mutation commands, and persists the diagram geometry as the store's
 * {@code diagrams} section — a separate structure that only references the
 * authored elements by id, so paint concerns never leak into the elements
 * themselves.
 */
@RestController
@RequestMapping("/modux/editor")
@CrossOrigin
@RequiredArgsConstructor
public class EditorApiController {

    private final ModelStore repository;
    private final FlowContextMapCoherenceService coherenceService;
    private final io.mateu.modux.modeldrivengenerator.application.out.ProjectStorePort projectStore;
    private final io.mateu.modux.modeldrivengenerator.infra.out.persistence.home.ProjectReferenceService projectReferences;
    private final io.mateu.modux.modeldrivengenerator.infra.out.persistence.WorkflowGatewayGraph workflowGraph;
    private final EditorProjectSupport projects;
    private final EditorModelProjection projection;
    private final WorkflowEditorCommands workflowCommands;
    private final AgentEditorCommands agentCommands;
    private final UiEditorCommands uiCommands;
    private final io.mateu.modux.modeldrivengenerator.application.usecases.uiadapter.derive.DeriveMenuCrudUseCase deriveMenuCrud;

    // ---- projection -------------------------------------------------------

    public record BoundedContextDto(String id, String name, String subdomainType, String serviceId,
                            List<UseCaseDto> useCases, List<DomainEventDto> domainEvents,
                            List<ReadModelDto> readModels, List<DomainServiceDto> domainServices,
                            List<ApplicationEventDto> applicationEvents,
                            List<QueryServiceDto> queryServices,
                            List<ScheduledTriggerDto> scheduledTriggers,
                            String identityProviderId,
                            /** UI apps owned by this bounded context (the apps themselves travel in uiApps). */
                            List<String> uiAppIds) {}

    public record ScheduledTriggerDto(String id, String name, String cronExpression, String useCaseId) {}
    /** A code boundedContext: distribution unit inside a bounded context; services deploy them. */
    public record ModuleDto(String id, String name, String boundedContextId, List<String> elementIds, boolean main) {}

    public record ServiceDto(String id, String name, List<String> moduleIds,
                             String database, boolean outboxEnabled, List<String> urlIds) {}
    public record DomainServiceDto(String id, String name) {}
    public record ApplicationEventDto(String id, String name) {}
    public record DomainEventDto(String id, String name,
                                 /** Born as a machine-made stub (a CRUD lifecycle event). */
                                 boolean derived) {}
    public record ReadModelDto(String id, String name, String aggregateId) {}
    /** Who emits a domain event: an aggregate, through its operations' `emits`. */
    public record EmissionDto(String sourceId, String domainEventId) {}
    public record ExternalSystemDto(String id, String name, List<ExternalUseCaseDto> useCases,
                                    List<ExternalTableDto> tables,
                                    List<McpServerDto> mcpServers,
                                    /** Set when the system IS another modux project: where it lives (§4.7). */
                                    ReferencedProjectDto referencedProject,
                                    /** Set when this system lives inside another one (subsystem). */
                                    String parentExternalSystemId) {}
    /** Where a referenced modux project lives — versioned with the model, not with the machine. */
    public record ReferencedProjectDto(String gitUrl, String branch, String path) {}
    /** A table/dataset owned by an external system — pollable into a read model. */
    public record ExternalTableDto(String id, String name) {}
    /** An MCP server published by an external system — a tool surface for AI agents. */
    public record McpServerDto(String id, String name, String uri) {}
    public record ExternalUseCaseDto(String id, String name) {}
    /** An external system calls one of our use cases in through an INBOUND ACL. */
    public record ExternalCallDto(String externalSystemId, String useCaseId) {}
    /** One of our use cases calls a use case OFFERED by an external system. */
    public record ExternalUseCaseCallDto(String sourceId, String targetId) {}
    /**
     * A strategic relation, 100% COMPUTED from the concrete cross-context dependencies
     * (use case calls, query calls, flows, aggregate references). The stored contextMap
     * entries only ANNOTATE the strategic type; `declared` says whether the pair has one.
     */
    public record RelationDto(String sourceId, String targetId, String type,
                              String inferredType,
                              boolean declared, String reasons) {}
    /** A hand-drawn ArchiMate relationship between any two elements. */
    public record ArchimateRelationDto(String id, String sourceId, String targetId,
                                       String type, String label) {}
    /** The declared human interface of a context, realized by apps and pages. */
    public record UiDto(String id, String name, String boundedContextId,
                        List<String> appIds, List<String> pageIds, List<String> actorIds) {}
    public record FlowDto(String id, String name, String sourceId, String targetId, String archetype,
                          String triggerAggregateId, String triggerEvent, String targetUseCaseId,
                          String readModelName) {}
    public record UseCaseDto(String id, String name, boolean policy,
                             /** Born as a machine-made stub (actor/page derivation), not declared by hand. */
                             boolean derived, List<String> stepIds, String inputModelId,
                             List<UseCaseStepDto> steps) {}
    /** An operation of a use case — the pipeline step, with its custom-code delegation. */
    public record UseCaseStepDto(String id, String name, String type, String customCodeId) {}
    public record AggregateDto(String id, String name, String boundedContextId,
                               /** The rules the aggregate protects — its very reason to exist. */
                               List<AggregateInvariantDto> invariants,
                               /** Its attributes (its Model's fields). */
                               List<FieldDto> fields,
                               /** The Model that holds its fields (edited via model-field commands). */
                               String modelId,
                               /** Its operations — each with an input and an output model. */
                               List<AggregateOperationDto> operations) {}
    public record AggregateInvariantDto(String id, String name, String expression, String errorMessage) {}
    /** An operation of an aggregate: a name, and the models it takes in and returns. */
    public record AggregateOperationDto(String id, String name, String inputModelId, String outputModelId) {}
    /**
     * A field (attribute) of an aggregate / entity / Record VO — one ModelField of its Model:
     * a name, whether it is required, its type (primitive | enum | model | value-object) via
     * typeKind + typeRef, and the modelId it lives in.
     */
    public record FieldDto(String id, String name, boolean required, String typeKind, String typeRef,
                           boolean collection, String modelId) {}
    public record EntityDto(String id, String name, String aggregateId,
                            /** The rules this entity protects. */
                            List<AggregateInvariantDto> invariants,
                            /** Its attributes (its Model's fields). */
                            List<FieldDto> fields,
                            /** The Model that holds its fields. */
                            String modelId) {}
    /** One field of a value object (Record type) — its name and data type. */
    public record ValueObjectFieldDto(String name, String dataType, String stereotype) {}
    /**
     * A value object owned by an aggregate: its own fields (Record), enum values (Enum) or
     * wrapped type (Wrapper). Richer than a plain model — it can carry invariants.
     */
    public record ValueObjectDto(String id, String name, String aggregateId, String type,
                                 String dataType, List<ValueObjectFieldDto> fields,
                                 List<String> enumValues,
                                 /** The rules this value object protects. */
                                 List<AggregateInvariantDto> invariants) {}
    public record AggregateReferenceDto(String sourceAggregateId, String targetAggregateId, String label) {}
    public record ProcessStepDto(String id, String name, String type, String useCaseId, String roleId,
                                 String deadline, String compensationUseCaseId) {}
    public record ProcessDto(String id, String name, String triggerAggregateId, String triggerEvent,
                             String ownerBoundedContextId, String onCompletionEventName, String sla,
                             List<ProcessStepDto> steps) {}
    public record WorkflowStepDto(String id, String name, String emittedEventName,
                                  String targetUseCaseId, String completionEventName,
                                  List<String> dependsOnStepIds, String type,
                                  String handoffWorkflowId, String roleId, String deadline,
                                  String compensationUseCaseId, String formPageId) {}
    /** A LOOSE gateway: its workflow is inferred from its links. */
    public record GatewayBranchConditionDto(String targetId, String expression) {}
    public record WorkflowGatewayDto(String id, String name, String type, String semantics,
                                     List<String> sourceIds, List<String> targetIds,
                                     List<GatewayBranchConditionDto> branchConditions) {}
    /** A cross-context orchestrator living OUTSIDE the bounded contexts (no owner boundedContext). */
    public record WorkflowDto(String id, String name, String triggerAggregateId,
                              String triggerDomainServiceId, String triggerUseCaseId,
                              String triggerEvent, String onCompletionEventName,
                              List<WorkflowStepDto> steps) {}
    /** A use case acts on an aggregate (CallAggregateOperation / SaveAggregate step). */
    public record AggregateCallDto(String sourceId, String targetId) {}
    public record SubscriptionActionDto(String type, String useCaseId, String sagaId,
                                        String projectionId) {}
    public record SubscriptionDto(String id, String name, String eventName, String consumerGroup,
                                  List<SubscriptionActionDto> actions) {}
    public record ProjectionDto(String id, String name, String readModelId, String readModelName,
                                List<String> handledEventIds, String sourceAggregateId,
                                String boundedContextId, String sourceExternalUseCaseId,
                                String sourceExternalTableId) {}
    public record ViewDto(String id, String name, String kind, List<String> memberIds) {}
    /** A business actor (RoleEntity) shown on the context map. */
    public record ActorDto(String id, String name) {}
    /** An AI agent; external = someone else's agent, entering through MCP gateways. */
    public record AiAgentDto(String id, String name, boolean external) {}
    public record AgentUseDto(String agentId, String useCaseId) {}
    /** An AI agent calls an operation offered by an external system. */
    public record AgentExternalUseDto(String agentId, String externalUseCaseId) {}
    /** An AI agent consumes an MCP server published by an external system. */
    public record AgentMcpUseDto(String agentId, String mcpServerId) {}
    /** Our MCP gateway: aggregates MCPs and exposes APIs/operations/use cases/RAGs as MCP. */
    public record McpGatewayDto(String id, String name, List<String> mcpServerIds,
                                List<String> apiIds, List<String> apiOperationIds,
                                List<String> useCaseIds, List<String> ragIds) {}
    /** An AI agent consumes an MCP gateway (one curated tool surface). */
    public record AgentGatewayUseDto(String agentId, String gatewayId) {}
    /** An AI agent calls an API operation as a tool. */
    public record AgentApiOpUseDto(String agentId, String apiOperationId) {}
    /** An agent may call a whole API — or an API proxy — as a tool (every operation). */
    public record AgentApiUseDto(String agentId, String apiId) {}
    /** An AI agent consults a query service as a read tool. */
    public record AgentQueryUseDto(String agentId, String queryServiceId) {}
    /** An AI agent delegates work to another agent. */
    public record AgentDelegationDto(String agentId, String delegateAgentId) {}
    /** An actor talks to an AI agent (a chat/supervision UI derives from it). */
    public record ActorAgentUseDto(String actorId, String agentId) {}
    /** A domain/application event triggers a run of the agent (reactive agents). */
    public record AgentTriggerDto(String eventId, String agentId) {}
    /** A RAG knowledge base, optionally fed from read models and external content. */
    public record RagDto(String id, String name, String description,
                         List<String> sourceReadModelIds,
                         List<RagContentSourceDto> contentSources,
                         List<String> sourceExternalTableIds,
                         List<String> sourceApiIds,
                         List<String> sourceExternalSystemIds,
                         List<String> sourceBoundedContextIds) {}
    public record RagContentSourceDto(String type, String uri) {}
    /** A published API as a first-class element; operations wire to their implementers. */
    public record ApiDto(String id, String name, List<ApiOperationDto> operations,
                         String publishedByExternalSystemId) {}
    public record ApiOperationDto(String id, String name, String httpMethod, String path,
                                  String targetBoundedContextId, String targetUseCaseId,
                                  String targetQueryServiceId, String targetQueryOperationId) {}
    /** An AI agent grounds its answers on a knowledge base. */
    public record AgentRagDto(String agentId, String ragId) {}
    /** Use case A invokes use case B (a CallUseCase step in A). */
    public record UseCaseCallDto(String sourceId, String targetId) {}
    public record QueryServiceDto(String id, String name,
                                  /** Born as a machine-made stub (a listing's derived query service). */
                                  boolean derived, List<QueryOperationDto> operations) {}
    public record QueryOperationDto(String id, String name) {}
    /** Use case A consumes query service B (a CallQueryService step in A). */
    public record QueryCallDto(String sourceId, String targetId) {}
    /** An actor uses a use case or a query service directly (a UI is derived from it). */
    public record ActorUseDto(String actorId, String targetId) {}
    /** An actor depends on an external system (strategic context-map dependency). */
    public record ActorExternalDependencyDto(String actorId, String externalSystemId) {}
    /** An external system depends on another system, a published API or an API proxy.
     * Between systems the relation may be typed: DEPENDS (plain) or CQRS. */
    public record ExternalSystemDependencyDto(String sourceId, String targetId, String type) {}
    /** An API proxy/cache: fronts a published API, consumable exactly like it. */
    public record ProxyApiDto(String id, String name, String targetApiId,
                              String publishedByExternalSystemId) {}
    /** The SAME published API, (also) implemented in one of our bounded contexts. */
    public record ApiImplementationDto(String apiId, String boundedContextId) {}
    /** One proxy operation routed to an implementation site of the fronted API. */
    public record ProxyOperationRouteDto(String proxyId, String operationId, String targetSiteId) {}
    /** An external system calls one API operation at a site (published API, proxy or implementation). */
    public record ExternalOperationUseDto(String externalSystemId, String operationId, String siteId) {}
    /** The use case implementing one operation at one implementation site. */
    public record ApiOperationImplementationDto(String apiId, String operationId, String boundedContextId, String useCaseId) {}
    /** A UI app (UiAdapterEntity): the shell an actor opens; its menu tree points at pages. */
    public record UiAppDto(String id, String name, String title, List<UiMenuEntryDto> menuItems,
                           String type, String headerPageId, String homePageId, String homeAppId,
                           String modelId, String viewPageId, String editPageId,
                           String identityProviderId) {}
    /** One entry of a UI app's menu tree — Mateu menus are trees, hence the recursion. */
    public record UiMenuEntryDto(String label, String icon, String pageId, List<UiMenuEntryDto> children, String id, String uiAdapterId, String useCaseId,
                                  String aggregateId, String queryServiceId, String queryOperationId) {}
    /** A page of the UI map; buttons = toolbar + bottomBar, each firing a use case. */
    public record UiPageDto(String id, String name, String type, String route, String modelId,
                            String modelName, String aggregateId, String listingQueryServiceId,
                            List<UiPageButtonDto> buttons,
                            List<UiFieldDto> viewmodelFields,
                            List<UiComponentNodeDto> content,
                            List<UiWizardStepDto> wizardSteps,
                            String crudDetailPageId, String crudDetailAppId,
                            String crudCreatePageId, String crudCreateAppId,
                            /** The hand-written code the page delegates to (CUSTOM page). */
                            String customCodeId,
                            List<String> toolbarGroupIds, List<String> bottomBarGroupIds) {}

    public record UiWizardStepDto(String pageId, String label, String id) {}

    public record EtlFlowDto(String id, String name, String ownerBoundedContextId, List<EtlStepDto> steps,
                             String identityProviderId) {}

    public record IdentityProviderDto(String id, String name, String type, String issuer,
                                      String publishedByExternalSystemId) {}

    public record NotificationDto(String id, String name, String ownerBoundedContextId, String eventId,
                                  List<String> channels, List<String> recipientRoleIds) {}

    public record DocumentDto(String id, String name, String ownerBoundedContextId, String kind,
                              String modelId, String queryServiceId, String queryOperationId) {}

    public record EtlStepDto(String id, String name, String type, String externalTableId,
                             String apiId, String operationId, String eventId, String mappingId) {}
    /** A node of a page's content tree: a Mateu layout (with children) or a leaf component. */
    public record UiComponentNodeDto(String id, String kind, String title, String text, String label,
                                     String useCaseId, String mappingId, String modelId,
                                     String queryServiceId, String queryOperationId,
                                     String fieldId, String stereotype, Integer colspan,
                                     List<UiComponentNodeDto> children, String customCodeId,
                                     String detailPageId) {}
    /** A viewmodel field as the page designer sees it: model field + its PageFieldConfig. */
    public record UiFieldDto(String fieldId, String name, String type, String stereotype,
                             Integer colspan, String label, String help) {}
    public record UiPageButtonDto(String label, String useCaseId, String mappingId, String bar) {}
    /** An actor uses a UI app (RoleEntity.uiAdapterIds — the actor→app link of the UI map). */
    public record ActorAppUseDto(String actorId, String appId) {}
    /** A bare id+name reference (models, mappings…) for the designer's pickers. */
    public record NamedRefDto(String id, String name) {}
    public record ModelFieldDto(String id, String name, String type) {}
    /** A data model with its fields — the mappings view edits them in place. */
    public record ModelRefDto(String id, String name, List<ModelFieldDto> fields) {}
    public record MappingRuleDto(String id, String sourceFieldId, String targetFieldId) {}
    /** What a transformation reads or writes: a whole model (fieldId null) or one field. */
    public record TransformationRefDto(String modelId, String fieldId) {}
    public record CustomCodeDto(String id, String name, List<String> usedElementIds) {}
    public record GroupButtonDto(String id, String label, String useCaseId, String apiId,
                                 String apiOperationId, String mappingId) {}
    /** A reusable group of buttons; pages hook it to a bar, groups nest groups. */
    public record ButtonGroupDto(String id, String name, List<GroupButtonDto> buttons,
                                 List<String> groupIds) {}
    public record TransformationDto(String id, String name, List<TransformationRefDto> inputs,
                                    TransformationRefDto output, String customCodeId) {}

    public record EditorModelDto(
            List<BoundedContextDto> boundedContexts,
            List<ExternalSystemDto> externalSystems,
            List<RelationDto> relations,
            List<FlowDto> flows,
            List<AggregateDto> aggregates,
            List<EntityDto> entities,
            List<ValueObjectDto> valueObjects,
            List<AggregateReferenceDto> aggregateReferences,
            List<ProcessDto> processes,
            List<ViewDto> views,
            List<EmissionDto> emissions,
            List<ActorDto> actors,
            List<UseCaseCallDto> useCaseCalls,
            List<QueryCallDto> queryCalls,
            List<ActorUseDto> actorUses,
            List<ExternalCallDto> externalCalls,
            List<ExternalUseCaseCallDto> externalUseCaseCalls,
            List<AiAgentDto> aiAgents,
            List<AgentUseDto> agentUses,
            List<WorkflowDto> workflows,
            List<EtlFlowDto> etlFlows,
            List<IdentityProviderDto> identityProviders,
            List<NotificationDto> notifications,
            List<DocumentDto> documents,
            List<AggregateCallDto> aggregateCalls,
            List<EmissionDto> useCaseEmissions,
            List<SubscriptionDto> subscriptions,
            List<ProjectionDto> projections,
            List<AgentExternalUseDto> agentExternalUses,
            List<RagDto> rags,
            List<AgentRagDto> agentRags,
            List<ApiDto> apis,
            List<ActorExternalDependencyDto> actorExternalDependencies,
            List<ExternalSystemDependencyDto> externalSystemDependencies,
            List<ProxyApiDto> proxyApis,
            List<AgentMcpUseDto> agentMcpUses,
            List<McpGatewayDto> mcpGateways,
            List<AgentGatewayUseDto> agentGatewayUses,
            List<AgentApiOpUseDto> agentApiOpUses,
            List<AgentApiUseDto> agentApiUses,
            List<AgentQueryUseDto> agentQueryUses,
            List<AgentDelegationDto> agentDelegations,
            List<ActorAgentUseDto> actorAgentUses,
            List<AgentTriggerDto> agentTriggers,
            List<ApiImplementationDto> apiImplementations,
            List<ProxyOperationRouteDto> proxyOperationRoutes,
            List<ExternalOperationUseDto> externalOperationUses,
            List<ApiOperationImplementationDto> apiOperationImplementations,
            List<UiAppDto> uiApps,
            List<UiPageDto> pages,
            List<ActorAppUseDto> actorAppUses,
            List<ModelRefDto> models,
            List<NamedRefDto> sagas,
            List<ModuleDto> modules,
            List<ServiceDto> services,
            List<TransformationDto> transformations,
            List<CustomCodeDto> customCodes,
            List<ButtonGroupDto> buttonGroups,
            List<WorkflowGatewayDto> workflowGateways,
            List<MappingRefDto> modelMappings,
            List<NoteDto> notes,
            List<AreaDto> areas,
            List<ArchimateRelationDto> archimateRelations,
            List<UiDto> uis,
            List<UrlDto> urls,
            List<io.mateu.modux.modeldrivengenerator.application.usecases.interaction.shared.InteractionDto> interactions,
            /** Element id → its description, for the editor to show on hover. */
            java.util.Map<String, String> descriptions) {}

    public record NoteDto(String id, String text, List<String> targetIds, List<String> edgeRefs) {}

    public record AreaDto(String id, String name) {}

    public record UrlDto(String id, String name, String url) {}

    public record MappingRefDto(String id, String name, String sourceModelId, String targetModelId,
                                List<MappingRuleDto> rules, String customCodeId) {}

    /**
     * Cheap, order-independent fingerprint of the whole store. The editor
     * listens for changes over SSE (/events) with this endpoint as the
     * polling fallback — both cover edits made from the Mateu CRUDs, another
     * editor instance, or MCP.
     */
    @GetMapping("/version")
    public Map<String, String> version() {
        return Map.of("version", currentVersion());
    }

    private String currentVersion() {
        var elements = repository.allElements();
        var hash = elements.stream().mapToInt(Objects::hashCode).sum() * 31 + elements.size();
        return Integer.toHexString(hash);
    }

    // The server used to push its fingerprint over SSE so clients never polled. There is no
    // server to notify from once the model is a file in the repository — the IDE's own file
    // watching is what tells the editor something changed. The web client already falls back
    // to polling /version when the stream is absent. See docs/design/ide-plugin.md §5.1.

    static UiComponentNodeDto toComponentNode(UiComponentNodeEntity node) {
        return new UiComponentNodeDto(node.id(), node.kind(), node.title(), node.text(), node.label(),
                node.useCaseId(), node.mappingId(), node.modelId(),
                node.queryServiceId(), node.queryOperationId(),
                node.fieldId(), node.stereotype(), node.colspan(),
                (node.children() == null ? List.<UiComponentNodeEntity>of() : node.children()).stream()
                        .map(EditorApiController::toComponentNode)
                        .toList(),
                node.customCodeId(),
                node.detailPageId());
    }

    static UiMenuEntryDto toMenuEntry(UiMenuItemEntity item) {
        return new UiMenuEntryDto(item.label(), item.icon(), item.pageId(),
                (item.children() == null ? List.<UiMenuItemEntity>of() : item.children()).stream()
                        .map(EditorApiController::toMenuEntry)
                        .toList(),
                item.id(), item.uiAdapterId(), item.useCaseId(),
                item.aggregateId(), item.queryServiceId(), item.queryOperationId());
    }

    // ---- commands ---------------------------------------------------------

    @GetMapping("/model")
    public EditorModelDto model() {
        return projection.build();
    }

    // Deriving an interaction — the message chain from a use case, an API operation or an event —
    // is read-only and needs nothing but the model the editor already holds, so it belongs on the
    // client. The view it feeds already treats a missing derivation as "nothing to show".

    public record EditorCommand(String kind, String sourceId, String targetId, String type,
                                String id, String name, String subdomainType, String boundedContextId,
                                String aggregateId,
                                /** Polymorphic owner of an invariant OR a field: aggregate, value object or entity. */
                                String ownerId,
                                /** Whether a field is mandatory. */
                                Boolean required,
                                /** Whether a field is a collection (List/Set) of its type. */
                                Boolean collection,
                                /** An invariant's primary condition: the rule expression and its error message. */
                                String expression, String errorMessage,
                                String archetype, String triggerAggregateId, String triggerEvent,
                                String triggerDomainServiceId, String triggerUseCaseId,
                                String readModelName, String targetUseCaseId,
                                List<ProcessStepDto> steps,
                                String processId, String afterStepId, String stepType,
                                String roleId, String deadline, String useCaseId,
                                String compensationUseCaseId,
                                List<String> memberIds,
                                String workflowId, String emittedEventName,
                                String completionEventName, String dependsOnStepId,
                                List<String> dependsOnStepIds,
                                List<WorkflowStepDto> workflowSteps,
                                Boolean policy,
                                String uri, String externalUseCaseId, String externalTableId,
                                String apiId, String httpMethod, String path,
                                Boolean external,
                                String proxyId, String operationId, String targetSiteId,
                                String pageType, String appId, String menuLabel, String label,
                                String pageId, String parentLabel, String queryServiceId,
                                String modelId, String actorId,
                                String fieldId, String stereotype, Integer colspan,
                                List<String> fieldIds,
                                String itemId, String parentId, String toAppId,
                                String queryOperationId, String mappingId,
                                String componentId, String parentComponentId, String componentKind,
                                String beforeComponentId, String title, String text,
                                String cronExpression, String beforeItemId, String etlFlowId,
                                String serviceId, String elementId, String bar,
                                String detailPageId, String description, String triggerKind,
                                String triggerRef,
                                /** Where another modux project lives, for add-project-reference (§4.7). */
                                ReferencedProjectDto referencedProject,
                                List<io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionMessageEntity> messages) {}

    // Importing an OpenAPI/WSDL contract is a build step, not an editing gesture: it reads a file
    // and writes model elements. That is `modux:import-openapi` / `modux:import-asyncapi` in the
    // maven plugin, where it can run in CI and be re-run when the contract moves.

    // The ~/.modux repository catalog is gone with the home: what another project is, and where to
    // find it, becomes a coordinate stored in the model and versioned with it (§4.7).

    @PostMapping("/commands")
    public void apply(@RequestBody EditorCommand command) {
        switch (Objects.requireNonNull(command.kind(), "command.kind")) {
            case "add-relation" -> addRelation(command);
            case "add-archimate-relation" -> addArchimateRelation(command);
            case "set-archimate-relation-type" -> setArchimateRelationType(command);
            case "invert-archimate-relation" -> invertArchimateRelation(command);
            case "remove-archimate-relation" -> removeArchimateRelation(command);
            case "remove-relation" -> removeRelation(command);
            case "set-relation-type" -> setRelationType(command);
            case "add-boundedContext" -> addBoundedContext(command);
            case "add-transformation" -> uiCommands.addTransformation(command);
            case "add-custom-code" -> uiCommands.addCustomCode(command);
            case "add-button-group" -> uiCommands.addButtonGroup(command);
            case "remove-button-group" -> uiCommands.removeButtonGroup(command);
            case "add-group-button" -> uiCommands.addGroupButton(command);
            case "remove-group-button" -> uiCommands.removeGroupButton(command);
            case "set-group-button-target" -> uiCommands.setGroupButtonTarget(command);
            case "add-group-subgroup" -> uiCommands.addGroupSubgroup(command);
            case "remove-group-subgroup" -> uiCommands.removeGroupSubgroup(command);
            case "add-page-bar-group" -> uiCommands.addPageBarGroup(command);
            case "remove-page-bar-group" -> uiCommands.removePageBarGroup(command);
            case "remove-custom-code" -> uiCommands.removeCustomCode(command);
            case "set-mapping-custom-code" -> uiCommands.setMappingCustomCode(command);
            case "set-transformation-custom-code" -> uiCommands.setTransformationCustomCode(command);
            case "set-use-case-step-custom-code" -> uiCommands.setUseCaseStepCustomCode(command);
            case "set-page-custom-code" -> uiCommands.setPageCustomCode(command);
            case "set-page-component-custom-code" -> uiCommands.setPageComponentCustomCode(command);
            case "add-custom-code-use" -> uiCommands.addCustomCodeUse(command);
            case "remove-custom-code-use" -> uiCommands.removeCustomCodeUse(command);
            case "remove-transformation" -> uiCommands.removeTransformation(command);
            case "add-transformation-input" -> uiCommands.addTransformationInput(command);
            case "remove-transformation-input" -> uiCommands.removeTransformationInput(command);
            case "set-transformation-output" -> uiCommands.setTransformationOutput(command);
            case "add-model-field" -> uiCommands.addModelField(command);
            case "remove-model-field" -> uiCommands.removeModelField(command);
            case "set-model-field" -> uiCommands.setModelField(command);
            case "move-model-field" -> uiCommands.moveModelField(command);
            case "add-model-mapping-rule" -> uiCommands.addModelMappingRule(command);
            case "remove-model-mapping-rule" -> uiCommands.removeModelMappingRule(command);
            case "add-module" -> addModule(command);
            case "remove-module" -> removeModule(command);
            case "add-module-element" -> addModuleElement(command);
            case "remove-module-element" -> removeModuleElement(command);
            case "add-service" -> addService(command);
            case "set-workflow-step-role" -> workflowCommands.setWorkflowStepRole(command);
            case "add-service-module" -> addServiceModule(command);
            case "remove-service-module" -> removeServiceModule(command);
            case "add-external-system" -> addExternalSystem(command);
            case "set-external-system-parent" -> setExternalSystemParent(command);
            case "add-project-reference" -> addProjectReference(command);
            case "remove-external-system" -> removeExternalSystem(command);
            case "add-actor" -> addActor(command);
            case "remove-actor" -> removeActor(command);
            case "save-interaction" -> saveInteraction(command);
            case "remove-interaction" -> repository.deleteAllById(List.of(command.id()),
                    io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity.class);
            case "add-note" -> addNote(command);
            case "remove-note" -> removeNote(command);
            case "add-area" -> addArea(command);
            case "remove-area" -> removeArea(command);
            case "add-url" -> addUrl(command);
            case "remove-url" -> removeUrl(command);
            case "add-service-url" -> addServiceUrl(command);
            case "remove-service-url" -> removeServiceUrl(command);
            case "note-attach" -> noteAttach(command);
            case "note-detach" -> noteDetach(command);
            case "add-ai-agent" -> agentCommands.addAiAgent(command);
            case "remove-ai-agent" -> agentCommands.removeAiAgent(command);
            case "add-agent-use" -> agentCommands.addAgentUse(command);
            case "remove-agent-use" -> agentCommands.removeAgentUse(command);
            case "add-agent-external-use" -> agentCommands.addAgentExternalUse(command);
            case "remove-agent-external-use" -> agentCommands.removeAgentExternalUse(command);
            case "add-rag" -> agentCommands.addRag(command);
            case "remove-rag" -> agentCommands.removeRag(command);
            case "add-agent-rag" -> agentCommands.addAgentRag(command);
            case "remove-agent-rag" -> agentCommands.removeAgentRag(command);
            case "add-rag-source" -> agentCommands.addRagSource(command);
            case "remove-rag-source" -> agentCommands.removeRagSource(command);
            case "add-rag-content-source" -> agentCommands.addRagContentSource(command);
            case "remove-rag-content-source" -> agentCommands.removeRagContentSource(command);
            case "add-view-member" -> addViewMember(command);
            case "remove-view-member" -> removeViewMember(command);
            case "add-external-table" -> addExternalTable(command);
            case "remove-external-table" -> removeExternalTable(command);
            case "add-mcp-server" -> addMcpServer(command);
            case "remove-mcp-server" -> removeMcpServer(command);
            case "add-agent-mcp" -> agentCommands.addAgentMcp(command);
            case "remove-agent-mcp" -> agentCommands.removeAgentMcp(command);
            case "add-mcp-gateway" -> agentCommands.addMcpGateway(command);
            case "remove-mcp-gateway" -> agentCommands.removeMcpGateway(command);
            case "add-gateway-exposure" -> agentCommands.addGatewayExposure(command);
            case "remove-gateway-exposure" -> agentCommands.removeGatewayExposure(command);
            case "add-agent-gateway" -> agentCommands.addAgentGateway(command);
            case "remove-agent-gateway" -> agentCommands.removeAgentGateway(command);
            case "add-agent-api-operation" -> agentCommands.addAgentApiOperation(command);
            case "remove-agent-api-operation" -> agentCommands.removeAgentApiOperation(command);
            case "add-agent-api" -> agentCommands.addAgentApi(command);
            case "remove-agent-api" -> agentCommands.removeAgentApi(command);
            case "add-agent-query" -> agentCommands.addAgentQuery(command);
            case "remove-agent-query" -> agentCommands.removeAgentQuery(command);
            case "add-agent-delegate" -> agentCommands.addAgentDelegate(command);
            case "remove-agent-delegate" -> agentCommands.removeAgentDelegate(command);
            case "add-actor-agent" -> agentCommands.addActorAgent(command);
            case "remove-actor-agent" -> agentCommands.removeActorAgent(command);
            case "add-agent-trigger" -> agentCommands.addAgentTrigger(command);
            case "remove-agent-trigger" -> agentCommands.removeAgentTrigger(command);
            case "add-api-implementation" -> agentCommands.addApiImplementation(command);
            case "remove-api-implementation" -> agentCommands.removeApiImplementation(command);
            case "add-proxy-operation-route" -> agentCommands.addProxyOperationRoute(command);
            case "remove-proxy-operation-route" -> agentCommands.removeProxyOperationRoute(command);
            case "add-external-operation-use" -> agentCommands.addExternalOperationUse(command);
            case "remove-external-operation-use" -> agentCommands.removeExternalOperationUse(command);
            case "set-api-operation-implementation" -> agentCommands.setApiOperationImplementation(command);
            case "remove-api-operation-implementation" -> agentCommands.removeApiOperationImplementation(command);
            case "add-api" -> addApi(command);
            case "remove-api" -> removeApi(command);
            case "add-api-operation" -> addApiOperation(command);
            case "remove-api-operation" -> removeApiOperation(command);
            case "set-api-operation-target" -> setApiOperationTarget(command);
            case "add-aggregate" -> addAggregate(command);
            case "add-invariant" -> addInvariant(command);
            case "remove-invariant" -> removeInvariant(command);
            case "set-invariant-condition" -> setInvariantCondition(command);
            case "add-entity" -> addEntity(command);
            case "remove-entity" -> removeEntity(command);
            case "add-value-object" -> addValueObject(command);
            case "remove-value-object" -> removeValueObject(command);
            case "set-value-object-aggregate" -> setValueObjectAggregate(command);
            case "set-entity-aggregate" -> setEntityAggregate(command);
            case "add-operation" -> addOperation(command);
            case "remove-operation" -> removeOperation(command);
            case "set-model-field-type" -> uiCommands.setModelFieldType(command);
            case "set-model-field-required" -> uiCommands.setModelFieldRequired(command);
            case "set-model-field-collection" -> uiCommands.setModelFieldCollection(command);
            case "add-domain-event" -> addDomainEvent(command);
            case "add-domain-service" -> addDomainService(command);
            case "add-application-event" -> addApplicationEvent(command);
            case "remove-application-event" -> removeApplicationEvent(command);
            case "remove-domain-service" -> removeDomainService(command);
            case "add-emission" -> addEmission(command);
            case "add-use-case-call" -> addUseCaseCall(command);
            case "remove-use-case-call" -> removeUseCaseCall(command);
            case "add-use-case-step" -> addUseCaseStep(command);
            case "add-scheduled-trigger" -> addScheduledTrigger(command);
            case "remove-scheduled-trigger" -> removeScheduledTrigger(command);
            case "set-scheduled-trigger-target" -> setScheduledTriggerTarget(command);
            case "remove-use-case-step" -> removeUseCaseStep(command);
            case "add-aggregate-call" -> addAggregateCall(command);
            case "remove-aggregate-call" -> removeAggregateCall(command);
            case "add-query-service" -> addQueryService(command);
            case "remove-query-service" -> removeQueryService(command);
            case "add-query-call" -> addQueryCall(command);
            case "remove-query-call" -> removeQueryCall(command);
            case "add-actor-use" -> addActorUse(command);
            case "remove-actor-use" -> removeActorUse(command);
            case "add-actor-crud" -> addActorCrud(command);
            case "add-external-crud" -> addExternalCrud(command);
            case "remove-external-crud" -> removeExternalCrud(command);
            case "add-context-crud" -> addContextCrud(command);
            case "remove-context-crud" -> removeContextCrud(command);
            case "add-actor-external" -> addActorExternalDependency(command);
            case "remove-actor-external" -> removeActorExternalDependency(command);
            case "add-external-dependency" -> addExternalSystemDependency(command);
            case "remove-external-dependency" -> removeExternalSystemDependency(command);
            case "set-api-publisher" -> setApiPublisher(command);
            case "add-proxy-api" -> addProxyApi(command);
            case "remove-proxy-api" -> removeProxyApi(command);
            case "set-proxy-target" -> setProxyTarget(command);
            case "remove-actor-crud" -> removeActorCrud(command);
            case "add-use-case" -> addUseCase(command);
            case "remove-use-case" -> removeUseCase(command);
            case "add-external-call" -> addExternalCall(command);
            case "remove-external-call" -> removeExternalCall(command);
            case "add-external-use-case" -> addExternalUseCase(command);
            case "remove-external-use-case" -> removeExternalUseCase(command);
            case "add-external-uc-call" -> addExternalUcCall(command);
            case "remove-external-uc-call" -> removeExternalUcCall(command);
            case "add-read-model" -> addReadModel(command);
            case "remove-read-model" -> removeReadModel(command);
            case "add-projection" -> addProjection(command);
            case "remove-projection" -> removeProjection(command);
            case "remove-boundedContext" -> removeBoundedContext(command);
            case "remove-aggregate" -> removeAggregate(command);
            case "remove-domain-event" -> removeDomainEvent(command);
            case "remove-emission" -> removeEmission(command);
            case "rename-element" -> renameElement(command);
            case "add-flow" -> addFlow(command);
            case "remove-flow" -> removeFlow(command);
            case "add-process" -> addProcess(command);
            case "remove-process" -> removeProcess(command);
            case "add-process-step" -> addProcessStep(command);
            case "remove-process-step" -> removeProcessStep(command);
            case "move-process-step" -> moveProcessStep(command);
            case "update-process-step" -> updateProcessStep(command);
            case "add-view" -> addView(command);
            case "remove-view" -> removeView(command);
            case "add-workflow" -> workflowCommands.addWorkflow(command);
            case "remove-workflow" -> workflowCommands.removeWorkflow(command);
            case "add-workflow-step" -> workflowCommands.addWorkflowStep(command);
            case "move-workflow-step" -> workflowCommands.moveWorkflowStep(command);
            case "migrate-processes-to-workflows" -> workflowCommands.migrateProcessesToWorkflows();
            case "migrate-sagas-to-workflows" -> workflowCommands.migrateSagasToWorkflows();
            case "add-workflow-gateway" -> workflowCommands.addWorkflowGateway(command);
            case "set-gateway-semantics" -> workflowCommands.setGatewaySemantics(command);
            case "set-gateway-branch-condition" -> workflowCommands.setGatewayBranchCondition(command);
            case "remove-workflow-gateway" -> workflowCommands.removeWorkflowGateway(command);
            case "add-workflow-link" -> workflowCommands.addWorkflowLink(command);
            case "remove-workflow-link" -> workflowCommands.removeWorkflowLink(command);
            case "remove-workflow-step" -> workflowCommands.removeWorkflowStep(command);
            case "update-workflow-step" -> workflowCommands.updateWorkflowStep(command);
            case "set-workflow-step-form" -> workflowCommands.setWorkflowStepForm(command);
            case "add-workflow-dependency" -> workflowCommands.addWorkflowDependency(command);
            case "set-workflow-trigger" -> workflowCommands.setWorkflowTrigger(command);
            case "remove-workflow-dependency" -> workflowCommands.removeWorkflowDependency(command);
            case "create-ui-app" -> uiCommands.createUiApp(command);
            case "add-ui" -> addUi(command);
            case "remove-ui" -> removeUi(command);
            case "set-ui-context" -> setUiContext(command);
            case "add-ui-assignment" -> addUiAssignment(command);
            case "remove-ui-assignment" -> removeUiAssignment(command);
            case "add-ui-serving" -> addUiServing(command);
            case "remove-ui-serving" -> removeUiServing(command);
            case "set-app-header-page" -> uiCommands.setAppHeaderPage(command);
            case "set-app-home-page" -> uiCommands.setAppHomePage(command);
            case "set-app-model" -> uiCommands.setAppModel(command);
            case "set-crud-detail" -> uiCommands.setCrudTarget(command, true);
            case "set-crud-create" -> uiCommands.setCrudTarget(command, false);
            case "set-app-view-page" -> uiCommands.setAppViewOrEdit(command, true);
            case "set-app-edit-page" -> uiCommands.setAppViewOrEdit(command, false);
            case "add-notification" -> uiCommands.addNotification(command);
            case "remove-notification" -> uiCommands.removeNotification(command);
            case "set-notification-event" -> uiCommands.setNotificationEvent(command);
            case "add-notification-recipient" -> uiCommands.toggleNotificationRecipient(command, true);
            case "remove-notification-recipient" -> uiCommands.toggleNotificationRecipient(command, false);
            case "add-document" -> uiCommands.addDocument(command);
            case "remove-document" -> uiCommands.removeDocument(command);
            case "set-document-model" -> uiCommands.setDocumentModel(command);
            case "set-document-query" -> uiCommands.setDocumentQuery(command);
            case "set-project-locales" -> uiCommands.setProjectLocales(command);
            case "add-identity-provider" -> uiCommands.addIdentityProvider(command);
            case "remove-identity-provider" -> uiCommands.removeIdentityProvider(command);
            case "set-idp-publisher" -> uiCommands.setIdpPublisher(command);
            case "set-identity-provider" -> uiCommands.setIdentityProvider(command);
            case "add-etl-flow" -> uiCommands.addEtlFlow(command);
            case "remove-etl-flow" -> uiCommands.removeEtlFlow(command);
            case "add-etl-step" -> uiCommands.addEtlStep(command);
            case "remove-etl-step" -> uiCommands.removeEtlStep(command);
            case "add-model-mapping" -> uiCommands.addModelMapping(command);
            case "remove-model-mapping" -> uiCommands.removeModelMapping(command);
            case "add-model" -> uiCommands.addModel(command);
            case "remove-model" -> uiCommands.removeModel(command);
            case "add-page-wizard-step" -> uiCommands.addPageWizardStep(command);
            case "set-wizard-step-page" -> uiCommands.setWizardStepPage(command);
            case "remove-page-wizard-step" -> uiCommands.removePageWizardStep(command);
            case "move-page-wizard-step" -> uiCommands.movePageWizardStep(command);
            case "delete-ui-app" -> uiCommands.deleteUiApp(command);
            case "create-ui-page" -> uiCommands.createUiPage(command);
            case "delete-ui-page" -> uiCommands.deleteUiPage(command);
            case "add-menu-item" -> uiCommands.addMenuItem(command);
            case "remove-menu-item" -> uiCommands.removeMenuItem(command);
            case "add-ui-crud" -> addUiCrud(command);
            case "remove-ui-crud" -> removeUiCrud(command);
            case "set-menu-page" -> uiCommands.setMenuPage(command);
            case "move-menu-item" -> uiCommands.moveMenuItem(command);
            case "set-menu-app" -> uiCommands.setMenuApp(command);
            case "set-menu-use-case" -> uiCommands.setMenuUseCase(command);
            case "set-menu-aggregate" -> uiCommands.setMenuAggregate(command);
            case "set-menu-query-operation" -> uiCommands.setMenuQueryOperation(command);
            case "add-page-button" -> uiCommands.addPageButton(command);
            case "remove-page-button" -> uiCommands.removePageButton(command);
            case "set-page-listing" -> uiCommands.setPageListing(command);
            case "set-page-model" -> uiCommands.setPageModel(command);
            case "rename-ui-page" -> uiCommands.renameUiPage(command);
            case "set-page-type" -> uiCommands.setPageType(command);
            case "set-page-route" -> uiCommands.setPageRoute(command);
            case "set-page-button" -> uiCommands.setPageButton(command);
            case "set-page-field-config" -> uiCommands.setPageFieldConfig(command);
            case "set-page-field-order" -> uiCommands.setPageFieldOrder(command);
            case "add-page-component" -> uiCommands.addPageComponent(command);
            case "remove-page-component" -> uiCommands.removePageComponent(command);
            case "set-page-component" -> uiCommands.setPageComponent(command);
            case "move-page-component" -> uiCommands.movePageComponent(command);
            case "add-actor-app" -> uiCommands.addActorApp(command);
            case "remove-actor-app" -> uiCommands.removeActorApp(command);
            default -> throw new IllegalArgumentException("Unknown command kind: " + command.kind());
        }
    }

    /** Command rejections travel to the editor as 400 + plain message (shown as a toast). */
    @org.springframework.web.bind.annotation.ExceptionHandler({
            IllegalArgumentException.class, IllegalStateException.class})
    public org.springframework.http.ResponseEntity<Map<String, String>> onRejected(RuntimeException e) {
        return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }

    private void addFlow(EditorCommand command) {
        if (repository.findById(command.id(), FlowEntity.class).isPresent()) return;
        repository.save(new FlowEntity(
                command.id(), command.name(), null,
                command.archetype() == null ? null : FlowArchetype.valueOf(command.archetype()),
                command.triggerAggregateId(), command.triggerEvent(), command.targetId(),
                command.readModelName(), List.of(), command.targetUseCaseId(),
                List.of(), List.of(), List.of(), command.triggerDomainServiceId(),
                command.triggerUseCaseId(), null));
    }

    private void removeFlow(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), FlowEntity.class);
    }

    private void addProcess(EditorCommand command) {
        if (repository.findById(command.id(), ProcessEntity.class).isPresent()) return;
        var steps = command.steps() == null ? List.<ProcessStepEntity>of()
                : command.steps().stream()
                        .map(s -> new ProcessStepEntity(
                                s.id(), s.name(),
                                s.type() == null ? null : ProcessStepType.valueOf(s.type()),
                                s.useCaseId(), s.roleId(), s.deadline(), null,
                                s.compensationUseCaseId(), null))
                        .toList();
        repository.save(new ProcessEntity(
                command.id(), command.name(), null,
                command.triggerAggregateId(), command.triggerEvent(), command.boundedContextId(),
                steps, null, null, List.of(), null));
    }

    private void removeProcess(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), ProcessEntity.class);
    }

    private void addProcessStep(EditorCommand command) {
        var process = repository.findById(command.processId(), ProcessEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Proceso desconocido: " + command.processId()));
        if (process.steps().stream().anyMatch(s -> s.id().equals(command.id()))) return;
        var step = new ProcessStepEntity(
                command.id(), command.name(),
                command.stepType() == null ? ProcessStepType.AUTOMATED
                        : ProcessStepType.valueOf(command.stepType()),
                command.useCaseId(), command.roleId(), command.deadline(), null,
                command.compensationUseCaseId(), null);
        var steps = new ArrayList<>(process.steps());
        var index = command.afterStepId() == null ? steps.size()
                : indexAfter(steps, command.afterStepId());
        steps.add(index, step);
        repository.save(withSteps(process, steps));
    }

    static int indexAfter(List<ProcessStepEntity> steps, String afterStepId) {
        for (int i = 0; i < steps.size(); i++) {
            if (steps.get(i).id().equals(afterStepId)) return i + 1;
        }
        return steps.size();
    }

    private void removeProcessStep(EditorCommand command) {
        var process = repository.findById(command.processId(), ProcessEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Proceso desconocido: " + command.processId()));
        var steps = process.steps().stream().filter(s -> !s.id().equals(command.id())).toList();
        repository.save(withSteps(process, steps));
    }

    private void addView(EditorCommand command) {
        if (repository.findById(command.id(), ViewEntity.class).isPresent()) return;
        repository.save(new ViewEntity(
                command.id(), command.name(), null, "CURATED",
                command.memberIds() == null ? List.of() : command.memberIds(), null, null));
    }

    private void removeView(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), ViewEntity.class);
    }

    /** Reposition a step: afterStepId null moves it to the front. */
    private void moveProcessStep(EditorCommand command) {
        var process = repository.findById(command.processId(), ProcessEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Proceso desconocido: " + command.processId()));
        var step = process.steps().stream()
                .filter(s -> s.id().equals(command.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Paso desconocido: " + command.id()));
        var steps = new ArrayList<>(process.steps().stream()
                .filter(s -> !s.id().equals(command.id()))
                .toList());
        var index = command.afterStepId() == null ? 0 : indexAfter(steps, command.afterStepId());
        steps.add(index, step);
        repository.save(withSteps(process, steps));
    }

    /** Replaces roleId, deadline and compensationUseCaseId wholesale (null clears). */
    private void updateProcessStep(EditorCommand command) {
        var process = repository.findById(command.processId(), ProcessEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Proceso desconocido: " + command.processId()));
        repository.save(withSteps(process, process.steps().stream()
                .map(s -> s.id().equals(command.id())
                        ? new ProcessStepEntity(s.id(), s.name(), s.type(), s.useCaseId(),
                                command.roleId(), command.deadline(), s.escalationRoleId(),
                                command.compensationUseCaseId(), s.description())
                        : s)
                .toList()));
    }

    /** Record copy with only steps replaced — every other field preserved verbatim. */
    static ProcessEntity withSteps(ProcessEntity p, List<ProcessStepEntity> steps) {
        return new ProcessEntity(
                p.id(), p.name(), p.description(), p.triggerAggregateId(), p.triggerEvent(),
                p.ownerBoundedContextId(), steps, p.onCompletionEventName(), p.sla(), p.decisionIds(), null);
    }


    static List<String> concat(List<String> list, String extra) {
        var next = new ArrayList<>(list);
        next.add(extra);
        return List.copyOf(next);
    }

    /** Record copy with only steps replaced — every other field preserved verbatim. */
    static WorkflowEntity withWorkflowSteps(WorkflowEntity w, List<WorkflowStepEntity> steps) {
        return w.toBuilder().steps(steps).build();
    }

    /** Record copy with only dependsOnStepIds replaced — every other field preserved verbatim. */
    static WorkflowStepEntity withDependsOn(WorkflowStepEntity s, List<String> dependsOnStepIds) {
        return new WorkflowStepEntity(
                s.id(), s.name(), s.emittedEventName(), s.targetUseCaseId(),
                s.completionEventName(), dependsOnStepIds, s.description());
    }

    /** A new boundedContext belongs to the working project: it joins its first service's boundedContextIds. */
    /** A deployable service, wired into the current project (created if absent). */
    private void addService(EditorCommand command) {
        if (repository.findById(command.id(), ServiceEntity.class).isPresent()) return;
        repository.save(ServiceEntity.builder().id(command.id()).name(command.name()).build());
        var project = projects.currentProject().orElse(null);
        if (project == null) {
            repository.save(ProjectEntity.builder()
                    .id("project").name("Proyecto")
                    .serviceIds(List.of(command.id()))
                    .build());
            return;
        }
        var serviceIds = new ArrayList<>(project.serviceIds() == null ? List.of() : project.serviceIds());
        if (!serviceIds.contains(command.id())) {
            serviceIds.add(command.id());
            repository.save(project.toBuilder().serviceIds(serviceIds).build());
        }
    }

    /**
     * The blank canvas bootstraps itself: the FIRST boundedContext materializes the
     * project and a service around it, so the topology exists from gesture one
     * (the editor twin of the MCP's bootstrap_project).
     */
    private void ensureProjectAndService() {
        if (projects.currentProject().isPresent()) return;
        repository.save(ServiceEntity.builder().id("svc-principal").name("Servicio principal").build());
        repository.save(ProjectEntity.builder()
                .id("project").name("Proyecto")
                .serviceIds(List.of("svc-principal"))
                .build());
    }

    private void wireBoundedContextIntoCurrentProject(String boundedContextId) {
        ensureProjectAndService();
        var project = projects.currentProject().orElse(null);
        var serviceId = project == null || project.serviceIds() == null ? null
                : project.serviceIds().stream().findFirst().orElse(null);
        if (serviceId == null) return;
        var boundedContext = repository.findById(boundedContextId, BoundedContextEntity.class).orElse(null);
        if (boundedContext == null) return;
        // The context is born with its main module; the module is what the service deploys.
        var main = io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology
                .mainModuleOf(repository.findAllOfType(ModuleEntity.class), boundedContextId);
        if (main == null) {
            main = io.mateu.modux.modeldrivengenerator.application.usecases.model.topology.ModuleTopology
                    .mainModuleFor(boundedContext);
            repository.save(main);
        }
        var mainModuleId = main.id();
        var alreadyDeployed = repository.findAllOfType(ServiceEntity.class).stream()
                .anyMatch(s -> s.moduleIds().contains(mainModuleId));
        if (alreadyDeployed) return;
        repository.findById(serviceId, ServiceEntity.class).ifPresent(service -> {
            var moduleIds = new ArrayList<>(service.moduleIds());
            moduleIds.add(mainModuleId);
            repository.save(service.toBuilder().moduleIds(moduleIds).build());
        });
    }

    private void removeBoundedContext(EditorCommand command) {
        var boundedContext = repository.findById(command.id(), BoundedContextEntity.class).orElse(null);
        if (boundedContext == null) return;
        if (boundedContext.aggregateIds() != null && !boundedContext.aggregateIds().isEmpty()) {
            throw new IllegalArgumentException(
                    "El bounded context " + command.id() + " tiene agregados; bórralos primero");
        }
        // Drop the strategic relations that mention it, then the boundedContext itself.
        var project = projects.owningProject();
        var relations = projects.contextMap().stream()
                .filter(r -> !command.id().equals(r.sourceBoundedContextId())
                        && !command.id().equals(r.targetBoundedContextId()))
                .toList();
        if (relations.size() != projects.contextMap().size()) {
            projects.replaceContextMap(relations);
        }
        // Its modules go with it: services let go of them first.
        var moduleIds = repository.findAllOfType(ModuleEntity.class).stream()
                .filter(m -> command.id().equals(m.boundedContextId()))
                .map(ModuleEntity::id)
                .toList();
        if (!moduleIds.isEmpty()) {
            repository.findAllOfType(ServiceEntity.class).stream()
                    .filter(s -> s.moduleIds().stream().anyMatch(moduleIds::contains))
                    .forEach(s -> repository.save(s.toBuilder()
                            .moduleIds(s.moduleIds().stream().filter(id -> !moduleIds.contains(id)).toList())
                            .build()));
            repository.deleteAllById(moduleIds, ModuleEntity.class);
        }
        repository.deleteAllById(List.of(command.id()), BoundedContextEntity.class);
    }

    private void removeAggregate(EditorCommand command) {
        var hasEntities = repository.findAllOfType(EntityEntity.class).stream()
                .anyMatch(e -> command.id().equals(e.parentAggregateId()));
        if (hasEntities) {
            throw new IllegalArgumentException(
                    "El agregado " + command.id() + " tiene entidades; bórralas primero");
        }
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.aggregateIds() != null && m.aggregateIds().contains(command.id()))
                .forEach(m -> repository.save(withAggregateIds(
                        m, m.aggregateIds().stream().filter(id -> !id.equals(command.id())).toList())));
        repository.deleteAllById(List.of(command.id()), AggregateEntity.class);
    }

    private void renameElement(EditorCommand command) {
        switch (Objects.requireNonNull(command.type(), "rename-element.type (elementType)")) {
            case "boundedContext" -> repository.findById(command.id(), BoundedContextEntity.class)
                    .ifPresent(m -> repository.save(m.toBuilder().name(command.name()).build()));
            case "note" -> repository.findById(command.id(), NoteEntity.class)
                    .ifPresent(n -> repository.save(n.toBuilder().text(command.name()).build()));
            case "url" -> repository.findById(command.id(), UrlEntity.class)
                    .ifPresent(u -> repository.save(u.toBuilder().name(command.name()).build()));
            case "area" -> repository.findById(command.id(), AreaEntity.class)
                    .ifPresent(a -> repository.save(a.toBuilder().name(command.name()).build()));
            case "ui" -> repository.findById(command.id(), UiEntity.class)
                    .ifPresent(u -> repository.save(u.toBuilder().name(command.name()).build()));
            case "page" -> repository.findById(command.id(), PageEntity.class)
                    .ifPresent(pg -> repository.save(pg.toBuilder().name(command.name()).build()));
            case "ui-app" -> repository.findById(command.id(), UiAdapterEntity.class)
                    .ifPresent(a -> repository.save(a.toBuilder().name(command.name()).build()));
            case "aggregate" -> repository.findById(command.id(), AggregateEntity.class)
                    .ifPresent(a -> repository.save(new AggregateEntity(
                            a.id(), command.name(), a.modelId(), a.persistenceType(), a.idType(),
                            a.tableName(), a.tableSchema(), a.optimisticLockingEnabled(),
                            a.eventSourcingEnabled(), a.snapshotFrequency(), a.operations(),
                            a.invariants(), a.valueObjectIds(), a.lifecycle(), a.audited(),
                            a.decisionIds(), null)));
            case "entity" -> repository.findById(command.id(), EntityEntity.class)
                    .ifPresent(e -> repository.save(new EntityEntity(
                            e.id(), command.name(), e.modelId(), e.parentAggregateId(), e.isCollection(),
                            e.projectId(), e.description(), e.invariants())));
            // Renames the value object's NAME (its identity in the aggregate), keeping its
            // type (Enum/Record/Wrapper), fields, values and invariants intact.
            case "value-object" -> repository.findById(command.id(), ValueObjectEntity.class)
                    .ifPresent(v -> repository.save(new ValueObjectEntity(
                            v.id(), command.name(), v.type(), v.valuesJson(), v.fieldsJson(),
                            v.dataType(), v.projectId(), v.description(), v.invariants())));
            case "operation" -> repository.findAllOfType(AggregateEntity.class).stream()
                    .filter(a -> a.operations().stream().anyMatch(o -> o.id().equals(command.id())))
                    .findFirst()
                    .ifPresent(a -> repository.save(a.toBuilder()
                            .operations(a.operations().stream()
                                    .map(o -> o.id().equals(command.id())
                                            ? new OperationEntity(o.id(), command.name(), o.inputModelId(),
                                                    o.outputModelId(), o.preconditions(), o.sets(), o.emits(),
                                                    o.type(), o.paginated(), o.defaultPageSize(), o.intent(),
                                                    o.description())
                                            : o)
                                    .toList())
                            .build()));
            case "ai-agent" -> repository.findById(command.id(), AiAgentEntity.class)
                    .ifPresent(a -> repository.save(a.withName(command.name())));
            case "rag" -> repository.findById(command.id(), RagEntity.class)
                    .ifPresent(r -> repository.save(r.withName(command.name())));
            case "mcp-gateway" -> repository.findById(command.id(), McpGatewayEntity.class)
                    .ifPresent(g -> repository.save(g.withName(command.name())));
            case "api" -> repository.findById(command.id(), ApiEntity.class)
                    .ifPresent(a -> repository.save(a.withName(command.name())));
            case "proxy-api" -> repository.findById(command.id(), ProxyApiEntity.class)
                    .ifPresent(px -> repository.save(px.withName(command.name())));
            case "api-operation" -> repository.findAllOfType(ApiEntity.class).stream()
                    .filter(a -> a.operations().stream().anyMatch(o -> o.id().equals(command.id())))
                    .findFirst()
                    .ifPresent(a -> repository.save(withApiOperations(a, a.operations().stream()
                            .map(o -> o.id().equals(command.id()) ? o.withName(command.name()) : o)
                            .toList())));
            case "external-table" -> {
                var project = projects.owningProject();
                projects.replaceExternalSystems(projects.externalSystems().stream()
                        .map(x -> withTables(x, x.tables().stream()
                                .map(t -> t.id().equals(command.id())
                                        ? new ExternalSystemTableEntity(
                                                t.id(), command.name(), t.description())
                                        : t)
                                .toList()))
                        .toList());
            }
            case "mcp-server" -> {
                var project = projects.owningProject();
                projects.replaceExternalSystems(projects.externalSystems().stream()
                        .map(x -> x.withMcpServers(x.mcpServers().stream()
                                .map(s -> s.id().equals(command.id())
                                        ? new McpServerEntity(
                                                s.id(), command.name(), s.description(), s.uri())
                                        : s)
                                .toList()))
                        .toList());
            }
            case "actor" -> repository.findById(command.id(), RoleEntity.class)
                    .ifPresent(r -> repository.save(r.withName(command.name())));
            case "external-system" -> {
                var project = projects.owningProject();
                projects.replaceExternalSystems(projects.externalSystems().stream()
                        .map(x -> x.id().equals(command.id()) ? x.withName(command.name()) : x)
                        .toList());
            }
            case "application-event" -> repository.findById(command.id(), ApplicationEventEntity.class)
                    .ifPresent(ev -> repository.save(new ApplicationEventEntity(
                            ev.id(), command.name(), ev.modelId(), null)));
            case "domain-service" -> repository.findById(command.id(), DomainServiceEntity.class)
                    .ifPresent(ds -> repository.save(new DomainServiceEntity(
                            ds.id(), command.name(), ds.description(), ds.operations(), null)));
            case "query-service" -> repository.findById(command.id(), QueryServiceEntity.class)
                    .ifPresent(qs -> repository.save(new QueryServiceEntity(
                            qs.id(), command.name(), qs.boundedContextId(), qs.description(),
                            qs.operations(), qs.exposedAsGrpc(), null)));
            case "read-model" -> repository.findById(command.id(), ReadModelEntity.class)
                    .ifPresent(rm -> repository.save(new ReadModelEntity(
                            rm.id(), command.name(), rm.boundedContextId(), rm.description(), rm.modelId(),
                            rm.storageType(), rm.consistency(), rm.aggregateId(), null)));
            case "domain-event" -> repository.findById(command.id(), DomainEventEntity.class)
                    .ifPresent(ev -> repository.save(new DomainEventEntity(
                            ev.id(), command.name(), ev.modelId(), ev.publishAsIntegrationEvent(),
                            ev.integrationModelId(), ev.topicName(), ev.partitions(), ev.retentionMs(),
                            ev.serializationFormat(), ev.compressionType(), ev.deadLetterQueueEnabled(),
                            ev.deadLetterQueueName(), ev.maxDeliveryAttempts(), ev.schemaVersion(),
                            ev.routingKeyField(), ev.replayable(), null)));
            case "process-step" -> repository.findAllOfType(ProcessEntity.class).stream()
                    .filter(p -> p.steps().stream().anyMatch(s -> s.id().equals(command.id())))
                    .findFirst()
                    .ifPresent(p -> repository.save(withSteps(p, p.steps().stream()
                            .map(s -> s.id().equals(command.id())
                                    ? new ProcessStepEntity(s.id(), command.name(), s.type(),
                                            s.useCaseId(), s.roleId(), s.deadline(),
                                            s.escalationRoleId(), s.compensationUseCaseId(),
                                            s.description())
                                    : s)
                            .toList())));
            case "use-case" -> repository.findById(command.id(), UseCaseEntity.class)
                    .ifPresent(uc -> repository.save(uc.toBuilder().name(command.name()).build()));
            case "external-use-case" -> {
                var project = projects.owningProject();
                projects.replaceExternalSystems(projects.externalSystems().stream()
                        .map(x -> withUseCases(x, x.useCases().stream()
                                .map(u -> u.id().equals(command.id())
                                        ? new ExternalSystemUseCaseEntity(
                                                u.id(), command.name(), u.description())
                                        : u)
                                .toList()))
                        .toList());
            }
            case "workflow" -> repository.findById(command.id(), WorkflowEntity.class)
                    .ifPresent(w -> repository.save(w.toBuilder().name(command.name()).build()));
            case "workflow-step" -> repository.findAllOfType(WorkflowEntity.class).stream()
                    .filter(w -> w.steps().stream().anyMatch(s -> s.id().equals(command.id())))
                    .findFirst()
                    .ifPresent(w -> repository.save(withWorkflowSteps(w, w.steps().stream()
                            .map(s -> s.id().equals(command.id())
                                    ? s.toBuilder().name(command.name()).build()
                                    : s)
                            .toList())));
            default -> throw new IllegalArgumentException(
                    "rename-element no soportado para: " + command.type());
        }
    }

    private void addBoundedContext(EditorCommand command) {
        if (repository.findById(command.id(), BoundedContextEntity.class).isPresent()) return;
        repository.save(new BoundedContextEntity(
                command.id(), command.name(), null,
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(),
                List.of(), List.of(), List.of(), List.of(),
                null, null, false, null,
                List.of(), List.of(), List.of(), List.of(),
                command.subdomainType() == null ? null : SubdomainType.valueOf(command.subdomainType()),
                List.of(), List.of(), List.of(), null, null, null, null));
        // saving it created its main module; wiring needs both, so it goes last
        wireBoundedContextIntoCurrentProject(command.id());
    }

    private void addModule(EditorCommand command) {
        if (repository.findById(command.id(), ModuleEntity.class).isPresent()) return;
        repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        repository.save(ModuleEntity.builder().id(command.id()).name(command.name())
                .boundedContextId(command.boundedContextId()).build());
    }

    private void removeModule(EditorCommand command) {
        // the services that deployed it let go; its elements just become undistributed
        repository.findAllOfType(ServiceEntity.class).stream()
                .filter(s -> s.moduleIds().contains(command.id()))
                .forEach(s -> repository.save(s.toBuilder()
                        .moduleIds(AgentEditorCommands.without(s.moduleIds(), command.id())).build()));
        repository.deleteAllById(List.of(command.id()), ModuleEntity.class);
    }

    private void addModuleElement(EditorCommand command) {
        var module = repository.findById(command.id(), ModuleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown code boundedContext: " + command.id()));
        // an element lives in ONE boundedContext of its bounded context: assigning here moves it
        repository.findAllOfType(ModuleEntity.class).stream()
                .filter(cm -> !cm.id().equals(module.id())
                        && cm.boundedContextId().equals(module.boundedContextId())
                        && cm.elementIds().contains(command.elementId()))
                .forEach(cm -> repository.save(cm.toBuilder()
                        .elementIds(AgentEditorCommands.without(cm.elementIds(), command.elementId())).build()));
        if (module.elementIds().contains(command.elementId())) return;
        var ids = new ArrayList<>(module.elementIds());
        ids.add(command.elementId());
        repository.save(module.toBuilder().elementIds(ids).build());
    }

    private void removeModuleElement(EditorCommand command) {
        var module = repository.findById(command.id(), ModuleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown code boundedContext: " + command.id()));
        repository.save(module.toBuilder()
                .elementIds(AgentEditorCommands.without(module.elementIds(), command.elementId())).build());
    }

    private void addServiceModule(EditorCommand command) {
        var service = repository.findById(command.serviceId(), ServiceEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown service: " + command.serviceId()));
        repository.findById(command.id(), ModuleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown code boundedContext: " + command.id()));
        if (service.moduleIds().contains(command.id())) return;
        var ids = new ArrayList<>(service.moduleIds());
        ids.add(command.id());
        repository.save(service.toBuilder().moduleIds(ids).build());
    }

    private void removeServiceModule(EditorCommand command) {
        var service = repository.findById(command.serviceId(), ServiceEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown service: " + command.serviceId()));
        repository.save(service.toBuilder()
                .moduleIds(AgentEditorCommands.without(service.moduleIds(), command.id())).build());
    }

    /** The invariant declares WHY the aggregate exists; its conditions detail HOW (ficha). */
    /** Declares an invariant on its owner — an aggregate, a value object OR an entity. */
    private void addInvariant(EditorCommand command) {
        var ownerId = command.ownerId() != null ? command.ownerId() : command.aggregateId();
        var newInvariant = new InvariantEntity(command.id(), command.name(), List.of(), null);
        var agg = repository.findById(ownerId, AggregateEntity.class);
        if (agg.isPresent()) {
            var a = agg.get();
            if (a.invariants().stream().anyMatch(i -> i.id().equals(command.id()))) return;
            var invs = new ArrayList<>(a.invariants());
            invs.add(newInvariant);
            repository.save(a.toBuilder().invariants(invs).build());
            return;
        }
        var vo = repository.findById(ownerId, ValueObjectEntity.class);
        if (vo.isPresent()) {
            var v = vo.get();
            if (v.invariants().stream().anyMatch(i -> i.id().equals(command.id()))) return;
            var invs = new ArrayList<>(v.invariants());
            invs.add(newInvariant);
            repository.save(new ValueObjectEntity(v.id(), v.name(), v.type(), v.valuesJson(),
                    v.fieldsJson(), v.dataType(), v.projectId(), v.description(), invs));
            return;
        }
        var ent = repository.findById(ownerId, EntityEntity.class);
        if (ent.isPresent()) {
            var e = ent.get();
            if (e.invariants().stream().anyMatch(i -> i.id().equals(command.id()))) return;
            var invs = new ArrayList<>(e.invariants());
            invs.add(newInvariant);
            repository.save(new EntityEntity(e.id(), e.name(), e.modelId(), e.parentAggregateId(),
                    e.isCollection(), e.projectId(), e.description(), invs));
            return;
        }
        throw new IllegalArgumentException("Dueño de invariante desconocido: " + ownerId);
    }

    private void removeInvariant(EditorCommand command) {
        for (var a : repository.findAllOfType(AggregateEntity.class)) {
            if (a.invariants().stream().noneMatch(i -> i.id().equals(command.id()))) continue;
            repository.save(a.toBuilder()
                    .invariants(a.invariants().stream()
                            .filter(i -> !i.id().equals(command.id())).toList())
                    .build());
            return;
        }
        for (var v : repository.findAllOfType(ValueObjectEntity.class)) {
            if (v.invariants().stream().noneMatch(i -> i.id().equals(command.id()))) continue;
            repository.save(new ValueObjectEntity(v.id(), v.name(), v.type(), v.valuesJson(),
                    v.fieldsJson(), v.dataType(), v.projectId(), v.description(),
                    v.invariants().stream().filter(i -> !i.id().equals(command.id())).toList()));
            return;
        }
        for (var e : repository.findAllOfType(EntityEntity.class)) {
            if (e.invariants().stream().noneMatch(i -> i.id().equals(command.id()))) continue;
            repository.save(new EntityEntity(e.id(), e.name(), e.modelId(), e.parentAggregateId(),
                    e.isCollection(), e.projectId(), e.description(),
                    e.invariants().stream().filter(i -> !i.id().equals(command.id())).toList()));
            return;
        }
    }

    /** Sets an invariant's PRIMARY condition (expression + error message); blank clears it. */
    private void setInvariantCondition(EditorCommand command) {
        var blank = (command.expression() == null || command.expression().isBlank())
                && (command.errorMessage() == null || command.errorMessage().isBlank());
        var conds = blank
                ? List.<InvariantConditionEntity>of()
                : List.of(new InvariantConditionEntity(command.id() + "-cond", command.expression(),
                        false, null, command.errorMessage()));
        java.util.function.Function<InvariantEntity, InvariantEntity> patch = i ->
                i.id().equals(command.id()) ? new InvariantEntity(i.id(), i.name(), conds, i.projectId()) : i;
        for (var a : repository.findAllOfType(AggregateEntity.class)) {
            if (a.invariants().stream().anyMatch(i -> i.id().equals(command.id()))) {
                repository.save(a.toBuilder()
                        .invariants(a.invariants().stream().map(patch).toList()).build());
                return;
            }
        }
        for (var v : repository.findAllOfType(ValueObjectEntity.class)) {
            if (v.invariants().stream().anyMatch(i -> i.id().equals(command.id()))) {
                repository.save(new ValueObjectEntity(v.id(), v.name(), v.type(), v.valuesJson(),
                        v.fieldsJson(), v.dataType(), v.projectId(), v.description(),
                        v.invariants().stream().map(patch).toList(), v.modelId()));
                return;
            }
        }
        for (var e : repository.findAllOfType(EntityEntity.class)) {
            if (e.invariants().stream().anyMatch(i -> i.id().equals(command.id()))) {
                repository.save(new EntityEntity(e.id(), e.name(), e.modelId(), e.parentAggregateId(),
                        e.isCollection(), e.projectId(), e.description(),
                        e.invariants().stream().map(patch).toList()));
                return;
            }
        }
    }

    /** An entity WITHIN an aggregate (its parent) — its own fields come later, through the ficha. */
    private void addEntity(EditorCommand command) {
        if (repository.findById(command.id(), EntityEntity.class).isPresent()) return;
        repository.findById(command.aggregateId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Agregado desconocido: " + command.aggregateId()));
        repository.save(new EntityEntity(command.id(), command.name(), null, command.aggregateId(), false, null));
    }

    private void removeEntity(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), EntityEntity.class);
    }

    /**
     * A value object owned by an aggregate (added to its valueObjectIds). Born a Record by
     * default (type carries Enum/Record/Wrapper when given); its shape is filled in the ficha.
     */
    private void addValueObject(EditorCommand command) {
        if (repository.findById(command.id(), ValueObjectEntity.class).isPresent()) return;
        var aggregate = repository.findById(command.aggregateId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Agregado desconocido: " + command.aggregateId()));
        var type = command.type() != null && !command.type().isBlank() ? command.type() : "Record";
        repository.save(new ValueObjectEntity(command.id(), command.name(), type, "[]", "[]", null, null));
        var voIds = new ArrayList<>(
                aggregate.valueObjectIds() == null ? List.<String>of() : aggregate.valueObjectIds());
        if (!voIds.contains(command.id())) {
            voIds.add(command.id());
            repository.save(aggregate.toBuilder().valueObjectIds(voIds).build());
        }
    }

    private void removeValueObject(EditorCommand command) {
        repository.findAllOfType(AggregateEntity.class).stream()
                .filter(a -> a.valueObjectIds() != null && a.valueObjectIds().contains(command.id()))
                .forEach(a -> repository.save(a.toBuilder()
                        .valueObjectIds(a.valueObjectIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build()));
        repository.deleteAllById(List.of(command.id()), ValueObjectEntity.class);
    }

    /** Re-home a value object under an aggregate: pulled off any previous owner, added here. */
    private void setValueObjectAggregate(EditorCommand command) {
        var target = repository.findById(command.aggregateId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Agregado desconocido: " + command.aggregateId()));
        for (var a : repository.findAllOfType(AggregateEntity.class)) {
            if (a.id().equals(target.id())) continue;
            if (a.valueObjectIds() != null && a.valueObjectIds().contains(command.id())) {
                repository.save(a.toBuilder()
                        .valueObjectIds(a.valueObjectIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build());
            }
        }
        var voIds = new ArrayList<>(
                target.valueObjectIds() == null ? List.<String>of() : target.valueObjectIds());
        if (!voIds.contains(command.id())) {
            voIds.add(command.id());
            repository.save(target.toBuilder().valueObjectIds(voIds).build());
        }
    }

    /** An operation of an aggregate — born a bare CUSTOM operation; its models are set later. */
    private void addOperation(EditorCommand command) {
        var aggregate = repository.findById(command.aggregateId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Agregado desconocido: " + command.aggregateId()));
        if (aggregate.operations().stream().anyMatch(o -> o.id().equals(command.id()))) return;
        var ops = new ArrayList<>(aggregate.operations() == null ? List.<OperationEntity>of() : aggregate.operations());
        ops.add(new OperationEntity(command.id(), command.name(),
                null, null, null, null, null, "CUSTOM", false, null, null));
        repository.save(aggregate.toBuilder().operations(ops).build());
    }

    private void removeOperation(EditorCommand command) {
        for (var a : repository.findAllOfType(AggregateEntity.class)) {
            if (a.operations().stream().noneMatch(o -> o.id().equals(command.id()))) continue;
            repository.save(a.toBuilder()
                    .operations(a.operations().stream().filter(o -> !o.id().equals(command.id())).toList())
                    .build());
            return;
        }
    }

    /** Re-home an entity under an aggregate (its parentAggregateId changes). */
    private void setEntityAggregate(EditorCommand command) {
        var entity = repository.findById(command.id(), EntityEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Entidad desconocida: " + command.id()));
        repository.findById(command.aggregateId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Agregado desconocido: " + command.aggregateId()));
        repository.save(new EntityEntity(entity.id(), entity.name(), entity.modelId(),
                command.aggregateId(), entity.isCollection(), entity.projectId(), entity.description(),
                entity.invariants()));
    }

    private void addAggregate(EditorCommand command) {
        if (repository.findById(command.id(), AggregateEntity.class).isPresent()) return;
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        // Stub state model so the aggregate is referentially complete from birth;
        // fields get filled in later through the CRUD.
        var modelId = "model-" + command.id().replaceFirst("^agg-", "");
        if (repository.findById(modelId, ModelEntity.class).isEmpty()) {
            repository.save(new ModelEntity(modelId, command.name(), List.of(), List.of(), null));
        }
        repository.save(new AggregateEntity(
                command.id(), command.name(), modelId,
                null, null, null, null, false, false, null,
                List.of(), List.of(), List.of(), null, false, List.of(), null));
        var aggregateIds = new ArrayList<>(boundedContext.aggregateIds() == null ? List.of() : boundedContext.aggregateIds());
        aggregateIds.add(command.id());
        repository.save(withAggregateIds(boundedContext, aggregateIds));
    }

    private void addDomainEvent(EditorCommand command) {
        if (repository.findById(command.id(), DomainEventEntity.class).isPresent()) return;
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        repository.save(new DomainEventEntity(
                command.id(), command.name(), null,
                false, null, null, null, null, null, null,
                false, null, null, null, null, false, null));
        // The event belongs to the bounded context through the boundedContext's id list.
        var domainEventIds = new ArrayList<>(
                boundedContext.domainEventIds() == null ? List.of() : boundedContext.domainEventIds());
        domainEventIds.add(command.id());
        repository.save(boundedContext.toBuilder().domainEventIds(domainEventIds).build());
    }

    /**
     * Declares that the source (aggregate or domain service) emits the target domain
     * event: the event NAME joins the `emits` CSV of its first operation (a stub
     * operation is created when it has none). Refinable later through the CRUDs.
     * Use cases do not emit domain events — they emit application events.
     */
    private void addEmission(EditorCommand command) {
        // Use case → application event: a PublishApplicationEvent step.
        var applicationEvent = repository.findById(command.targetId(), ApplicationEventEntity.class);
        if (applicationEvent.isPresent()) {
            var uc = repository.findById(command.sourceId(), UseCaseEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Solo los casos de uso emiten eventos de aplicación; emisor desconocido: "
                                    + command.sourceId()));
            var appEvent = applicationEvent.get();
            var steps = new ArrayList<>(uc.steps() == null ? List.of() : uc.steps());
            var alreadyThere = steps.stream().anyMatch(st -> appEvent.id().equals(st.applicationEventId()));
            if (alreadyThere) return;
            steps.add(new UseCaseStepEntity("step-emit-" + appEvent.id(), "publish" + appEvent.name(),
                    io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.PublishApplicationEvent,
                    null, null, null, null, null, null, null, null, null, null, appEvent.id()));
            repository.save(withSteps(uc, steps));
            return;
        }
        var event = repository.findById(command.targetId(), DomainEventEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown domain event: " + command.targetId()));
        var aggregate = repository.findById(command.sourceId(), AggregateEntity.class);
        if (aggregate.isPresent()) {
            var a = aggregate.get();
            var operations = withEmissionAdded(a.operations(), event);
            if (operations != null) repository.save(withOperations(a, operations));
            return;
        }
        var ds = repository.findById(command.sourceId(), DomainServiceEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Solo agregados y servicios de dominio emiten eventos de dominio; emisor desconocido: "
                                + command.sourceId()));
        var operations = withEmissionAdded(ds.operations(), event);
        if (operations != null) {
            repository.save(new DomainServiceEntity(ds.id(), ds.name(), ds.description(), operations, null));
        }
    }

    /** The operations list with the emission appended, or null when it is already declared. */
    static List<OperationEntity> withEmissionAdded(List<OperationEntity> current, DomainEventEntity event) {
        var alreadyThere = current.stream().anyMatch(op -> op.emits() != null
                && java.util.Arrays.stream(op.emits().split(","))
                        .anyMatch(n -> n.trim().equalsIgnoreCase(event.name().trim())));
        if (alreadyThere) return null;
        var operations = new ArrayList<>(current);
        if (operations.isEmpty()) {
            operations.add(new OperationEntity("op-emit-" + event.id(), "emit" + event.name(),
                    null, null, null, null, event.name(), "CUSTOM", false, null, null));
        } else {
            var first = operations.get(0);
            var emits = first.emits() == null || first.emits().isBlank()
                    ? event.name() : first.emits() + "," + event.name();
            operations.set(0, withEmits(first, emits));
        }
        return operations;
    }

    private void removeEmission(EditorCommand command) {
        var applicationEvent = repository.findById(command.targetId(), ApplicationEventEntity.class);
        if (applicationEvent.isPresent()) {
            repository.findById(command.sourceId(), UseCaseEntity.class).ifPresent(uc ->
                    repository.save(withSteps(uc, (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                            .filter(st -> !command.targetId().equals(st.applicationEventId()))
                            .toList())));
            return;
        }
        var event = repository.findById(command.targetId(), DomainEventEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown domain event: " + command.targetId()));
        repository.findById(command.sourceId(), AggregateEntity.class).ifPresent(a ->
                repository.save(withOperations(a, withEmissionRemoved(a.operations(), event))));
        repository.findById(command.sourceId(), DomainServiceEntity.class).ifPresent(ds ->
                repository.save(new DomainServiceEntity(ds.id(), ds.name(), ds.description(),
                        withEmissionRemoved(ds.operations(), event), null)));
    }

    static List<OperationEntity> withEmissionRemoved(List<OperationEntity> current, DomainEventEntity event) {
        return current.stream()
                .map(op -> withEmits(op, java.util.Arrays.stream(
                                (op.emits() == null ? "" : op.emits()).split(","))
                        .map(String::trim)
                        .filter(n -> !n.isBlank() && !n.equalsIgnoreCase(event.name().trim()))
                        .collect(Collectors.joining(","))))
                // A stub created just to carry this emission leaves with it.
                .filter(op -> !(op.id().startsWith("op-emit-") && op.emits() == null))
                .toList();
    }

    private void addApplicationEvent(EditorCommand command) {
        if (repository.findById(command.id(), ApplicationEventEntity.class).isPresent()) return;
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        repository.save(new ApplicationEventEntity(command.id(), command.name(), null, null));
        var applicationEventIds = new ArrayList<>(boundedContext.applicationEventIds());
        applicationEventIds.add(command.id());
        repository.save(boundedContext.toBuilder().applicationEventIds(applicationEventIds).build());
    }

    private void removeApplicationEvent(EditorCommand command) {
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.applicationEventIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .applicationEventIds(m.applicationEventIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build()));
        // Publishing steps referencing it leave with it.
        for (var uc : repository.findAllOfType(UseCaseEntity.class)) {
            if (uc.steps() == null || uc.steps().stream().noneMatch(st ->
                    command.id().equals(st.applicationEventId()))) continue;
            repository.save(withSteps(uc, uc.steps().stream()
                    .filter(st -> !command.id().equals(st.applicationEventId()))
                    .toList()));
        }
        clearAgentTriggersFor(command.id());
        repository.deleteAllById(List.of(command.id()), ApplicationEventEntity.class);
    }

    /**
     * Use case A invokes use case B: a CallUseCase step is appended to A. When the two
     * live in different bounded contexts this is the seed for a gateway/API later on.
     */
    private void addUseCaseCall(EditorCommand command) {
        var source = repository.findById(command.sourceId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.sourceId()));
        var target = repository.findById(command.targetId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.targetId()));
        if (source.id().equals(target.id())) {
            throw new IllegalArgumentException("Un caso de uso no puede invocarse a sí mismo");
        }
        var steps = new ArrayList<>(source.steps() == null ? List.of() : source.steps());
        var alreadyThere = steps.stream().anyMatch(st ->
                st.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallUseCase
                        && target.id().equals(st.useCaseId()));
        if (alreadyThere) return;
        // a call brings what the decision needs: it goes before the first custom step (or the first
        // publication), so its answer is at hand for the logic — appended only when there is neither
        var at = callInsertionIndex(steps);
        steps.add(at, new UseCaseStepEntity("step-call-" + target.id(), "call" + capitalize(target.name()),
                io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallUseCase,
                null, null, null, null, null, target.id(), null, null, null, null, null));
        repository.save(withSteps(source, steps));
    }

    static int callInsertionIndex(List<UseCaseStepEntity> steps) {
        for (var type : List.of(io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.Custom,
                io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.PublishDomainEvent)) {
            for (int i = 0; i < steps.size(); i++) {
                if (steps.get(i).type() == type) return i;
            }
        }
        return steps.size();
    }

    private void removeUseCaseCall(EditorCommand command) {
        repository.findById(command.sourceId(), UseCaseEntity.class).ifPresent(uc ->
                repository.save(withSteps(uc, (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                        .filter(st -> !(st.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallUseCase
                                && command.targetId().equals(st.useCaseId())))
                        .toList())));
    }

    /**
     * A bare step with no counterpart on the map: it stays {@code Custom} — its intent
     * (natural language) is the spec {@code mvn modux:ai-complete} works from. Steps
     * WITH a counterpart are born typed by the connect gestures instead (CallUseCase,
     * CallQueryService, CallAggregateOperation, PublishApplicationEvent…).
     */
    private void addUseCaseStep(EditorCommand command) {
        var uc = repository.findById(command.useCaseId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.useCaseId()));
        var steps = new ArrayList<>(uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps());
        if (steps.stream().anyMatch(st -> st.id().equals(command.id()))) return;
        steps.add(new UseCaseStepEntity(command.id(), command.name(),
                io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.Custom,
                null, null, null, null, null, null, null, null, null, null, null));
        repository.save(withSteps(uc, steps));
    }

    private void removeUseCaseStep(EditorCommand command) {
        repository.findById(command.useCaseId(), UseCaseEntity.class).ifPresent(uc ->
                repository.save(withSteps(uc, (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                        .filter(st -> !st.id().equals(command.id()))
                        .toList())));
    }

    /** Use case → aggregate: a CallAggregateOperation step (the single operation wires itself). */
    private void addAggregateCall(EditorCommand command) {
        var uc = repository.findById(command.sourceId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.sourceId()));
        var aggregate = repository.findById(command.targetId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.targetId()));
        var steps = new ArrayList<>(uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps());
        var alreadyThere = steps.stream().anyMatch(st ->
                (st.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallAggregateOperation
                        || st.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.SaveAggregate)
                        && aggregate.id().equals(st.aggregateId()));
        if (alreadyThere) return;
        var operations = aggregate.operations() == null ? List.<OperationEntity>of() : aggregate.operations();
        var operationId = operations.size() == 1 ? operations.get(0).id() : null;
        steps.add(new UseCaseStepEntity("step-call-" + aggregate.id(), "call" + capitalize(aggregate.name()),
                io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallAggregateOperation,
                aggregate.id(), operationId, null, null, null, null, null, null, null, null, null));
        repository.save(withSteps(uc, steps));
    }

    private void removeAggregateCall(EditorCommand command) {
        repository.findById(command.sourceId(), UseCaseEntity.class).ifPresent(uc ->
                repository.save(withSteps(uc, (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                        .filter(st -> !((st.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallAggregateOperation
                                || st.type() == io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.SaveAggregate)
                                && command.targetId().equals(st.aggregateId())))
                        .toList())));
    }

    /** A cron task inside a bounded context; the use case it fires is its target. */
    private void addScheduledTrigger(EditorCommand command) {
        if (repository.findById(command.id(), ScheduledTriggerEntity.class).isPresent()) return;
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        repository.save(new ScheduledTriggerEntity(command.id(), command.name(),
                command.cronExpression() != null ? command.cronExpression() : "0 0 * * *",
                null, command.targetUseCaseId(), null, null, null, null, null, null, null, false, false, null, null));
        var ids = new ArrayList<>(boundedContext.scheduledTriggerIds() == null ? List.of() : boundedContext.scheduledTriggerIds());
        ids.add(command.id());
        repository.save(boundedContext.toBuilder().scheduledTriggerIds(ids).build());
    }

    private void removeScheduledTrigger(EditorCommand command) {
        for (var boundedContext : repository.findAllOfType(BoundedContextEntity.class)) {
            var ids = boundedContext.scheduledTriggerIds();
            if (ids != null && ids.contains(command.id())) {
                repository.save(boundedContext.toBuilder()
                        .scheduledTriggerIds(AgentEditorCommands.without(ids, command.id())).build());
            }
        }
        repository.deleteAllById(List.of(command.id()), ScheduledTriggerEntity.class);
    }

    private void setScheduledTriggerTarget(EditorCommand command) {
        var t = repository.findById(command.id(), ScheduledTriggerEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown scheduled trigger: " + command.id()));
        if (command.targetUseCaseId() != null) {
            repository.findById(command.targetUseCaseId(), UseCaseEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.targetUseCaseId()));
        }
        repository.save(new ScheduledTriggerEntity(t.id(), t.name(), t.cronExpression(), t.timezone(),
                command.targetUseCaseId(), t.modelMappingId(), t.description(), t.executionEnvironment(),
                t.lockProvider(), t.maxExecutionTimeMs(), t.failureNotificationEmail(), t.misfirePolicy(),
                t.allowConcurrentExecution(), t.retryOnFailure(), t.retryCount(), null));
    }

    private void addQueryService(EditorCommand command) {
        if (repository.findById(command.id(), QueryServiceEntity.class).isPresent()) return;
        repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        repository.save(new QueryServiceEntity(
                command.id(), command.name(), command.boundedContextId(), null, List.of(), false, null));
    }

    private void removeQueryService(EditorCommand command) {
        var consumed = repository.findAllOfType(UseCaseEntity.class).stream()
                .anyMatch(uc -> uc.steps() != null && uc.steps().stream()
                        .anyMatch(st -> command.id().equals(st.queryServiceId())));
        if (consumed) {
            throw new IllegalArgumentException(
                    "El query service " + command.id() + " lo consumen casos de uso; quita esas llamadas primero");
        }
        repository.findAllOfType(RoleEntity.class).stream()
                .filter(r -> r.allowedQueryServiceIds().contains(command.id()))
                .forEach(r -> repository.save(r.withAllowedQueryServiceIds(
                        r.allowedQueryServiceIds().stream().filter(id -> !id.equals(command.id())).toList())));
        repository.findAllOfType(AiAgentEntity.class).stream()
                .filter(a -> a.allowedQueryServiceIds().contains(command.id()))
                .forEach(a -> repository.save(a.withAllowedQueryServiceIds(
                        AgentEditorCommands.without(a.allowedQueryServiceIds(), command.id()))));
        repository.deleteAllById(List.of(command.id()), QueryServiceEntity.class);
    }

    /** Use case → query service: a CallQueryService step (works across bounded contexts). */
    private void addQueryCall(EditorCommand command) {
        var source = repository.findById(command.sourceId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.sourceId()));
        var target = repository.findById(command.targetId(), QueryServiceEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown query service: " + command.targetId()));
        var steps = new ArrayList<>(source.steps() == null ? List.of() : source.steps());
        var alreadyThere = steps.stream().anyMatch(st -> target.id().equals(st.queryServiceId()));
        if (alreadyThere) return;
        steps.add(new UseCaseStepEntity("step-query-" + target.id(), "query" + capitalize(target.name()),
                io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallQueryService,
                null, null, null, null, null, null, null, target.id(), null, null, null));
        repository.save(withSteps(source, steps));
    }

    private void removeQueryCall(EditorCommand command) {
        repository.findById(command.sourceId(), UseCaseEntity.class).ifPresent(uc ->
                repository.save(withSteps(uc, (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                        .filter(st -> !command.targetId().equals(st.queryServiceId()))
                        .toList())));
    }

    /** An actor uses a use case or query service directly — the seed of a derived UI. */
    private void addActorUse(EditorCommand command) {
        var role = repository.findById(command.sourceId(), RoleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown actor: " + command.sourceId()));
        if (repository.findById(command.targetId(), UseCaseEntity.class).isPresent()) {
            if (role.allowedUseCaseIds().contains(command.targetId())) return;
            var ids = new ArrayList<>(role.allowedUseCaseIds());
            ids.add(command.targetId());
            repository.save(role.withAllowedUseCaseIds(ids));
            return;
        }
        if (repository.findById(command.targetId(), QueryServiceEntity.class).isPresent()) {
            if (role.allowedQueryServiceIds().contains(command.targetId())) return;
            var ids = new ArrayList<>(role.allowedQueryServiceIds());
            ids.add(command.targetId());
            repository.save(role.withAllowedQueryServiceIds(ids));
            return;
        }
        throw new IllegalArgumentException(
                "Un actor solo usa casos de uso o query services; destino desconocido: " + command.targetId());
    }

    private void removeActorUse(EditorCommand command) {
        repository.findById(command.sourceId(), RoleEntity.class).ifPresent(r ->
                repository.save(r
                        .withAllowedUseCaseIds(r.allowedUseCaseIds().stream()
                                .filter(id -> !id.equals(command.targetId())).toList())
                        .withAllowedQueryServiceIds(r.allowedQueryServiceIds().stream()
                                .filter(id -> !id.equals(command.targetId())).toList())));
    }

    /** An actor depends on an external system — drawn on the context map as a dependency. */
    private void addActorExternalDependency(EditorCommand command) {
        var role = repository.findById(command.sourceId(), RoleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown actor: " + command.sourceId()));
        var known = projects.externalSystems().stream()
                .anyMatch(x -> x.id().equals(command.targetId()));
        if (!known) {
            throw new IllegalArgumentException("Sistema externo desconocido: " + command.targetId());
        }
        if (role.externalSystemIds().contains(command.targetId())) return;
        var ids = new ArrayList<>(role.externalSystemIds());
        ids.add(command.targetId());
        repository.save(role.withExternalSystemIds(ids));
    }

    private void removeActorExternalDependency(EditorCommand command) {
        repository.findById(command.sourceId(), RoleEntity.class).ifPresent(r ->
                repository.save(r.withExternalSystemIds(r.externalSystemIds().stream()
                        .filter(id -> !id.equals(command.targetId())).toList())));
    }

    /**
     * An external system depends on another one — or on a published API, the
     * finer-grained target. Drawn on the context map as a dependency either way.
     */
    private void addExternalSystemDependency(EditorCommand command) {
        if (command.sourceId().equals(command.targetId())) {
            throw new IllegalArgumentException("Un sistema externo no puede depender de sí mismo");
        }
        var project = projects.owningProject();
        var source = projects.externalSystems().stream()
                .filter(x -> x.id().equals(command.sourceId())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Sistema externo desconocido: " + command.sourceId()));
        var cqrs = "CQRS".equals(command.type());
        if (repository.findById(command.targetId(), ApiEntity.class).isPresent()
                || repository.findById(command.targetId(), ProxyApiEntity.class).isPresent()) {
            if (cqrs) {
                throw new IllegalArgumentException(
                        "La relación CQRS se establece entre sistemas externos");
            }
            if (source.dependsOnApiIds().contains(command.targetId())) return;
            var ids = new ArrayList<>(source.dependsOnApiIds());
            ids.add(command.targetId());
            projects.replaceExternalSystems(projects.externalSystems().stream()
                    .map(x -> x.id().equals(command.sourceId()) ? x.withDependsOnApiIds(ids) : x)
                    .toList());
            return;
        }
        if (projects.externalSystems().stream().noneMatch(x -> x.id().equals(command.targetId()))) {
            throw new IllegalArgumentException("Sistema externo desconocido: " + command.targetId());
        }
        // The two flavours are exclusive: re-drawing with the other type retypes the edge.
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .map(x -> {
                    if (!x.id().equals(command.sourceId())) return x;
                    var plainWithout = (List<String>) x.dependsOnExternalSystemIds().stream()
                            .filter(id -> !id.equals(command.targetId())).toList();
                    var cqrsWithout = (List<String>) x.cqrsExternalSystemIds().stream()
                            .filter(id -> !id.equals(command.targetId())).toList();
                    if (cqrs) {
                        var ids = new ArrayList<>(cqrsWithout);
                        ids.add(command.targetId());
                        return x.withDependsOnExternalSystemIds(plainWithout)
                                .withCqrsExternalSystemIds(ids);
                    }
                    var ids = new ArrayList<>(plainWithout);
                    ids.add(command.targetId());
                    return x.withDependsOnExternalSystemIds(ids)
                            .withCqrsExternalSystemIds(cqrsWithout);
                })
                .toList());
    }

    /** The target may live in any list (system, CQRS, API/proxy): clear it everywhere. */
    private void removeExternalSystemDependency(EditorCommand command) {
        var project = projects.owningProject();
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .map(x -> x.id().equals(command.sourceId())
                        ? x.withDependsOnExternalSystemIds(x.dependsOnExternalSystemIds().stream()
                                        .filter(id -> !id.equals(command.targetId())).toList())
                                .withDependsOnApiIds(x.dependsOnApiIds().stream()
                                        .filter(id -> !id.equals(command.targetId())).toList())
                                .withCqrsExternalSystemIds(x.cqrsExternalSystemIds().stream()
                                        .filter(id -> !id.equals(command.targetId())).toList())
                        : x)
                .toList());
    }

    /** Nest an API (or an API proxy) inside its host external system; empty target un-nests. */
    private void setApiPublisher(EditorCommand command) {
        var target = command.targetId();
        if (target != null && !target.isBlank()) {
            var known = projects.externalSystems().stream()
                    .anyMatch(x -> x.id().equals(target));
            if (!known) {
                throw new IllegalArgumentException("Sistema externo desconocido: " + target);
            }
        }
        var home = target != null && !target.isBlank() ? target : null;
        var api = repository.findById(command.id(), ApiEntity.class);
        if (api.isPresent()) {
            repository.save(api.get().withPublishedByExternalSystemId(home));
            return;
        }
        var proxy = repository.findById(command.id(), ProxyApiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown API: " + command.id()));
        repository.save(proxy.withPublishedByExternalSystemId(home));
    }

    /** Optionally born wired: targetId = the API it fronts, boundedContextId = the host system. */
    private void addProxyApi(EditorCommand command) {
        if (repository.findById(command.id(), ProxyApiEntity.class).isPresent()) return;
        var target = command.targetId();
        if (target != null && !target.isBlank()
                && repository.findById(target, ApiEntity.class).isEmpty()) {
            throw new IllegalArgumentException("API desconocida: " + target);
        }
        var host = command.boundedContextId();
        if (host != null && !host.isBlank()
                && projects.externalSystems().stream().noneMatch(x -> x.id().equals(host))) {
            throw new IllegalArgumentException("Sistema externo desconocido: " + host);
        }
        var targetApi = target == null || target.isBlank() ? null : target;
        var hostId = host == null || host.isBlank() ? null : host;
        repository.save(new ProxyApiEntity(command.id(), command.name(), null, targetApi, hostId));
        if (targetApi != null) {
            repointApiDependencies(targetApi, command.id(), hostId);
        }
    }

    /**
     * A proxy in front of an API takes over its consumers: whoever depended on the
     * API now depends on the proxy (the host itself keeps its direct dependency —
     * that is the proxy's own upstream call). Deleting a wired proxy hands them back.
     */
    private void repointApiDependencies(String fromId, String toId, String exceptSystemId) {
        var project = projects.owningProject();
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .map(x -> x.dependsOnApiIds().contains(fromId) && !x.id().equals(exceptSystemId)
                        ? x.withDependsOnApiIds(x.dependsOnApiIds().stream()
                                .map(i -> i.equals(fromId) ? toId : i)
                                .distinct()
                                .toList())
                        : x)
                .toList());
    }

    private void removeProxyApi(EditorCommand command) {
        var proxy = repository.findById(command.id(), ProxyApiEntity.class).orElse(null);
        if (proxy == null) return;
        var dependedOn = projects.externalSystems().stream()
                .anyMatch(x -> x.dependsOnApiIds().contains(command.id()));
        if (dependedOn && proxy.targetApiId() == null) {
            throw new IllegalArgumentException(
                    "El proxy " + command.id() + " tiene sistemas externos que dependen de él; quita esas dependencias primero");
        }
        if (dependedOn) {
            // Hand the consumers back to the API the proxy was fronting.
            repointApiDependencies(command.id(), proxy.targetApiId(), null);
        }
        repository.deleteAllById(List.of(command.id()), ProxyApiEntity.class);
    }

    /** Point the proxy at the published API it fronts; empty target clears the wiring. */
    private void setProxyTarget(EditorCommand command) {
        var proxy = repository.findById(command.id(), ProxyApiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown proxy: " + command.id()));
        var target = command.targetId();
        if (target != null && !target.isBlank()) {
            if (repository.findById(target, ApiEntity.class).isEmpty()) {
                throw new IllegalArgumentException("API desconocida: " + target);
            }
            repository.save(proxy.withTargetApiId(target));
            repointApiDependencies(target, proxy.id(), proxy.publishedByExternalSystemId());
        } else {
            repository.save(proxy.withTargetApiId(null));
        }
    }

    /**
     * An actor manages an aggregate through a CRUD UI: stub create/update/delete use
     * cases appear in the aggregate's boundedContext (with steps anchored to the aggregate) and
     * the actor is allowed on all three. The UI itself derives at generation time.
     */
    private void addActorCrud(EditorCommand command) {
        var role = repository.findById(command.sourceId(), RoleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown actor: " + command.sourceId()));
        var aggregate = repository.findById(command.targetId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.targetId()));
        ensureCrudCore(aggregate);
        var allowed = new ArrayList<>(role.allowedUseCaseIds());
        for (var id : io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudUseCases.idsOf(aggregate.id())) {
            if (!allowed.contains(id)) allowed.add(id);
        }
        repository.save(role.withAllowedUseCaseIds(allowed));
    }

    /**
     * The consumer-agnostic CRUD core: the shared use-case trio and its lifecycle domain events,
     * attached to the aggregate's bounded context. Every consumer relationship (actor, UI, API)
     * reinforces this same core. Idempotent; returns the owning bounded context.
     */
    private BoundedContextEntity ensureCrudCore(AggregateEntity aggregate) {
        var boundedContext = repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.aggregateIds() != null && m.aggregateIds().contains(aggregate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "El agregado " + aggregate.id() + " no pertenece a ningún bounded context"));
        var useCaseIds = new ArrayList<>(boundedContext.useCaseIds() == null
                ? List.<String>of() : boundedContext.useCaseIds());
        for (var uc : crudUseCases(aggregate)) {
            if (repository.findById(uc.id(), UseCaseEntity.class).isEmpty()) repository.save(uc);
            if (!useCaseIds.contains(uc.id())) useCaseIds.add(uc.id());
        }
        var eventIds = new ArrayList<>(boundedContext.domainEventIds() == null
                ? List.<String>of() : boundedContext.domainEventIds());
        for (var ev : io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudLifecycleEvents.forAggregate(aggregate)) {
            if (repository.findById(ev.id(), DomainEventEntity.class).isEmpty()) repository.save(ev);
            if (!eventIds.contains(ev.id())) eventIds.add(ev.id());
        }
        var saved = boundedContext.toBuilder().useCaseIds(useCaseIds).domainEventIds(eventIds).build();
        repository.save(saved);
        return saved;
    }

    /**
     * The integration surface: the CRUD core plus a canonical listing query and a first-class
     * REST API ({@code api-crud-{aggId}}) whose operations rest on the trio and the query. Idempotent;
     * returns the API id.
     */
    private String ensureCrudApi(AggregateEntity aggregate) {
        var boundedContext = ensureCrudCore(aggregate);
        var qsId = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudApi.queryServiceId(aggregate.id());
        if (repository.findById(qsId, QueryServiceEntity.class).isEmpty()) {
            repository.save(io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                    .CrudApi.listingQuery(aggregate, boundedContext.id()));
        }
        var apiId = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudApi.apiId(aggregate.id());
        if (repository.findById(apiId, ApiEntity.class).isEmpty()) {
            repository.save(io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                    .CrudApi.forAggregate(aggregate, boundedContext.id()));
        }
        return apiId;
    }

    /**
     * An external system operates on an aggregate through its CRUD: the CRUD API is materialized
     * (resting on the trio + listing query), the external system is wired as a consumer
     * (dependsOnApiIds), and an INBOUND ACL routes its calls to the CRUD use cases. The API twin of
     * {@link #addUiCrud}: the UI says WHERE the CRUD is shown, the API says WHO integrates with it.
     */
    private void addExternalCrud(EditorCommand command) {
        var project = projects.owningProject();
        var external = projects.externalSystems().stream()
                .filter(x -> x.id().equals(command.sourceId())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown external system: " + command.sourceId()));
        var aggregate = repository.findById(command.targetId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.targetId()));
        var apiId = ensureCrudApi(aggregate);
        var boundedContext = ensureCrudCore(aggregate);
        wireInboundAcl(boundedContext, external.id(), external.name(),
                io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                        .CrudUseCases.idsOf(aggregate.id()));
        if (!external.dependsOnApiIds().contains(apiId)) {
            var ids = new ArrayList<>(external.dependsOnApiIds());
            ids.add(apiId);
            projects.replaceExternalSystems(projects.externalSystems().stream()
                    .map(x -> x.id().equals(external.id()) ? x.withDependsOnApiIds(ids) : x).toList());
        }
    }

    private void removeExternalCrud(EditorCommand command) {
        var apiId = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudApi.apiId(command.targetId());
        var project = projects.owningProject();
        projects.externalSystems().stream().filter(x -> x.id().equals(command.sourceId())).findFirst()
                .filter(x -> x.dependsOnApiIds().contains(apiId))
                .ifPresent(x -> projects.replaceExternalSystems(projects.externalSystems().stream()
                                .map(s -> s.id().equals(x.id())
                                        ? s.withDependsOnApiIds(s.dependsOnApiIds().stream()
                                                .filter(id -> !id.equals(apiId)).toList())
                                        : s).toList()));
        // Drop the external system's INBOUND ACL entries to the aggregate's CRUD use cases; leave the API.
        var crudIds = io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudUseCases.idsOf(command.targetId());
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.acls() != null && m.acls().stream().anyMatch(a ->
                        command.sourceId().equals(a.externalSystem())
                                && "INBOUND".equalsIgnoreCase(a.direction())))
                .forEach(m -> repository.save(m.toBuilder().acls(m.acls().stream()
                        .map(a -> command.sourceId().equals(a.externalSystem())
                                && "INBOUND".equalsIgnoreCase(a.direction()) && a.translatedUseCaseIds() != null
                                ? new AclEntity(a.id(), a.name(), a.externalSystem(), a.description(),
                                        a.direction(), a.gatewayId(), a.translatedDomainEventIds(),
                                        a.translatedUseCaseIds().stream().filter(id -> !crudIds.contains(id)).toList())
                                : a)
                        .filter(a -> !(command.sourceId().equals(a.externalSystem())
                                && "INBOUND".equalsIgnoreCase(a.direction())
                                && (a.translatedUseCaseIds() == null || a.translatedUseCaseIds().isEmpty())
                                && (a.translatedDomainEventIds() == null || a.translatedDomainEventIds().isEmpty())))
                        .toList()).build()));
    }

    /**
     * Another bounded context consumes an aggregate through its CRUD API: the API is materialized
     * (resting on the trio + listing query), ready for the consuming context to call. Cross-service
     * consumption becomes gRPC through the existing consumption derivation once a use case calls it.
     */
    private void addContextCrud(EditorCommand command) {
        repository.findById(command.sourceId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown bounded context: " + command.sourceId()));
        var aggregate = repository.findById(command.targetId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.targetId()));
        ensureCrudApi(aggregate);
    }

    private void removeContextCrud(EditorCommand command) {
        // The API is shared across consumers; relating/unrelating a context leaves it in place.
    }

    /** Route an external system's inbound calls to the given use cases via a single INBOUND ACL. */
    private void wireInboundAcl(BoundedContextEntity boundedContext, String externalId,
                                String externalName, List<String> useCaseIds) {
        var acls = new ArrayList<>(boundedContext.acls() == null ? List.<AclEntity>of() : boundedContext.acls());
        var existing = acls.stream()
                .filter(a -> externalId.equals(a.externalSystem()) && "INBOUND".equalsIgnoreCase(a.direction()))
                .findFirst().orElse(null);
        var translated = new ArrayList<>(existing == null || existing.translatedUseCaseIds() == null
                ? List.<String>of() : existing.translatedUseCaseIds());
        useCaseIds.stream().filter(id -> !translated.contains(id)).forEach(translated::add);
        if (existing != null) {
            acls.set(acls.indexOf(existing), new AclEntity(existing.id(), existing.name(),
                    existing.externalSystem(), existing.description(), existing.direction(),
                    existing.gatewayId(), existing.translatedDomainEventIds(), translated));
        } else {
            acls.add(new AclEntity("acl-" + externalId + "-" + boundedContext.id(),
                    "Acl" + capitalize(externalName), externalId, null, "INBOUND", null,
                    List.of(), translated));
        }
        repository.save(boundedContext.toBuilder().acls(acls).build());
    }

    /**
     * A UI app manages an aggregate through a CRUD: the intention (a menu entry targeting the
     * aggregate) is added and immediately materialized — a CRUD page, its listing query, the shared
     * CRUD use cases and the lifecycle events — by the menu→aggregate derivation. Symmetric to
     * {@link #addActorCrud}: the actor says WHO may run the CRUD, the app says WHERE it is shown.
     */
    private void addUiCrud(EditorCommand command) {
        var app = repository.findById(command.sourceId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.sourceId()));
        var aggregate = repository.findById(command.targetId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.targetId()));
        var pageId = "pg-crud-" + aggregate.id();
        if (!menuOpensCrud(app.menuItems(), pageId, aggregate.id())) {
            var items = new ArrayList<>(app.menuItems() == null
                    ? List.<UiMenuItemEntity>of() : app.menuItems());
            items.add(new UiMenuItemEntity(aggregate.name(), null, null, null, null, List.of(),
                    "mi-crud-" + aggregate.id(), null, null, aggregate.id(), null, null));
            repository.save(app.toBuilder().menuItems(items).build());
        }
        deriveMenuCrud.handle(app.id());
    }

    private void removeUiCrud(EditorCommand command) {
        var pageId = "pg-crud-" + command.targetId();
        repository.findById(command.sourceId(), UiAdapterEntity.class).ifPresent(app ->
                repository.save(app.toBuilder()
                        .menuItems(withoutCrudEntries(app.menuItems(), pageId, command.targetId()))
                        .build()));
    }

    /** True when some menu entry (at any depth) already opens the aggregate's CRUD — page or intention. */
    private static boolean menuOpensCrud(List<UiMenuItemEntity> items, String pageId, String aggregateId) {
        if (items == null) return false;
        for (var item : items) {
            if (pageId.equals(item.pageId()) || aggregateId.equals(item.aggregateId())) return true;
            if (menuOpensCrud(item.children(), pageId, aggregateId)) return true;
        }
        return false;
    }

    /** Drops every menu entry (at any depth) that opens this aggregate's CRUD; leaves the page in place. */
    private static List<UiMenuItemEntity> withoutCrudEntries(List<UiMenuItemEntity> items,
                                                             String pageId, String aggregateId) {
        if (items == null) return null;
        var out = new ArrayList<UiMenuItemEntity>();
        for (var item : items) {
            if (pageId.equals(item.pageId()) || aggregateId.equals(item.aggregateId())) continue;
            out.add(new UiMenuItemEntity(item.label(), item.icon(), item.description(), item.route(),
                    item.pageId(), withoutCrudEntries(item.children(), pageId, aggregateId),
                    item.id(), item.uiAdapterId(), item.useCaseId(), item.aggregateId(),
                    item.queryServiceId(), item.queryOperationId()));
        }
        return out;
    }

    private void removeActorCrud(EditorCommand command) {
        var aggregate = repository.findById(command.targetId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.targetId()));
        var crudIds = crudUseCases(aggregate).stream().map(UseCaseEntity::id).toList();
        repository.findById(command.sourceId(), RoleEntity.class).ifPresent(r ->
                repository.save(r.withAllowedUseCaseIds(
                        r.allowedUseCaseIds().stream().filter(id -> !crudIds.contains(id)).toList())));
        // The stub use cases leave too, unless something else references them by now.
        var referenced = repository.findAllOfType(UseCaseEntity.class).stream()
                .filter(uc -> uc.steps() != null)
                .flatMap(uc -> uc.steps().stream())
                .map(UseCaseStepEntity::useCaseId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        var otherActors = repository.findAllOfType(RoleEntity.class).stream()
                .filter(r -> !r.id().equals(command.sourceId()))
                .flatMap(r -> r.allowedUseCaseIds().stream())
                .collect(java.util.stream.Collectors.toSet());
        var removable = crudIds.stream()
                .filter(id -> !referenced.contains(id) && !otherActors.contains(id))
                .toList();
        if (!removable.isEmpty()) {
            repository.findAllOfType(BoundedContextEntity.class).stream()
                    .filter(m -> m.useCaseIds() != null && m.useCaseIds().stream().anyMatch(removable::contains))
                    .forEach(m -> repository.save(m.toBuilder()
                            .useCaseIds(m.useCaseIds().stream().filter(id -> !removable.contains(id)).toList())
                            .build()));
            repository.deleteAllById(removable, UseCaseEntity.class);
        }
    }

    private void addUseCase(EditorCommand command) {
        if (repository.findById(command.id(), UseCaseEntity.class).isPresent()) return;
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        // A policy is a use-case-shaped reaction: same catalog, no UI derivation.
        repository.save(stubUseCase(command.id(), command.name(), List.of(), false,
                Boolean.TRUE.equals(command.policy())));
        var useCaseIds = new ArrayList<>(boundedContext.useCaseIds() == null ? List.of() : boundedContext.useCaseIds());
        useCaseIds.add(command.id());
        repository.save(boundedContext.toBuilder().useCaseIds(useCaseIds).build());
    }

    private void removeUseCase(EditorCommand command) {
        var calledByUseCase = repository.findAllOfType(UseCaseEntity.class).stream()
                .filter(uc -> uc.steps() != null)
                .anyMatch(uc -> uc.steps().stream().anyMatch(st -> command.id().equals(st.useCaseId())));
        if (calledByUseCase) {
            throw new IllegalArgumentException(
                    "El caso de uso " + command.id() + " lo invocan otros casos de uso; quita esas llamadas primero");
        }
        var inProcesses = repository.findAllOfType(ProcessEntity.class).stream()
                .flatMap(p -> p.steps().stream())
                .anyMatch(st -> command.id().equals(st.useCaseId()));
        if (inProcesses) {
            throw new IllegalArgumentException(
                    "El caso de uso " + command.id() + " participa en procesos; quítalo primero");
        }
        var triggersFlow = repository.findAllOfType(FlowEntity.class).stream()
                .anyMatch(f -> command.id().equals(f.targetUseCaseId()) || command.id().equals(f.triggerUseCaseId()));
        if (triggersFlow) {
            throw new IllegalArgumentException(
                    "El caso de uso " + command.id() + " participa en flows; bórralos primero");
        }
        var translatedByAcl = repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.acls() != null)
                .flatMap(m -> m.acls().stream())
                .anyMatch(a -> a.translatedUseCaseIds() != null
                        && a.translatedUseCaseIds().contains(command.id()));
        if (translatedByAcl) {
            throw new IllegalArgumentException(
                    "El caso de uso " + command.id() + " lo llama un sistema externo (ACL); quita esa llamada primero");
        }
        repository.findAllOfType(RoleEntity.class).stream()
                .filter(r -> r.allowedUseCaseIds().contains(command.id()))
                .forEach(r -> repository.save(r.withAllowedUseCaseIds(
                        r.allowedUseCaseIds().stream().filter(id -> !id.equals(command.id())).toList())));
        repository.findAllOfType(AiAgentEntity.class).stream()
                .filter(a -> a.allowedUseCaseIds().contains(command.id()))
                .forEach(a -> repository.save(AgentEditorCommands.withAllowedUseCaseIds(a,
                        a.allowedUseCaseIds().stream().filter(id -> !id.equals(command.id())).toList())));
        repository.findAllOfType(McpGatewayEntity.class).stream()
                .filter(g -> g.useCaseIds().contains(command.id()))
                .forEach(g -> repository.save(g.withUseCaseIds(
                        AgentEditorCommands.without(g.useCaseIds(), command.id()))));
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.useCaseIds() != null && m.useCaseIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .useCaseIds(m.useCaseIds().stream().filter(id -> !id.equals(command.id())).toList())
                        .build()));
        repository.deleteAllById(List.of(command.id()), UseCaseEntity.class);
    }

    /** An external system calls one of our use cases: an INBOUND ACL in the target boundedContext. */
    private void addExternalCall(EditorCommand command) {
        var external = projects.externalSystems().stream()
                .filter(x -> x.id().equals(command.sourceId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown external system: " + command.sourceId()));
        repository.findById(command.targetId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.targetId()));
        var boundedContext = repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.useCaseIds() != null && m.useCaseIds().contains(command.targetId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "El caso de uso " + command.targetId() + " no pertenece a ningún bounded context"));
        var acls = new ArrayList<>(boundedContext.acls() == null ? List.of() : boundedContext.acls());
        var existing = acls.stream()
                .filter(a -> external.id().equals(a.externalSystem()) && "INBOUND".equalsIgnoreCase(a.direction()))
                .findFirst().orElse(null);
        if (existing != null) {
            if (existing.translatedUseCaseIds() != null
                    && existing.translatedUseCaseIds().contains(command.targetId())) return;
            var ids = new ArrayList<>(existing.translatedUseCaseIds() == null
                    ? List.of() : existing.translatedUseCaseIds());
            ids.add(command.targetId());
            acls.set(acls.indexOf(existing), new AclEntity(existing.id(), existing.name(),
                    existing.externalSystem(), existing.description(), existing.direction(),
                    existing.gatewayId(), existing.translatedDomainEventIds(), ids));
        } else {
            acls.add(new AclEntity("acl-" + external.id() + "-" + boundedContext.id(),
                    "Acl" + capitalize(external.name()), external.id(), null, "INBOUND", null,
                    List.of(), List.of(command.targetId())));
        }
        repository.save(boundedContext.toBuilder().acls(acls).build());
    }

    private void removeExternalCall(EditorCommand command) {
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.acls() != null && m.acls().stream().anyMatch(a ->
                        command.sourceId().equals(a.externalSystem())
                                && "INBOUND".equalsIgnoreCase(a.direction())
                                && a.translatedUseCaseIds() != null
                                && a.translatedUseCaseIds().contains(command.targetId())))
                .forEach(m -> repository.save(m.toBuilder().acls(m.acls().stream()
                        .map(a -> {
                            if (!command.sourceId().equals(a.externalSystem())
                                    || !"INBOUND".equalsIgnoreCase(a.direction())) return a;
                            var ids = a.translatedUseCaseIds().stream()
                                    .filter(id -> !id.equals(command.targetId())).toList();
                            return new AclEntity(a.id(), a.name(), a.externalSystem(), a.description(),
                                    a.direction(), a.gatewayId(), a.translatedDomainEventIds(), ids);
                        })
                        // An ACL created just for this call leaves when it translates nothing.
                        .filter(a -> !(a.id().startsWith("acl-")
                                && (a.translatedUseCaseIds() == null || a.translatedUseCaseIds().isEmpty())
                                && (a.translatedDomainEventIds() == null || a.translatedDomainEventIds().isEmpty())))
                        .toList()).build()));
    }

    /** A use case OFFERED by an external system (boundedContextId carries the external system id). */
    private void addExternalUseCase(EditorCommand command) {
        var project = projects.owningProject();
        var externalSystems = new ArrayList<>(projects.externalSystems());
        var external = externalSystems.stream()
                .filter(x -> x.id().equals(command.boundedContextId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown external system: " + command.boundedContextId()));
        if (external.useCases().stream().anyMatch(u -> u.id().equals(command.id()))) return;
        var useCases = new ArrayList<>(external.useCases());
        useCases.add(new ExternalSystemUseCaseEntity(command.id(), command.name(), null));
        externalSystems.set(externalSystems.indexOf(external), withUseCases(external, useCases));
        projects.replaceExternalSystems(externalSystems);
    }

    private void removeExternalUseCase(EditorCommand command) {
        var called = repository.findAllOfType(UseCaseEntity.class).stream()
                .filter(uc -> uc.steps() != null)
                .anyMatch(uc -> uc.steps().stream().anyMatch(st -> command.id().equals(st.externalUseCaseId())));
        if (called) {
            throw new IllegalArgumentException(
                    "El caso de uso externo " + command.id() + " lo llaman casos de uso; quita esas llamadas primero");
        }
        var project = projects.owningProject();
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .map(x -> withUseCases(x, x.useCases().stream()
                        .filter(u -> !u.id().equals(command.id())).toList()))
                .toList());
    }

    /** Our use case calls an external system's use case: a CallExternalUseCase step. */
    private void addExternalUcCall(EditorCommand command) {
        var source = repository.findById(command.sourceId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.sourceId()));
        var target = projects.externalSystems().stream()
                .flatMap(x -> x.useCases().stream())
                .filter(u -> u.id().equals(command.targetId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown external use case: " + command.targetId()));
        var steps = new ArrayList<>(source.steps() == null ? List.of() : source.steps());
        if (steps.stream().anyMatch(st -> target.id().equals(st.externalUseCaseId()))) return;
        steps.add(new UseCaseStepEntity("step-ext-" + target.id(), "call" + capitalize(target.name()),
                io.mateu.modux.modeldrivengenerator.domain.aggregates.usecase.vo.UseCaseStepType.CallExternalUseCase,
                null, null, null, null, null, null, null, null, null, null, null, target.id()));
        repository.save(withSteps(source, steps));
    }

    private void removeExternalUcCall(EditorCommand command) {
        repository.findById(command.sourceId(), UseCaseEntity.class).ifPresent(uc ->
                repository.save(withSteps(uc, (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                        .filter(st -> !command.targetId().equals(st.externalUseCaseId()))
                        .toList())));
    }

    /** Record copy with only useCases replaced — every other field preserved verbatim. */
    static ExternalSystemEntity withUseCases(
            ExternalSystemEntity x, List<ExternalSystemUseCaseEntity> useCases) {
        return x.withUseCases(useCases);
    }

    /** Record copy with only tables replaced — every other field preserved verbatim. */
    static ExternalSystemEntity withTables(
            ExternalSystemEntity x, List<ExternalSystemTableEntity> tables) {
        return x.withTables(tables);
    }

    /** An MCP server published by an external system (boundedContextId carries the external system id). */
    private void addMcpServer(EditorCommand command) {
        var project = projects.owningProject();
        var externalSystems = new ArrayList<>(projects.externalSystems());
        var external = externalSystems.stream()
                .filter(x -> x.id().equals(command.boundedContextId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown external system: " + command.boundedContextId()));
        if (external.mcpServers().stream().anyMatch(s -> s.id().equals(command.id()))) return;
        var servers = new ArrayList<>(external.mcpServers());
        servers.add(new McpServerEntity(command.id(), command.name(), null, command.uri()));
        externalSystems.set(externalSystems.indexOf(external), external.withMcpServers(servers));
        projects.replaceExternalSystems(externalSystems);
    }

    /** Removing an MCP server also unlinks it from agents and gateways that aggregated it. */
    private void removeMcpServer(EditorCommand command) {
        repository.findAllOfType(AiAgentEntity.class).stream()
                .filter(a -> a.allowedMcpServerIds().contains(command.id()))
                .forEach(a -> repository.save(a.withAllowedMcpServerIds(
                        a.allowedMcpServerIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())));
        repository.findAllOfType(McpGatewayEntity.class).stream()
                .filter(g -> g.mcpServerIds().contains(command.id()))
                .forEach(g -> repository.save(g.withMcpServerIds(
                        AgentEditorCommands.without(g.mcpServerIds(), command.id()))));
        var project = projects.owningProject();
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .map(x -> x.withMcpServers(x.mcpServers().stream()
                        .filter(s -> !s.id().equals(command.id())).toList()))
                .toList());
    }

    /** A table offered by an external system (boundedContextId carries the external system id). */
    private void addExternalTable(EditorCommand command) {
        var project = projects.owningProject();
        var externalSystems = new ArrayList<>(projects.externalSystems());
        var external = externalSystems.stream()
                .filter(x -> x.id().equals(command.boundedContextId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown external system: " + command.boundedContextId()));
        if (external.tables().stream().anyMatch(t -> t.id().equals(command.id()))) return;
        var tables = new ArrayList<>(external.tables());
        tables.add(new ExternalSystemTableEntity(command.id(), command.name(), null));
        externalSystems.set(externalSystems.indexOf(external), withTables(external, tables));
        projects.replaceExternalSystems(externalSystems);
    }

    private void removeExternalTable(EditorCommand command) {
        var polled = repository.findAllOfType(ProjectionEntity.class).stream()
                .anyMatch(p -> command.id().equals(p.sourceExternalTableId()));
        if (polled) {
            throw new IllegalArgumentException("La tabla " + command.id()
                    + " la proyectan proyecciones; bórralas primero");
        }
        repository.findAllOfType(RagEntity.class).stream()
                .filter(r -> r.sourceExternalTableIds().contains(command.id()))
                .forEach(r -> repository.save(r.withSourceExternalTableIds(
                        AgentEditorCommands.without(r.sourceExternalTableIds(), command.id()))));
        var project = projects.owningProject();
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .map(x -> withTables(x, x.tables().stream()
                        .filter(t -> !t.id().equals(command.id())).toList()))
                .toList());
    }

    /** The three stub CRUD use cases for an aggregate, with steps anchored to it. */
    static List<UseCaseEntity> crudUseCases(AggregateEntity aggregate) {
        // Shared with the CRUD-page derivation so an actor over an aggregate and a UI over it
        // reinforce the same trio instead of each minting its own (see CrudUseCases).
        return io.mateu.modux.modeldrivengenerator.application.usecases.aggregate.scaffold
                .CrudUseCases.forAggregate(aggregate);
    }

    /** UI-exposed stub (the CRUD default). */
    static UseCaseEntity stubUseCase(String id, String name, List<UseCaseStepEntity> steps) {
        return stubUseCase(id, name, steps, true);
    }

    /** A minimal use case stub — fields get refined later through the CRUDs. */
    static UseCaseEntity stubUseCase(String id, String name, List<UseCaseStepEntity> steps,
                                             boolean exposedAsUi) {
        return stubUseCase(id, name, steps, exposedAsUi, false);
    }

    static UseCaseEntity stubUseCase(String id, String name, List<UseCaseStepEntity> steps,
                                             boolean exposedAsUi, boolean policy) {
        return new UseCaseEntity(id, name, false, false, false, false, exposedAsUi,
                null, null, steps, List.of(), List.of(), null, null, null, null,
                null, null, null, null, null, false, null, null, null, false, null,
                false, null, null, null, List.of(), policy, null);
    }

    static String capitalize(String s) {
        return s == null || s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private void addDomainService(EditorCommand command) {
        if (repository.findById(command.id(), DomainServiceEntity.class).isPresent()) return;
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        repository.save(new DomainServiceEntity(command.id(), command.name(), null, List.of(), null));
        var domainServiceIds = new ArrayList<>(boundedContext.domainServiceIds());
        domainServiceIds.add(command.id());
        repository.save(boundedContext.toBuilder().domainServiceIds(domainServiceIds).build());
    }

    private void removeDomainService(EditorCommand command) {
        var triggersFlow = repository.findAllOfType(FlowEntity.class).stream()
                .anyMatch(f -> command.id().equals(f.triggerDomainServiceId()));
        if (triggersFlow) {
            throw new IllegalArgumentException(
                    "El servicio de dominio " + command.id() + " dispara flows; bórralos primero");
        }
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.domainServiceIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .domainServiceIds(m.domainServiceIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build()));
        repository.deleteAllById(List.of(command.id()), DomainServiceEntity.class);
    }

    /** Record copy with only emits replaced. */
    static OperationEntity withEmits(OperationEntity op, String emits) {
        return new OperationEntity(op.id(), op.name(), op.inputModelId(), op.outputModelId(),
                op.preconditions(), op.sets(), emits == null || emits.isBlank() ? null : emits,
                op.type(), op.paginated(), op.defaultPageSize(), op.intent());
    }

    /** Record copy with only operations replaced — every other field preserved verbatim. */
    static AggregateEntity withOperations(AggregateEntity a, List<OperationEntity> operations) {
        return new AggregateEntity(
                a.id(), a.name(), a.modelId(), a.persistenceType(), a.idType(),
                a.tableName(), a.tableSchema(), a.optimisticLockingEnabled(),
                a.eventSourcingEnabled(), a.snapshotFrequency(), operations,
                a.invariants(), a.valueObjectIds(), a.lifecycle(), a.audited(), a.decisionIds(), null);
    }

    /** Record copy with only steps replaced — every other field preserved verbatim. */
    static UseCaseEntity withSteps(UseCaseEntity uc, List<UseCaseStepEntity> steps) {
        // a copy, not a positional rebuild: that one silently dropped every field added later (title…)
        return uc.toBuilder().steps(steps).build();
    }

    /**
     * A read model born from an aggregate: it lives in the aggregate's boundedContext and its
     * shape starts as the aggregate's state model (refinable later through the CRUDs).
     */
    private void addReadModel(EditorCommand command) {
        if (repository.findById(command.id(), ReadModelEntity.class).isPresent()) return;
        var aggregate = repository.findById(command.aggregateId(), AggregateEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown aggregate: " + command.aggregateId()));
        var boundedContext = repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.aggregateIds() != null && m.aggregateIds().contains(aggregate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "El agregado " + aggregate.id() + " no pertenece a ningún bounded context"));
        repository.save(new ReadModelEntity(command.id(), command.name(), boundedContext.id(),
                null, aggregate.modelId(), null, null, aggregate.id(), null));
        var readModelIds = new ArrayList<>(
                boundedContext.readModelIds() == null ? List.of() : boundedContext.readModelIds());
        readModelIds.add(command.id());
        repository.save(boundedContext.toBuilder().readModelIds(readModelIds).build());
    }

    private void removeReadModel(EditorCommand command) {
        var feedingProjection = repository.findAllOfType(ProjectionEntity.class).stream()
                .anyMatch(p -> command.id().equals(p.readModelId()));
        if (feedingProjection) {
            throw new IllegalArgumentException(
                    "El read model " + command.id() + " tiene proyecciones; bórralas primero");
        }
        var name = repository.findById(command.id(), ReadModelEntity.class)
                .map(ReadModelEntity::name).orElse(null);
        var materializedByFlow = name != null && repository.findAllOfType(FlowEntity.class).stream()
                .anyMatch(f -> name.equals(f.readModelName()));
        if (materializedByFlow) {
            throw new IllegalArgumentException(
                    "El read model " + name + " lo materializa un flow; borra el flow primero");
        }
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.readModelIds() != null && m.readModelIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .readModelIds(m.readModelIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build()));
        repository.deleteAllById(List.of(command.id()), ReadModelEntity.class);
    }

    /**
     * A projection SOURCED FROM AN AGGREGATE's state (no event handlers): the aggregate is
     * projected onto a read model — possibly in another bounded context. Without a
     * readModelId a stub read model is born in the target boundedContext, shaped after the
     * aggregate's state model. How the state travels is a later decision.
     */
    private void addProjection(EditorCommand command) {
        if (repository.findById(command.id(), ProjectionEntity.class).isPresent()) return;
        // Exactly one source: an aggregate's state, an external operation to poll, or a
        // legacy table to poll.
        AggregateEntity aggregate = null;
        if (command.aggregateId() != null) {
            aggregate = repository.findById(command.aggregateId(), AggregateEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown aggregate: " + command.aggregateId()));
        } else if (command.externalUseCaseId() != null) {
            var known = projects.externalSystems().stream()
                    .flatMap(x -> x.useCases().stream())
                    .anyMatch(u -> u.id().equals(command.externalUseCaseId()));
            if (!known) {
                throw new IllegalArgumentException(
                        "Unknown external use case: " + command.externalUseCaseId());
            }
        } else if (command.externalTableId() != null) {
            var known = projects.externalSystems().stream()
                    .flatMap(x -> x.tables().stream())
                    .anyMatch(t -> t.id().equals(command.externalTableId()));
            if (!known) {
                throw new IllegalArgumentException(
                        "Unknown external table: " + command.externalTableId());
            }
        } else {
            throw new IllegalArgumentException(
                    "La proyección necesita una fuente: agregado, operación externa o tabla");
        }
        String readModelId;
        BoundedContextEntity owner;
        if (command.targetId() != null
                && repository.findById(command.targetId(), ReadModelEntity.class).isPresent()) {
            readModelId = command.targetId();
            owner = repository.findAllOfType(BoundedContextEntity.class).stream()
                    .filter(m -> m.readModelIds() != null && m.readModelIds().contains(readModelId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "El read model " + readModelId + " no pertenece a ningún bounded context"));
        } else {
            owner = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown boundedContext: " + command.boundedContextId()));
            readModelId = "rm-" + command.id().replaceFirst("^proj-", "");
            if (repository.findById(readModelId, ReadModelEntity.class).isEmpty()) {
                repository.save(new ReadModelEntity(readModelId,
                        command.readModelName() != null ? command.readModelName()
                                : (aggregate != null ? aggregate.name() + "View" : command.name()),
                        owner.id(), null,
                        aggregate != null ? aggregate.modelId() : null,
                        null, null,
                        aggregate != null ? aggregate.id() : null, null));
                var readModelIds = new ArrayList<>(
                        owner.readModelIds() == null ? List.of() : owner.readModelIds());
                readModelIds.add(readModelId);
                owner = owner.toBuilder().readModelIds(readModelIds).build();
                repository.save(owner);
            }
        }
        repository.save(new ProjectionEntity(command.id(), command.name(), readModelId,
                List.of(), null, null, null, false, null,
                aggregate != null ? aggregate.id() : null,
                command.externalUseCaseId(), command.externalTableId(), null));
        var projectionIds = new ArrayList<>(
                owner.projectionIds() == null ? List.of() : owner.projectionIds());
        projectionIds.add(command.id());
        repository.save(owner.toBuilder().projectionIds(projectionIds).build());
    }

    private void removeProjection(EditorCommand command) {
        var updatedBySubscription = repository.findAllOfType(SubscriptionEntity.class).stream()
                .filter(s -> s.actions() != null)
                .anyMatch(s -> s.actions().stream()
                        .anyMatch(a -> command.id().equals(a.projectionId())));
        if (updatedBySubscription) {
            throw new IllegalArgumentException("La proyección " + command.id()
                    + " la actualizan subscriptions; quita esas acciones primero");
        }
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.projectionIds() != null && m.projectionIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .projectionIds(m.projectionIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build()));
        repository.deleteAllById(List.of(command.id()), ProjectionEntity.class);
    }

    /** A published API as a first-class element (usually born from an import). */
    private void addApi(EditorCommand command) {
        if (repository.findById(command.id(), ApiEntity.class).isPresent()) return;
        repository.save(new ApiEntity(command.id(), command.name(), null, List.of()));
    }

    private void removeApi(EditorCommand command) {
        var dependedOn = projects.externalSystems().stream()
                .anyMatch(x -> x.dependsOnApiIds().contains(command.id()));
        if (dependedOn) {
            throw new IllegalArgumentException(
                    "La API " + command.id() + " tiene sistemas externos que dependen de ella; quita esas dependencias primero");
        }
        var proxied = repository.findAllOfType(ProxyApiEntity.class).stream()
                .anyMatch(px -> command.id().equals(px.targetApiId()));
        if (proxied) {
            throw new IllegalArgumentException(
                    "La API " + command.id() + " tiene proxies que apuntan a ella; quita esos proxies primero");
        }
        // Gateways and agents let go of the API and its operations.
        var leavingOpIds = repository.findById(command.id(), ApiEntity.class).stream()
                .flatMap(a -> a.operations().stream()).map(ApiOperationEntity::id)
                .collect(java.util.stream.Collectors.toSet());
        repository.findAllOfType(McpGatewayEntity.class).stream()
                .filter(g -> g.apiIds().contains(command.id())
                        || g.apiOperationIds().stream().anyMatch(leavingOpIds::contains))
                .forEach(g -> repository.save(g
                        .withApiIds(AgentEditorCommands.without(g.apiIds(), command.id()))
                        .withApiOperationIds(g.apiOperationIds().stream()
                                .filter(id -> !leavingOpIds.contains(id)).toList())));
        repository.findAllOfType(AiAgentEntity.class).stream()
                .filter(a -> a.allowedApiOperationIds().stream().anyMatch(leavingOpIds::contains))
                .forEach(a -> repository.save(a.withAllowedApiOperationIds(
                        a.allowedApiOperationIds().stream()
                                .filter(id -> !leavingOpIds.contains(id)).toList())));
        repository.deleteAllById(List.of(command.id()), ApiEntity.class);
    }

    private void addApiOperation(EditorCommand command) {
        var api = requireApi(command.apiId());
        if (api.operations().stream().anyMatch(o -> o.id().equals(command.id()))) return;
        var operations = new ArrayList<>(api.operations());
        operations.add(new ApiOperationEntity(command.id(), command.name(),
                command.httpMethod(), command.path(), null,
                command.boundedContextId(), command.targetUseCaseId()));
        repository.save(withApiOperations(api, operations));
    }

    private void removeApiOperation(EditorCommand command) {
        var api = requireApi(command.apiId());
        // Gateways and agents let go of the operation before it disappears.
        repository.findAllOfType(McpGatewayEntity.class).stream()
                .filter(g -> g.apiOperationIds().contains(command.id()))
                .forEach(g -> repository.save(g.withApiOperationIds(
                        AgentEditorCommands.without(g.apiOperationIds(), command.id()))));
        repository.findAllOfType(AiAgentEntity.class).stream()
                .filter(a -> a.allowedApiOperationIds().contains(command.id()))
                .forEach(a -> repository.save(a.withAllowedApiOperationIds(
                        AgentEditorCommands.without(a.allowedApiOperationIds(), command.id()))));
        repository.save(withApiOperations(api, api.operations().stream()
                .filter(o -> !o.id().equals(command.id())).toList()));
    }

    /** Wires (or, with both targets null, unwires) the operation to its implementer. */
    private void setApiOperationTarget(EditorCommand command) {
        var api = requireApi(command.apiId());
        if (command.targetUseCaseId() != null
                && repository.findById(command.targetUseCaseId(), UseCaseEntity.class).isEmpty()) {
            throw new IllegalArgumentException("Unknown use case: " + command.targetUseCaseId());
        }
        if (command.boundedContextId() != null
                && repository.findById(command.boundedContextId(), BoundedContextEntity.class).isEmpty()) {
            throw new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId());
        }
        repository.save(withApiOperations(api, api.operations().stream()
                .map(o -> o.id().equals(command.id())
                        ? o.withTargets(command.boundedContextId(), command.targetUseCaseId())
                        : o)
                .toList()));
    }

    private ApiEntity requireApi(String apiId) {
        return repository.findById(apiId, ApiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown API: " + apiId));
    }

    /** Record copy with only operations replaced — every other field preserved verbatim. */
    static ApiEntity withApiOperations(ApiEntity a, List<ApiOperationEntity> operations) {
        return a.withOperations(operations);
    }

    private void removeDomainEvent(EditorCommand command) {
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.domainEventIds() != null && m.domainEventIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .domainEventIds(m.domainEventIds().stream()
                                .filter(id -> !id.equals(command.id())).toList())
                        .build()));
        clearAgentTriggersFor(command.id());
        repository.deleteAllById(List.of(command.id()), DomainEventEntity.class);
    }

    /** Reactive agents let go of an event that is leaving the catalog. */
    private void clearAgentTriggersFor(String eventId) {
        repository.findAllOfType(AiAgentEntity.class).stream()
                .filter(a -> a.reactsToEventIds().contains(eventId))
                .forEach(a -> repository.save(a.withReactsToEventIds(
                        AgentEditorCommands.without(a.reactsToEventIds(), eventId))));
    }

    /** Record copy with only aggregateIds replaced — every other field preserved verbatim. */
    static BoundedContextEntity withAggregateIds(BoundedContextEntity m, List<String> aggregateIds) {
        return m.toBuilder().aggregateIds(aggregateIds).build();
    }

    /** The ArchiMate vocabulary — the traced line's last word between any two elements. */
    private static final java.util.Set<String> ARCHIMATE_TYPES = java.util.Set.of(
            "association", "composition", "aggregation", "assignment", "realization",
            "specialization", "serving", "access", "influence", "triggering", "flow");

    /** The declared human interface — the UI twin of an API on the map. */
    private void addUi(EditorCommand command) {
        if (repository.findById(command.id(), UiEntity.class).isPresent()) return;
        if (command.boundedContextId() != null && repository
                .findById(command.boundedContextId(), BoundedContextEntity.class).isEmpty()) {
            throw new IllegalArgumentException("Contexto desconocido: " + command.boundedContextId());
        }
        repository.save(UiEntity.builder()
                .id(command.id()).name(command.name())
                .boundedContextId(command.boundedContextId())
                .build());
    }

    private void removeUi(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), UiEntity.class);
    }

    /**
     * Context ⇆ UI is COMPOSITION and nothing else: the context owns the
     * interface it exposes. Tracing to another context re-parents; null looses.
     */
    private void setUiContext(EditorCommand command) {
        var ui = repository.findById(command.id(), UiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("UI desconocida: " + command.id()));
        if (command.boundedContextId() != null && repository
                .findById(command.boundedContextId(), BoundedContextEntity.class).isEmpty()) {
            throw new IllegalArgumentException("Contexto desconocido: " + command.boundedContextId());
        }
        repository.save(ui.toBuilder().boundedContextId(command.boundedContextId()).build());
    }

    /** ui ⇆ app or page: the ASSIGNMENT — who is assigned to work this interface. */
    private void addUiAssignment(EditorCommand command) {
        var ui = repository.findById(command.id(), UiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("UI desconocida: " + command.id()));
        var target = command.targetId();
        if (repository.findById(target, UiAdapterEntity.class).isPresent()) {
            if (ui.appIds().contains(target)) return;
            var ids = new ArrayList<>(ui.appIds());
            ids.add(target);
            repository.save(ui.toBuilder().appIds(ids).build());
            return;
        }
        if (repository.findById(target, PageEntity.class).isPresent()) {
            if (ui.pageIds().contains(target)) return;
            var ids = new ArrayList<>(ui.pageIds());
            ids.add(target);
            repository.save(ui.toBuilder().pageIds(ids).build());
            return;
        }
        throw new IllegalArgumentException("La UI se asigna a una app o una página: " + target);
    }

    /** ui ⇆ actor: SERVING and nothing else — the interface serves the person. */
    private void addUiServing(EditorCommand command) {
        var ui = repository.findById(command.id(), UiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("UI desconocida: " + command.id()));
        if (repository.findById(command.targetId(), RoleEntity.class).isEmpty()) {
            throw new IllegalArgumentException("Actor desconocido: " + command.targetId());
        }
        if (ui.actorIds().contains(command.targetId())) return;
        var ids = new ArrayList<>(ui.actorIds());
        ids.add(command.targetId());
        repository.save(ui.toBuilder().actorIds(ids).build());
    }

    private void removeUiServing(EditorCommand command) {
        var ui = repository.findById(command.id(), UiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("UI desconocida: " + command.id()));
        repository.save(ui.toBuilder()
                .actorIds(ui.actorIds().stream().filter(x -> !x.equals(command.targetId())).toList())
                .build());
    }

    private void removeUiAssignment(EditorCommand command) {
        var ui = repository.findById(command.id(), UiEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("UI desconocida: " + command.id()));
        repository.save(ui.toBuilder()
                .appIds(ui.appIds().stream().filter(x -> !x.equals(command.targetId())).toList())
                .pageIds(ui.pageIds().stream().filter(x -> !x.equals(command.targetId())).toList())
                .build());
    }

    private void addArchimateRelation(EditorCommand command) {
        if (repository.findById(command.id(), ArchimateRelationEntity.class).isPresent()) return;
        if (command.type() == null || !ARCHIMATE_TYPES.contains(command.type())) {
            throw new IllegalArgumentException("Tipo ArchiMate desconocido: " + command.type());
        }
        repository.save(new ArchimateRelationEntity(
                command.id(), command.sourceId(), command.targetId(), command.type(),
                command.name(), null));
    }

    private void setArchimateRelationType(EditorCommand command) {
        var rel = repository.findById(command.id(), ArchimateRelationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Relación desconocida: " + command.id()));
        if (command.type() == null || !ARCHIMATE_TYPES.contains(command.type())) {
            throw new IllegalArgumentException("Tipo ArchiMate desconocido: " + command.type());
        }
        repository.save(rel.toBuilder().type(command.type()).build());
    }

    /** Swap an ArchiMate relation's ends (keeps the id, so the swap is its own undo). */
    private void invertArchimateRelation(EditorCommand command) {
        var rel = repository.findById(command.id(), ArchimateRelationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Relación desconocida: " + command.id()));
        repository.save(rel.toBuilder().sourceId(rel.targetId()).targetId(rel.sourceId()).build());
    }

    private void removeArchimateRelation(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), ArchimateRelationEntity.class);
    }

    private void addRelation(EditorCommand command) {
        var project = projects.owningProject();
        var alreadyThere = projects.contextMap().stream()
                .anyMatch(r -> r.sourceBoundedContextId().equals(command.sourceId())
                        && r.targetBoundedContextId().equals(command.targetId()));
        if (alreadyThere) return;
        var relations = new ArrayList<>(projects.contextMap());
        relations.add(new ContextMapRelationEntity(
                "rel-" + command.sourceId() + "-" + command.targetId(),
                null,
                command.sourceId(),
                command.targetId(),
                command.type(),
                null,
                List.of()));
        projects.replaceContextMap(relations);
    }

    private void removeRelation(EditorCommand command) {
        var project = projects.owningProject();
        var relations = projects.contextMap().stream()
                .filter(r -> !(r.sourceBoundedContextId().equals(command.sourceId())
                        && r.targetBoundedContextId().equals(command.targetId())))
                .toList();
        projects.replaceContextMap(relations);
    }

    /** Upserts the type ANNOTATION of a derived relation (the pair itself is computed). */
    private void setRelationType(EditorCommand command) {
        var project = projects.owningProject();
        var relations = new ArrayList<>(projects.contextMap());
        var existing = relations.stream()
                .filter(r -> r.sourceBoundedContextId().equals(command.sourceId())
                        && r.targetBoundedContextId().equals(command.targetId()))
                .findFirst().orElse(null);
        if (existing != null) {
            relations.set(relations.indexOf(existing), new ContextMapRelationEntity(
                    existing.id(), existing.name(), existing.sourceBoundedContextId(),
                    existing.targetBoundedContextId(), command.type(), existing.description(),
                    existing.decisionIds()));
        } else {
            relations.add(new ContextMapRelationEntity(
                    "rel-" + command.sourceId() + "-" + command.targetId(), null,
                    command.sourceId(), command.targetId(), command.type(), null, List.of()));
        }
        projects.replaceContextMap(relations);
    }

    /**
     * References ANOTHER project as an external system: its name and public surface (exposed use
     * cases) land as this system's use cases. Every project is a system.
     *
     * <p>What is stored is a SNAPSHOT plus a coordinate, and the split matters. The snapshot is
     * what generation reads, so a build never needs the other repository present — that hermetic
     * property is the reason references work at all across a team. The coordinate says where to
     * look when someone asks to refresh, and it is versioned with the model rather than resolved
     * against a registry on one machine. See {@code docs/design/ide-plugin.md} §4.7.
     */
    private void addProjectReference(EditorCommand command) {
        var given = command.referencedProject();
        var coordinate = given == null ? ReferencedProjectEntity.builder().build()
                : ReferencedProjectEntity.builder()
                        .gitUrl(given.gitUrl()).branch(given.branch()).path(given.path())
                        .build();
        if (coordinate.isEmpty()) {
            throw new IllegalArgumentException(
                    "Para referenciar otro proyecto hace falta su URL git o el path a su modelo");
        }
        var summary = projectReferences.read(coordinate);
        var id = command.id() == null || command.id().isBlank()
                ? "proj-" + defaultIdFor(coordinate) : command.id();
        var externalSystems = new ArrayList<>(projects.externalSystems().stream()
                .filter(x -> !x.id().equals(id))
                .toList());
        externalSystems.add(ExternalSystemEntity.builder()
                .id(id)
                .name(summary.name())
                .description("Proyecto modux referenciado")
                .decisionIds(List.of())
                .useCases(summary.useCases().stream()
                        .map(uc -> new ExternalSystemUseCaseEntity(id + "-" + uc.id(), uc.name(), null))
                        .toList())
                .referencedProject(coordinate)
                .build());
        projects.replaceExternalSystems(externalSystems);
    }

    /** A stable id from the coordinate: the repository's name, else the path's last segment. */
    private static String defaultIdFor(ReferencedProjectEntity coordinate) {
        var name = coordinate.repositoryName();
        if (name != null) return name;
        var path = java.nio.file.Path.of(coordinate.path()).normalize().getFileName();
        return path == null ? "referencia" : path.toString();
    }

    private void addExternalSystem(EditorCommand command) {
        var project = projects.owningProject();
        if (projects.externalSystems().stream().anyMatch(x -> x.id().equals(command.id()))) return;
        if (command.parentId() != null
                && projects.externalSystems().stream().noneMatch(x -> x.id().equals(command.parentId()))) {
            throw new IllegalArgumentException(
                    "El sistema externo padre " + command.parentId() + " no existe");
        }
        var externalSystems = new ArrayList<>(projects.externalSystems());
        externalSystems.add(ExternalSystemEntity.builder()
                .id(command.id()).name(command.name()).decisionIds(List.of())
                .parentExternalSystemId(command.parentId())
                .build());
        projects.replaceExternalSystems(externalSystems);
    }

    private void setExternalSystemParent(EditorCommand command) {
        var project = projects.owningProject();
        var systems = projects.externalSystems();
        if (systems.stream().noneMatch(x -> x.id().equals(command.id()))) {
            throw new IllegalArgumentException("El sistema externo " + command.id() + " no existe");
        }
        if (command.parentId() != null) {
            if (systems.stream().noneMatch(x -> x.id().equals(command.parentId()))) {
                throw new IllegalArgumentException(
                        "El sistema externo padre " + command.parentId() + " no existe");
            }
            // no cycles: the new parent must not live inside the system being nested
            for (var cur = command.parentId(); cur != null; ) {
                if (cur.equals(command.id())) {
                    throw new IllegalArgumentException(
                            "El sistema " + command.parentId() + " vive dentro de " + command.id()
                                    + " — anidarlos en círculo no tiene sentido");
                }
                var curId = cur;
                cur = systems.stream().filter(x -> x.id().equals(curId))
                        .map(ExternalSystemEntity::parentExternalSystemId)
                        .filter(java.util.Objects::nonNull)
                        .findFirst().orElse(null);
            }
        }
        projects.replaceExternalSystems(systems.stream()
                        .map(x -> x.id().equals(command.id())
                                ? x.toBuilder().parentExternalSystemId(command.parentId()).build()
                                : x)
                        // containment replaces dependency: the pair's dep edges (both
                        // directions, plain and CQRS) stop making sense once nested
                        .map(x -> command.parentId() == null ? x
                                : stripPairDependency(x, command.id(), command.parentId()))
                        .toList());
    }

    private static ExternalSystemEntity stripPairDependency(ExternalSystemEntity x, String childId, String parentId) {
        var isChild = x.id().equals(childId);
        var isParent = x.id().equals(parentId);
        if (!isChild && !isParent) return x;
        var other = isChild ? parentId : childId;
        return x.toBuilder()
                .dependsOnExternalSystemIds(x.dependsOnExternalSystemIds().stream()
                        .filter(id -> !id.equals(other)).toList())
                .cqrsExternalSystemIds(x.cqrsExternalSystemIds().stream()
                        .filter(id -> !id.equals(other)).toList())
                .build();
    }

    private void removeExternalSystem(EditorCommand command) {
        var hasSubsystems = projects.externalSystems().stream()
                .anyMatch(x -> command.id().equals(x.parentExternalSystemId()));
        if (hasSubsystems) {
            throw new IllegalArgumentException(
                    "El sistema externo " + command.id() + " tiene subsistemas; bórralos primero");
        }
        var notifiedByFlow = repository.findAllOfType(FlowEntity.class).stream()
                .anyMatch(f -> command.id().equals(f.targetBoundedContextId()));
        if (notifiedByFlow) {
            throw new IllegalArgumentException(
                    "El sistema externo " + command.id() + " es destino de flows; bórralos primero");
        }
        var dependedOnByActors = repository.findAllOfType(RoleEntity.class).stream()
                .anyMatch(r -> r.externalSystemIds().contains(command.id()));
        if (dependedOnByActors) {
            throw new IllegalArgumentException(
                    "El sistema externo " + command.id() + " tiene actores que dependen de él; quita esas dependencias primero");
        }
        var dependedOnByExternals = projects.externalSystems().stream()
                .anyMatch(x -> x.dependsOnExternalSystemIds().contains(command.id())
                        || x.cqrsExternalSystemIds().contains(command.id()));
        if (dependedOnByExternals) {
            throw new IllegalArgumentException(
                    "El sistema externo " + command.id() + " tiene sistemas externos que dependen de él; quita esas dependencias primero");
        }
        // Agents lose their links to the MCP servers leaving with the system.
        var leavingMcpIds = projects.externalSystems().stream()
                .filter(x -> x.id().equals(command.id()))
                .flatMap(x -> x.mcpServers().stream())
                .map(McpServerEntity::id)
                .collect(java.util.stream.Collectors.toSet());
        if (!leavingMcpIds.isEmpty()) {
            repository.findAllOfType(AiAgentEntity.class).stream()
                    .filter(a -> a.allowedMcpServerIds().stream().anyMatch(leavingMcpIds::contains))
                    .forEach(a -> repository.save(a.withAllowedMcpServerIds(
                            a.allowedMcpServerIds().stream()
                                    .filter(id -> !leavingMcpIds.contains(id)).toList())));
        }
        repository.findAllOfType(RagEntity.class).stream()
                .filter(r -> r.sourceExternalSystemIds().contains(command.id()))
                .forEach(r -> repository.save(r.withSourceExternalSystemIds(
                        AgentEditorCommands.without(r.sourceExternalSystemIds(), command.id()))));
        // The APIs and proxies it published survive as standalone contracts.
        repository.findAllOfType(ApiEntity.class).stream()
                .filter(a -> command.id().equals(a.publishedByExternalSystemId()))
                .forEach(a -> repository.save(a.withPublishedByExternalSystemId(null)));
        repository.findAllOfType(ProxyApiEntity.class).stream()
                .filter(px -> command.id().equals(px.publishedByExternalSystemId()))
                .forEach(px -> repository.save(px.withPublishedByExternalSystemId(null)));
        var project = projects.owningProject();
        projects.replaceExternalSystems(projects.externalSystems().stream()
                .filter(x -> !x.id().equals(command.id())).toList());
    }

    private void addViewMember(EditorCommand command) {
        var view = repository.findById(command.id(), ViewEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown view: " + command.id()));
        if (view.isComputed()) {
            throw new IllegalArgumentException(
                    "La vista " + view.name() + " es computada; sus miembros se derivan del seed");
        }
        if (view.memberIds().contains(command.targetId())) return;
        var members = new ArrayList<>(view.memberIds());
        members.add(command.targetId());
        repository.save(new ViewEntity(view.id(), view.name(), view.description(), view.kind(),
                members, view.seedId(), null));
    }

    /** Removes an element from the view WITHOUT touching the element itself. */
    private void removeViewMember(EditorCommand command) {
        repository.findById(command.id(), ViewEntity.class).ifPresent(view ->
                repository.save(new ViewEntity(view.id(), view.name(), view.description(),
                        view.kind(),
                        view.memberIds().stream()
                                .filter(id -> !id.equals(command.targetId())).toList(),
                        view.seedId(), null)));
    }

    /** exposedAsMcp holds only while some agent consumes the use case. */

    /** Record copy with only exposedAsMcp replaced — every other field preserved verbatim. */

    private void addActor(EditorCommand command) {
        if (repository.findById(command.id(), RoleEntity.class).isPresent()) return;
        repository.save(new RoleEntity(command.id(), command.name(), List.of()));
    }

    /**
     * Creates or REPLACES an interaction: the payload is the whole interaction (the
     * graphical surface edits the messages; the CRUD page edits the header fields and
     * leaves the messages untouched).
     */
    private void saveInteraction(EditorCommand command) {
        if (command.id() == null || command.id().isBlank()) {
            throw new IllegalArgumentException("La interacción necesita un id");
        }
        var triggerKind = command.triggerKind() == null || command.triggerKind().isBlank()
                ? null
                : io.mateu.modux.modeldrivengenerator.domain.aggregates.interaction.vo.InteractionTriggerKind
                        .valueOf(command.triggerKind());
        var current = repository.findById(command.id(),
                io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity.class);
        repository.save(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity.builder()
                .id(command.id())
                .name(command.name())
                .description(command.description())
                .triggerKind(triggerKind)
                .triggerRef(command.triggerRef())
                // a header-only save (no messages in the payload) keeps the stored ones
                .messages(command.messages() != null ? command.messages()
                        : current.map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity::messages)
                                .orElse(List.of()))
                .projectId(current.map(io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.InteractionEntity::projectId)
                        .orElse(null))
                .build());
    }

    private void addNote(EditorCommand command) {
        if (repository.findById(command.id(), NoteEntity.class).isPresent()) return;
        repository.save(new NoteEntity(command.id(), command.name(), List.of(), List.of(), null));
    }

    private void removeNote(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), NoteEntity.class);
    }

    private void addArea(EditorCommand command) {
        if (repository.findById(command.id(), AreaEntity.class).isPresent()) return;
        repository.save(new AreaEntity(command.id(), command.name(), null));
    }

    private void addUrl(EditorCommand command) {
        if (repository.findById(command.id(), UrlEntity.class).isPresent()) return;
        repository.save(UrlEntity.builder().id(command.id()).name(command.name())
                .url(command.uri()).build());
    }

    /** Removing the url also unlinks it from every service that answered at it. */
    private void removeUrl(EditorCommand command) {
        repository.findAllOfType(ServiceEntity.class).stream()
                .filter(sv -> sv.urlIds().contains(command.id()))
                .forEach(sv -> repository.save(sv.toBuilder()
                        .urlIds(sv.urlIds().stream().filter(x -> !x.equals(command.id())).toList())
                        .build()));
        repository.deleteAllById(List.of(command.id()), UrlEntity.class);
    }

    private void addServiceUrl(EditorCommand command) {
        var service = repository.findById(command.serviceId(), ServiceEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown service: " + command.serviceId()));
        repository.findById(command.id(), UrlEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown url: " + command.id()));
        if (service.urlIds().contains(command.id())) return;
        repository.save(service.toBuilder()
                .urlIds(java.util.stream.Stream.concat(service.urlIds().stream(),
                        java.util.stream.Stream.of(command.id())).toList())
                .build());
    }

    private void removeServiceUrl(EditorCommand command) {
        repository.findById(command.serviceId(), ServiceEntity.class)
                .ifPresent(sv -> repository.save(sv.toBuilder()
                        .urlIds(sv.urlIds().stream().filter(x -> !x.equals(command.id())).toList())
                        .build()));
    }

    /** Notes pointing at the area keep their (now dangling) ref — the threads just stop drawing. */
    private void removeArea(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), AreaEntity.class);
    }

    /**
     * Points the note at one more target. Element targets (plain ids) must exist; relation
     * targets are recognised by their {@code ->} and stored as edge refs, unchecked — they
     * are presentation coordinates, not model references.
     */
    private void noteAttach(EditorCommand command) {
        var note = repository.findById(command.id(), NoteEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Nota desconocida: " + command.id()));
        var ref = Objects.requireNonNull(command.targetId(), "note-attach.targetId");
        if (ref.contains("->")) {
            if (note.edgeRefs().contains(ref)) return;
            var refs = new ArrayList<>(note.edgeRefs());
            refs.add(ref);
            repository.save(note.toBuilder().edgeRefs(refs).build());
            return;
        }
        var known = repository.allElements().stream()
                .anyMatch(e -> CatalogReflection.ids(e).contains(ref));
        if (!known) {
            throw new IllegalArgumentException("Elemento desconocido: " + ref);
        }
        if (note.targetIds().contains(ref)) return;
        var ids = new ArrayList<>(note.targetIds());
        ids.add(ref);
        repository.save(note.toBuilder().targetIds(ids).build());
    }

    private void noteDetach(EditorCommand command) {
        repository.findById(command.id(), NoteEntity.class).ifPresent(n -> repository.save(n.toBuilder()
                .targetIds(n.targetIds().stream().filter(t -> !t.equals(command.targetId())).toList())
                .edgeRefs(n.edgeRefs().stream().filter(t -> !t.equals(command.targetId())).toList())
                .build()));
    }

    private void removeActor(EditorCommand command) {
        var usedInProcesses = repository.findAllOfType(ProcessEntity.class).stream()
                .flatMap(pr -> pr.steps().stream())
                .anyMatch(st -> command.id().equals(st.roleId()) || command.id().equals(st.escalationRoleId()));
        if (usedInProcesses) {
            throw new IllegalArgumentException(
                    "El actor " + command.id() + " participa en procesos; desasígnalo primero");
        }
        var allowedInUseCases = repository.findAllOfType(UseCaseEntity.class).stream()
                .anyMatch(uc -> uc.allowedRoles() != null && uc.allowedRoles().contains(command.id()));
        if (allowedInUseCases) {
            throw new IllegalArgumentException(
                    "El actor " + command.id() + " está permitido en casos de uso; desasígnalo primero");
        }
        repository.deleteAllById(List.of(command.id()), RoleEntity.class);
    }

    // ---- UI map commands (apps, pages, menus, buttons, actor→app) ----------


    // ---- layout (diagram geometry, stored in the model store as diagrams) --

    /**
     * The editor speaks its own JSON layout shape (view key → {nodes, edges, sizes, detail});
     * here it is translated to/from {@link DiagramEntity} rows so the geometry lives in the
     * schema-validated store next to the elements it references. Models saved before this
     * existed kept the layout in a modux-editor-layout.json file next to the store; reads fall
     * back to it until the first save migrates the layout into the store.
     */
    @GetMapping(value = "/layout", produces = MediaType.APPLICATION_JSON_VALUE)
    public String layout() throws IOException {
        var diagrams = repository.findAllOfType(DiagramEntity.class);
        if (diagrams.isEmpty()) {
            var file = legacyLayoutFile();
            return Files.exists(file) ? Files.readString(file) : "{}";
        }
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var root = mapper.createObjectNode();
        for (var diagram : diagrams) {
            var view = root.putObject(diagram.id());
            if (diagram.detail() != null) view.put("detail", diagram.detail());
            if (!diagram.collapsed().isEmpty()) {
                var folded = view.putArray("collapsed");
                diagram.collapsed().forEach(folded::add);
            }
            if (!diagram.expanded().isEmpty()) {
                var open = view.putArray("expanded");
                diagram.expanded().forEach(open::add);
            }
            if (Boolean.TRUE.equals(diagram.flat())) view.put("flat", true);
            var nodes = view.putObject("nodes");
            var sizes = view.putObject("sizes");
            for (var node : diagram.nodes()) {
                var pos = nodes.putObject(node.ref());
                pos.put("x", node.x());
                pos.put("y", node.y());
                if (node.w() != null && node.h() != null) {
                    var size = sizes.putObject(node.ref());
                    size.put("w", node.w());
                    size.put("h", node.h());
                }
            }
            var edges = view.putObject("edges");
            for (var edge : diagram.edges()) {
                var points = edges.putArray(edge.ref());
                for (var point : edge.points()) {
                    var p = points.addObject();
                    p.put("x", point.x());
                    p.put("y", point.y());
                }
            }
        }
        return mapper.writeValueAsString(root);
    }

    /** POST is accepted too: the editor flushes pending edits on page-hide via sendBeacon. */
    @RequestMapping(value = "/layout",
            method = {org.springframework.web.bind.annotation.RequestMethod.PUT,
                      org.springframework.web.bind.annotation.RequestMethod.POST},
            consumes = MediaType.APPLICATION_JSON_VALUE)
    public void saveLayout(@RequestBody String layout) throws IOException {
        var root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(layout);
        var kept = new ArrayList<String>();
        root.properties().forEach(entry -> {
            var diagram = toDiagram(entry.getKey(), entry.getValue());
            if (diagram.nodes().isEmpty() && diagram.edges().isEmpty()
                    && diagram.detail() == null && diagram.collapsed().isEmpty()
                    && diagram.expanded().isEmpty()) return;
            repository.save(diagram);
            kept.add(diagram.id());
        });
        var gone = repository.findAllOfType(DiagramEntity.class).stream()
                .map(DiagramEntity::id).filter(id -> !kept.contains(id)).toList();
        if (!gone.isEmpty()) repository.deleteAllById(gone, DiagramEntity.class);
    }

    /** One editor view layout ({nodes, edges, sizes, detail} — or a legacy flat node map) → entity. */
    private DiagramEntity toDiagram(String id, com.fasterxml.jackson.databind.JsonNode view) {
        var v2 = view.get("nodes") != null && view.get("nodes").isObject();
        var nodeMap = v2 ? view.get("nodes") : view; // legacy persisted layouts are a flat node map
        var sizeMap = v2 && view.get("sizes") != null && view.get("sizes").isObject()
                ? view.get("sizes") : null;
        var nodes = new ArrayList<DiagramNodeEntity>();
        nodeMap.properties().forEach(entry -> {
            var pos = entry.getValue();
            if (!pos.isObject() || !pos.has("x") || !pos.has("y")) return;
            var size = sizeMap != null ? sizeMap.get(entry.getKey()) : null;
            nodes.add(new DiagramNodeEntity(entry.getKey(),
                    round1(pos.get("x").asDouble()), round1(pos.get("y").asDouble()),
                    size != null && size.has("w") ? round1(size.get("w").asDouble()) : null,
                    size != null && size.has("h") ? round1(size.get("h").asDouble()) : null));
        });
        var edges = new ArrayList<DiagramEdgeEntity>();
        if (v2 && view.get("edges") != null && view.get("edges").isObject()) {
            view.get("edges").properties().forEach(entry -> {
                if (!entry.getValue().isArray()) return;
                var points = new ArrayList<DiagramPointEntity>();
                entry.getValue().forEach(p -> {
                    if (p.has("x") && p.has("y")) {
                        points.add(new DiagramPointEntity(round1(p.get("x").asDouble()), round1(p.get("y").asDouble())));
                    }
                });
                if (!points.isEmpty()) edges.add(new DiagramEdgeEntity(entry.getKey(), points));
            });
        }
        var detail = view.get("detail") != null && view.get("detail").isTextual()
                ? view.get("detail").asText() : null;
        var collapsed = new ArrayList<String>();
        if (v2 && view.get("collapsed") != null && view.get("collapsed").isArray()) {
            view.get("collapsed").forEach(c -> {
                if (c.isTextual()) collapsed.add(c.asText());
            });
        }
        var expanded = new ArrayList<String>();
        if (v2 && view.get("expanded") != null && view.get("expanded").isArray()) {
            view.get("expanded").forEach(c -> {
                if (c.isTextual()) expanded.add(c.asText());
            });
        }
        var flat = v2 && view.get("flat") != null && view.get("flat").asBoolean(false)
                ? Boolean.TRUE : null;
        return new DiagramEntity(id, detail, nodes, edges, collapsed, expanded, flat, null);
    }

    /** Emissions declared by an emitter's operations (CSV of event names in emits). */
    static void collectEmissions(String emitterId, List<OperationEntity> operations,
                                         Map<String, String> eventIdByName, List<EmissionDto> out) {
        for (var op : operations) {
            if (op.emits() == null || op.emits().isBlank()) continue;
            for (var eventName : op.emits().split(",")) {
                var eventId = eventIdByName.get(eventName.trim().toLowerCase());
                if (eventId != null) out.add(new EmissionDto(emitterId, eventId));
            }
        }
    }

    /** Coordinates are kept to one decimal — plenty for pixels, and keeps the YAML readable. */
    static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private Path legacyLayoutFile() {
        var store = repository.storePath();
        var dir = Files.isDirectory(store) ? store : store.getParent();
        return dir.resolve("modux-editor-layout.json");
    }
}
