/**
 * JSON projection of the modux meta-model consumed by the editor.
 * The host (Mateu page or standalone demo) builds this from the model store
 * and applies the ModuxCommand mutations the editor emits.
 */

export type SubdomainType = 'CORE' | 'SUPPORTING' | 'GENERIC';

export type ContextMapRelationType =
  | 'PARTNERSHIP'
  | 'SHARED_KERNEL'
  | 'CUSTOMER_SUPPLIER'
  | 'CONFORMIST'
  | 'OPEN_HOST_SERVICE'
  | 'ANTI_CORRUPTION_LAYER'
  | 'PUBLISHED_LANGUAGE'
  | 'SEPARATE_WAYS';

export type FlowArchetype = 'MATERIALIZES' | 'TRIGGERS' | 'ORCHESTRATES' | 'NOTIFIES';

export interface UseCaseRef {
  id: string;
  name: string;
  /** A policy: use-case-shaped reaction logic, not a business use case. */
  policy?: boolean;
  /** Born as a machine-made stub (actor/page derivation), not declared by hand. */
  derived?: boolean;
  /** Ids of the use case's steps (typed step editing stays in its form). */
  stepIds?: string[];
  /**
   * The pipeline steps. They carry their TARGETS as well as their shape: a step is where an
   * arrow starts — «this use case calls that aggregate» is a step, not a field of either end —
   * so without them the canvas has nothing to draw the edge from.
   */
  steps?: {
    id: string;
    name?: string;
    type?: string;
    customCodeId?: string;
    aggregateId?: string;
    operationId?: string;
    useCaseId?: string;
    queryServiceId?: string;
    queryOperationId?: string;
    domainEventId?: string;
    applicationEventId?: string;
    externalUseCaseId?: string;
    modelMappingId?: string;
    /** Custom step: what it has to do (the spec of its hook). */
    intent?: string;
  }[];
  /** The request/command model this use case receives. */
  inputModelId?: string;
  /** The result model it returns. */
  outputModelId?: string;
  /** Answers over REST (POST /v1/{name}). */
  exposedAsRest?: boolean;
}

export interface DomainEventRef {
  id: string;
  name: string;
  /** Born as a machine-made stub (a CRUD lifecycle event). */
  derived?: boolean;
}

export interface ApplicationEventRef {
  id: string;
  name: string;
}

export interface DomainServiceRef {
  id: string;
  name: string;
}

export interface ReadModelRef {
  id: string;
  name: string;
  /** The aggregate this read model is a view of (optional). */
  aggregateId?: string;
}

/** Who publishes a domain event: an aggregate (operation emits) or a use case (publish step). */
export interface EmissionRef {
  sourceId: string;
  domainEventId: string;
}

/** Use case A invokes use case B (a CallUseCase step in A). */
export interface UseCaseCallRef {
  sourceId: string;
  targetId: string;
}

export interface QueryServiceRef {
  id: string;
  name: string;
  /** Born as a machine-made stub (a listing's derived query service). */
  derived?: boolean;
  operations?: { id: string; name: string }[];
}

/** Use case A consumes query service B (a CallQueryService step in A). */
export interface QueryCallRef {
  sourceId: string;
  targetId: string;
}

/** An actor uses a use case or query service directly (a UI is derived from it). */
export interface ActorUseRef {
  actorId: string;
  targetId: string;
}

export interface ActorExternalDependencyRef {
  actorId: string;
  externalSystemId: string;
}

export interface ExternalSystemDependencyRef {
  sourceId: string;
  targetId: string;
  /** DEPENDS (plain, default) or CQRS — only between external systems. */
  type?: string;
}

/** An API proxy/cache: fronts a published API, consumable exactly like it. */
export interface ProxyApiRef {
  id: string;
  name: string;
  targetApiId?: string;
  publishedByExternalSystemId?: string;
}

/**
 * The SAME published API, (also) implemented inside one of our bounded contexts — a
 * strangler migration: N implementation sites coexist and every proxy fronting the API
 * routes to all of them (routing logic / per-operation wiring comes later). References
 * the ApiRef by id: never a copy — renaming or editing operations touches the one API.
 */
export interface ApiImplementationRef {
  apiId: string;
  boundedContextId: string;
}

/**
 * One proxy OPERATION routed to an implementation SITE of the API the proxy fronts:
 * a bounded context implementing it, or the API itself as published by its external
 * system. The per-operation strangler wiring — some operations go to the new context,
 * the rest to the origin.
 */
export interface ProxyOperationRouteRef {
  proxyId: string;
  operationId: string;
  /** boundedContextId of the implementing context, or the apiId for "as published". */
  targetSiteId: string;
}

/**
 * An external system calls ONE operation of an API at a given SITE: the API as
 * published (siteId = apiId), a proxy fronting it, or a bounded context implementing it.
 */
export interface ExternalOperationUseRef {
  externalSystemId: string;
  operationId: string;
  siteId: string;
}

/**
 * The use case serving ONE operation AT one site — a bounded context implementing the
 * API, or a proxy fronting it (boundedContextId holds either id). Per-site: during a strangler
 * migration the same operation may be served differently at each site, and the use case
 * may live in ANOTHER context.
 */
export interface ApiOperationImplementationRef {
  apiId: string;
  operationId: string;
  /** The site: a bounded-context id or a proxy id. */
  boundedContextId: string;
  useCaseId: string;
}

/** A cron task owned by a bounded context; its target is the use case it fires. */
export interface ScheduledTriggerRef {
  id: string;
  name: string;
  cronExpression?: string;
  useCaseId?: string;
}

export interface BoundedContextRef {
  id: string;
  name: string;
  subdomainType?: SubdomainType;
  serviceId?: string;
  /** Use cases owned by this bounded context (populated for the detailed context map). */
  useCases?: UseCaseRef[];
  /** Domain events owned by this bounded context (populated for the detailed context map). */
  domainEvents?: DomainEventRef[];
  /** Read models owned by this bounded context (populated for the detailed context map). */
  readModels?: ReadModelRef[];
  /** Domain services owned by this bounded context (they emit domain events, like aggregates). */
  domainServices?: DomainServiceRef[];
  /** Application events owned by this bounded context (published by its use cases). */
  applicationEvents?: ApplicationEventRef[];
  /** Integration events this context publishes ACROSS boundaries (for other systems to consume). */
  integrationEvents?: ApplicationEventRef[];
  /** Query services owned by this bounded context. */
  queryServices?: QueryServiceRef[];
  /** Cron tasks owned by this bounded context. */
  scheduledTriggers?: ScheduledTriggerRef[];
  /** The IdP whose tokens this bounded context validates. */
  identityProviderId?: string;
  /** UI apps owned by this bounded context (the apps themselves live in model.uiApps). */
  uiAppIds?: string[];
  /** The system that GROUPS this bounded context (C4: System Landscape → System → Container). */
  parentSystemId?: string;
}

export interface ActorRef {
  id: string;
  name: string;
}

export interface AiAgentRef {
  id: string;
  name: string;
  /** Someone else's agent: it enters through MCP gateways, never touching internals. */
  external?: boolean;
}

/** Our MCP gateway: aggregates MCPs and exposes APIs/operations/use cases/RAGs as MCP. */
export interface McpGatewayRef {
  id: string;
  name: string;
  mcpServerIds?: string[];
  apiIds?: string[];
  apiOperationIds?: string[];
  useCaseIds?: string[];
  ragIds?: string[];
}

/** An AI agent consumes an MCP gateway (one curated tool surface). */
export interface AgentGatewayUseRef {
  agentId: string;
  gatewayId: string;
}

/** An AI agent calls an API operation as a tool. */
export interface AgentApiOpUseRef {
  agentId: string;
  apiOperationId: string;
}

/** An agent may call a whole API — or an API proxy — as a tool. */
export interface AgentApiUseRef {
  agentId: string;
  apiId: string;
}

/** An AI agent consults a query service as a read tool. */
export interface AgentQueryUseRef {
  agentId: string;
  queryServiceId: string;
}

/** An AI agent delegates work to another agent. */
export interface AgentDelegationRef {
  agentId: string;
  delegateAgentId: string;
}

/** An actor talks to an AI agent (a chat/supervision UI derives from it). */
export interface ActorAgentUseRef {
  actorId: string;
  agentId: string;
}

/** A domain/application event triggers a run of the agent (reactive agents). */
export interface AgentTriggerRef {
  eventId: string;
  agentId: string;
}

/** An AI agent consumes a use case through MCP. */
export interface AgentUseRef {
  agentId: string;
  useCaseId: string;
}

/** An AI agent calls an operation offered by an external system. */
export interface AgentExternalUseRef {
  agentId: string;
  externalUseCaseId: string;
}

/** An AI agent consumes an MCP server published by an external system. */
export interface AgentMcpUseRef {
  agentId: string;
  mcpServerId: string;
}

export interface RagContentSourceRef {
  /** REPO, WEB or FTP. */
  type: string;
  uri: string;
}

/** A RAG knowledge base, optionally fed from read models and external content. */
export interface RagRef {
  id: string;
  name: string;
  description?: string;
  sourceReadModelIds?: string[];
  contentSources?: RagContentSourceRef[];
  /** Tables of external systems it indexes (structured legacy content). */
  sourceExternalTableIds?: string[];
  /** APIs (or proxies) whose content it indexes by calling them. */
  sourceApiIds?: string[];
  /** Whole external systems it indexes (coarse). */
  sourceExternalSystemIds?: string[];
  /** Whole bounded contexts it indexes (coarse). */
  sourceBoundedContextIds?: string[];
}

/** An AI agent grounds its answers on a knowledge base. */
export interface AgentRagRef {
  agentId: string;
  ragId: string;
}

export interface ApiOperationRef {
  id: string;
  name: string;
  httpMethod?: string;
  path?: string;
  /** Coarse wiring: the bounded context that implements it. */
  targetBoundedContextId?: string;
  /** Fine wiring: the use case (or policy) that implements it. */
  targetUseCaseId?: string;
  /** Fine wiring for a READ operation: the query service whose operation implements it. */
  targetQueryServiceId?: string;
  /** Fine wiring for a READ operation: the query operation implementing it. */
  targetQueryOperationId?: string;
}

/** A published API as a first-class element on the map. */
export interface ApiRef {
  id: string;
  name: string;
  operations: ApiOperationRef[];
  /** External system publishing this API (nests inside it on the map). */
  publishedByExternalSystemId?: string;
}

export interface ExternalUseCaseRef {
  id: string;
  name: string;
}

export interface ExternalTableRef {
  id: string;
  name: string;
}

/** An MCP server published by an external system — a tool surface for AI agents. */
export interface McpServerRef {
  id: string;
  name: string;
  uri?: string;
}

/**
 * Where another modux project lives, when an external system stands for one.
 *
 * Versioned with the model, not looked up in a registry on one machine: `gitUrl` is the identity
 * everyone shares, `path` an override for a checkout that is not beside this one. Both may be
 * absent on a model migrated from before that change, and the reference is still a reference —
 * its snapshot is intact, it just cannot be refreshed. See `docs/design/ide-plugin.md` §4.7.
 */
export interface ReferencedProject {
  gitUrl?: string;
  branch?: string;
  path?: string;
}

export interface ExternalSystemRef {
  id: string;
  name: string;
  /** Use cases this external system offers (targets of calls from our use cases). */
  useCases?: ExternalUseCaseRef[];
  /** Tables/datasets it owns — pollable into read models (legacy integration). */
  tables?: ExternalTableRef[];
  /** MCP servers it publishes — consumable by AI agents. */
  mcpServers?: McpServerRef[];
  /** Set when the system IS another modux project: where that project lives. */
  referencedProject?: ReferencedProject;
  /** The external system this one lives inside (subsystem). */
  parentExternalSystemId?: string;
}

/**
 * A system: OUR own grouping of bounded contexts (C4: System Landscape → System → Container).
 * It has no behaviour of its own — it is the boundary that says "these contexts are one system".
 */
export interface SystemRef {
  id: string;
  name: string;
  /** The system this one lives inside (nested systems). Optional; usually top-level. */
  parentSystemId?: string;
}

/**
 * A CDC (Change Data Capture) connector: streams changes from a source (a table, a system) to a
 * target (a read model, a system, a context). A first-class integration node; its ends are drawn
 * as relations from/to it.
 */
export interface CdcRef {
  id: string;
  name: string;
}

/** An external system calls one of our use cases in (INBOUND ACL). */
export interface ExternalCallRef {
  externalSystemId: string;
  useCaseId: string;
}

/** One of our use cases calls a use case offered by an external system. */
export interface ExternalUseCaseCallRef {
  sourceId: string;
  targetId: string;
}

export interface ContextMapRelation {
  /** Upstream side (U/D convention: source is upstream). */
  sourceId: string;
  targetId: string;
  /** The annotated DDD pattern; null while the derived relation is unannotated. */
  type: ContextMapRelationType | null;
  /** The pattern READ OFF the dependencies (partnership, shared kernel, events…). */
  inferredType?: ContextMapRelationType | null;
  /** Whether the pair carries a type annotation (contextMap entry). */
  declared?: boolean;
  /** The concrete dependencies this relation derives from (tooltip). */
  reasons?: string;
}

export interface FlowRef {
  id: string;
  name: string;
  sourceId: string;
  targetId: string;
  archetype: FlowArchetype;
  triggerAggregateId?: string;
  triggerEvent?: string;
  targetUseCaseId?: string;
  readModelName?: string;
}

export interface ProcessStepRef {
  id: string;
  name: string;
  type: 'AUTOMATED' | 'HUMAN';
  useCaseId?: string;
  roleId?: string;
  deadline?: string;
  compensationUseCaseId?: string;
}

export interface ProcessRef {
  id: string;
  name: string;
  triggerAggregateId?: string;
  triggerEvent?: string;
  ownerBoundedContextId?: string;
  onCompletionEventName?: string;
  sla?: string;
  steps: ProcessStepRef[];
}

/** A field (attribute) of an aggregate, entity or Record value object. */
export interface FieldRef {
  id: string;
  name: string;
  required: boolean;
  /** primitive | enum | model | value-object */
  typeKind: string;
  /** a primitive type name, or the referenced element's id. */
  typeRef: string;
  /** Multiplicity: true = a collection (List/Set) of the type. */
  collection?: boolean;
  /** The Model this field lives in (its fields are ModelFields) — for field commands. */
  modelId?: string;
}

/** An invariant (a rule) with its primary condition — expression and error message. */
export interface InvariantRef {
  id: string;
  name: string;
  expression?: string;
  errorMessage?: string;
}

/** An operation of an aggregate — a name and the models it takes in and returns. */
export interface OperationRef {
  id: string;
  name: string;
  inputModelId?: string;
  outputModelId?: string;
  /** Custom operation: what it does (the spec of its hook). */
  intent?: string;
}

export interface AggregateRef {
  id: string;
  name: string;
  boundedContextId: string;
  /** The Model that holds its fields. */
  modelId?: string;
  /** The rules the aggregate protects — its very reason to exist. */
  invariants?: InvariantRef[];
  /** Its attributes: name, required, and a type reference. */
  fields?: FieldRef[];
  /** Its operations — each with an input and an output model. */
  operations?: OperationRef[];
}

export interface EntityRef {
  id: string;
  name: string;
  /** Aggregate this entity belongs to (entities-within-aggregates). */
  aggregateId: string;
  /** The Model that holds its fields. */
  modelId?: string;
  /** The rules this entity protects. */
  invariants?: InvariantRef[];
  /** Its attributes. */
  fields?: FieldRef[];
}

/** A value object owned by an aggregate — its own shape, richer than a plain model. */
export interface ValueObjectRef {
  id: string;
  name: string;
  /** Aggregate that owns it (via the aggregate's valueObjectIds). */
  aggregateId: string;
  /** Enum | Record | Wrapper. */
  type?: string;
  /** For Wrapper VOs, the wrapped primitive. */
  dataType?: string;
  /** For Record VOs, the composed fields. */
  fields?: { name: string; dataType?: string; stereotype?: string }[];
  /** For Enum VOs, the allowed values. */
  enumValues?: string[];
  /** The rules this value object protects. */
  invariants?: InvariantRef[];
}

/** Cross-aggregate reference derived server-side from model fields. */
export interface AggregateReference {
  sourceAggregateId: string;
  targetAggregateId: string;
  label?: string;
}

export interface ViewRef {
  id: string;
  name: string;
  kind: 'CURATED' | 'COMPUTED' | string;
  memberIds: string[];
}

/** A use case acts on an aggregate (CallAggregateOperation / SaveAggregate step). */
export interface AggregateCallRef {
  sourceId: string;
  targetId: string;
}

export interface SubscriptionActionRef {
  type: 'CallUseCase' | 'StartSaga' | 'UpdateProjection' | 'Custom' | string;
  useCaseId?: string;
  sagaId?: string;
  projectionId?: string;
}

/** Event listener: reacts to a domain/integration event by name. */
export interface SubscriptionRef {
  id: string;
  name: string;
  eventName?: string;
  consumerGroup?: string;
  actions?: SubscriptionActionRef[];
}

/** Projects domain events — or an aggregate's whole state — into a read model. */
export interface ProjectionRef {
  id: string;
  name: string;
  readModelId?: string;
  readModelName?: string;
  handledEventIds: string[];
  /** Alternative source: the aggregate whose state this projection materializes. */
  sourceAggregateId?: string;
  /** Bounded context that owns the projection (and its read model). */
  boundedContextId?: string;
  /** Alternative source: an external system's operation, polled. */
  sourceExternalUseCaseId?: string;
  /** Alternative source: a legacy/external system's table, polled. */
  sourceExternalTableId?: string;
}

export interface WorkflowStepRef {
  id: string;
  name: string;
  /**
   * The kind of step, in EventConductor's own vocabulary — ACTION, USER_TASK, JOIN, FORK, END…
   * — because EventConductor is what runs it. modux used to say TASK/SPLIT here; see
   * `docs/design/ide-plugin.md` §8.1.3.
   */
  type?: string;
  /** The step's single outgoing link when it is ANOTHER workflow (hand-off). */
  handoffWorkflowId?: string;
  /** HUMAN step: the role whose worklist gets the task (a step with role is human). */
  roleId?: string;
  /** HUMAN step: ISO-8601 duration bound (e.g. PT48H). */
  deadline?: string;
  /** Use case run to UNDO this step when the workflow compensates. */
  compensationUseCaseId?: string;
  /** HUMAN step: the declared PAGE the forms engine renders as the task's form. */
  formPageId?: string;
  emittedEventName?: string;
  targetUseCaseId?: string;
  completionEventName?: string;
  dependsOnStepIds?: string[];
}

/** A cross-context orchestrator living OUTSIDE the bounded contexts (no owner boundedContext). */
export interface WorkflowRef {
  id: string;
  name: string;
  triggerAggregateId?: string;
  triggerDomainServiceId?: string;
  triggerUseCaseId?: string;
  triggerEvent?: string;
  onCompletionEventName?: string;
  steps: WorkflowStepRef[];
}

export interface UiMenuEntryRef {
  label: string;
  icon?: string;
  pageId?: string;
  children?: UiMenuEntryRef[];
  /** Stable identity (labels repeat and rename); absent on pre-id stores. */
  id?: string;
  /** The app this entry opens — an app is just another UI component, like a page. */
  uiAdapterId?: string;
  /** The use case this entry fires. An entry opens/fires exactly ONE thing. */
  useCaseId?: string;
  /** The aggregate this entry opens — a CRUD is inferred over it. */
  aggregateId?: string;
  /** The query service operation this entry opens — a filtered listing is inferred. */
  queryServiceId?: string;
  queryOperationId?: string;
}

export interface UiAppRef {
  id: string;
  name: string;
  title?: string;
  menuItems?: UiMenuEntryRef[];
  /** APP (regular), ORCHESTRATOR (state + child pages, no own UI) or MASTER_DETAIL. */
  type?: string;
  /** MASTER_DETAIL: the page rendered as the header; the tabs are its menu pages. */
  headerPageId?: string;
  /** The page the app opens first (exclusive with homeAppId). */
  homePageId?: string;
  /** The APP it opens first — an app is just another UI component. */
  homeAppId?: string;
  /** The app's viewmodel: the state an orchestrator keeps, shared with its pages. */
  modelId?: string;
  /** VIEW_EDITOR: the read-only detail view. */
  viewPageId?: string;
  /** VIEW_EDITOR: the edit view. */
  editPageId?: string;
  /** The IdP this app authenticates its users against. */
  identityProviderId?: string;
}

export interface UiPageButtonRef {
  label: string;
  useCaseId?: string;
  mappingId?: string;
  /** Where it lives: 'toolbar' (top) or 'bottom'. */
  bar?: string;
}

export interface UiFieldRef {
  fieldId: string;
  name: string;
  type?: string;
  stereotype?: string;
  colspan?: number;
  label?: string;
  help?: string;
}

export interface UiComponentNodeRef {
  id: string;
  kind: string;
  title?: string;
  text?: string;
  label?: string;
  useCaseId?: string;
  mappingId?: string;
  modelId?: string;
  queryServiceId?: string;
  queryOperationId?: string;
  fieldId?: string;
  stereotype?: string;
  colspan?: number;
  children?: UiComponentNodeRef[];
  /** The hand-written code this component delegates to (the component is CUSTOM). */
  customCodeId?: string;
  /** The page a crud/listing row opens when clicked (its ficha). */
  detailPageId?: string;
}

/**
 * A page MOCKUP: the visual layout, kept SEPARATE from the page it stands for and tied to it by an
 * edge (§ Etapa 2). A first-class element on the canvas — dragged from the palette, linked to its
 * page — so the visual and the semantic page evolve apart. Its component tree lands here later; for
 * now it is the node and the link.
 */
export interface MockupRef {
  id: string;
  name: string;
  /** The page this mockup stands for, or none yet (linked by the `mockup-of` edge). */
  pageId?: string;
  /** UI-first composition: Mateu layouts with components inside (reuses the page tree shape). */
  content?: UiComponentNodeRef[];
}

export interface UiPageRef {
  id: string;
  name: string;
  type?: string;
  route?: string;
  modelId?: string;
  modelName?: string;
  aggregateId?: string;
  listingQueryServiceId?: string;
  buttons?: UiPageButtonRef[];
  /** The viewmodel Model's fields merged with the page's fieldConfigs (designer order). */
  viewmodelFields?: UiFieldRef[];
  /** UI-first composition: Mateu layouts with components inside. Empty = fully inferred. */
  content?: UiComponentNodeRef[];
  /** WIZARD: its steps in order — each maps to the page implementing it (or none yet). */
  wizardSteps?: { pageId?: string; label?: string; id?: string }[];
  /** CRUD: what opens a row — a page or an app of any archetype. */
  crudDetailPageId?: string;
  crudDetailAppId?: string;
  /** CRUD: the new-record form — a page or an app. */
  crudCreatePageId?: string;
  crudCreateAppId?: string;
  /** The hand-written code the page delegates to (the page is CUSTOM). */
  customCodeId?: string;
  /** Button groups hooked to the page's bars. */
  toolbarGroupIds?: string[];
  bottomBarGroupIds?: string[];
}

export interface ActorAppUseRef {
  actorId: string;
  appId: string;
}

/** One ETL step: a source (pull/consumer), a transform, or a write (api/db/event). */
export interface EtlStepRef {
  id: string;
  name?: string;
  type: string;
  externalTableId?: string;
  apiId?: string;
  operationId?: string;
  eventId?: string;
  mappingId?: string;
}

/** An integrator: an ETL flow outside the contexts, moving data between systems. */
export interface EtlFlowRef {
  id: string;
  name: string;
  /** The bounded context that owns (generates, operates) the pipeline. */
  ownerBoundedContextId?: string;
  steps?: EtlStepRef[];
  /** The service identity the pipeline runs as. */
  identityProviderId?: string;
}

/** An identity provider: who issues the identities the system trusts. */
export interface IdentityProviderRef {
  id: string;
  name: string;
  /** CORPORATE, B2C, SOCIAL or PARTNER. */
  type?: string;
  issuer?: string;
  /** Federation: the external system publishing this IdP; null = ours. */
  publishedByExternalSystemId?: string;
}

/** When an event happens, tell these roles through these channels. */
export interface NotificationRef {
  id: string;
  name: string;
  ownerBoundedContextId?: string;
  eventId?: string;
  channels?: string[];
  recipientRoleIds?: string[];
}

/** A generated document (template + model) or report (query-fed dataset). */
export interface DocumentRef {
  id: string;
  name: string;
  ownerBoundedContextId?: string;
  kind?: string;
  modelId?: string;
  queryServiceId?: string;
  queryOperationId?: string;
}

/** A module: distribution unit inside a bounded context; services deploy them. */
export interface ModuleRef {
  id: string;
  name: string;
  /** The bounded context whose elements this module distributes. */
  boundedContextId: string;
  elementIds?: string[];
  /** The context's default module: it holds every undistributed element. */
  main?: boolean;
}

/**
 * An area: a named rectangle that visually groups elements and anchors notes not tied
 * to any concrete element. Membership is geometric — whatever sits inside the rectangle
 * belongs to it — so the ref carries no member ids; geometry lives in each view's layout.
 */
export interface AreaRef {
  id: string;
  name: string;
}

export interface NoteRef {
  id: string;
  text: string;
  /** The elements this note annotates. */
  targetIds?: string[];
  /** The diagram relations this note annotates, as view edge ids (e.g. "dep:a->b"). */
  edgeRefs?: string[];
}

export interface ServiceRef {
  id: string;
  name: string;
  moduleIds?: string[];
  /** The port it listens on (8080 when unset). */
  port?: number;
  /** Infrastructure it leans on (drawn at the distribution level). */
  database?: string;
  outboxEnabled?: boolean;
  /** The URLs this service answers at (one or more). */
  urlIds?: string[];
}

/** A URL: an address the system answers at, served by services. */
export interface UrlRef {
  id: string;
  name: string;
  url?: string;
}


export interface ModuxModel {
  /** UI apps (UiAdapter) with their menu tree — the UI view's containers. */
  uiApps?: UiAppRef[];
  /** Pages (Mateu views) with their MVVM wiring. */
  pages?: UiPageRef[];
  /** Page mockups: the visual, kept apart from the page and linked to it by an edge. */
  mockups?: MockupRef[];
  /** Free-standing use cases: created loose (no context yet), shown top-level until composed. */
  looseUseCases?: UseCaseRef[];
  /** Free-standing nested elements (operation/invariant/field/use-case-step) awaiting a parent. */
  looseElements?: { id: string; name: string; elementType: string }[];
  /**
   * Context-scoped elements (events, read models, query services, domain services…) that no
   * bounded context owns. They only nest under a context, so without this they would vanish from
   * the projection — and a view could never show them. `type` is the store bucket.
   */
  unownedElements?: { id: string; name: string; type: string }[];
  /** Actor → app links (Role.uiAdapterIds). */
  actorAppUses?: ActorAppUseRef[];
  /** Data models with their fields — the mappings view edits them in place. */
  models?: { id: string; name: string; fields?: { id: string; name: string; type?: string }[] }[];
  modelMappings?: {
    id: string;
    name: string;
    sourceModelId?: string;
    targetModelId?: string;
    /** Field-to-field rules, drawn as thin edges between the two fields. */
    rules?: { id: string; sourceFieldId?: string; targetFieldId?: string }[];
    /** The hand-written code this mapping delegates to. */
    customCodeId?: string;
  }[];
  /** Hand-written code, first-class: mappings, transformations, steps, pages and components point at it. */
  customCodes?: { id: string; name: string; usedElementIds?: string[] }[];
  /** LOOSE gateways: their workflow is inferred from their links (JOIN n→1, SPLIT 1→n). */
  workflowGateways?: {
    id: string;
    name: string;
    type?: string;
    /** JOIN: ALL (default) | ANY · SPLIT: PARALLEL (default) | EXCLUSIVE. */
    semantics?: string;
    sourceIds?: string[];
    targetIds?: string[];
    /** EXCLUSIVE split: the condition guarding each outgoing branch. */
    branchConditions?: { targetId: string; expression?: string }[];
  }[];
  /** Reusable button groups: pages hook them to a bar; groups nest groups. */
  buttonGroups?: {
    id: string;
    name: string;
    buttons?: { id: string; label?: string; useCaseId?: string; apiId?: string; apiOperationId?: string; mappingId?: string }[];
    groupIds?: string[];
  }[];
  /** Transformations: models/fields in, a model or field out — wired on the mappings map. */
  transformations?: {
    id: string;
    name: string;
    inputs?: { modelId: string; fieldId?: string | null }[];
    output?: { modelId: string; fieldId?: string | null } | null;
    /** The hand-written code that implements it. */
    customCodeId?: string;
  }[];
  /** Legacy sagas awaiting their fusion into workflows (the migrate button counts them). */
  sagas?: { id: string; name: string }[];
  /** Enumerations: data types, like models. */
  enums?: { id: string; name: string }[];
  /** Outbound gateways to external systems (resilience, auth). */
  gateways?: { id: string; name: string }[];
  /** Code boundedContexts: how each bounded context DISTRIBUTES its elements into buildable units. */
  modules?: ModuleRef[];
  /** Deployables: a service says where code boundedContexts are DEPLOYED. */
  services?: ServiceRef[];
  boundedContexts: BoundedContextRef[];
  externalSystems: ExternalSystemRef[];
  /** Systems: our own grouping of bounded contexts (C4 landscape → system → containers). */
  systems?: SystemRef[];
  /** CDC connectors: stream changes from a source to a target (data integration). */
  cdcs?: CdcRef[];
  /** Sticky notes: free commentary pointing at elements (targetIds) and/or relations (edgeRefs). */
  notes?: NoteRef[];
  /** Areas: named rectangles that group elements geometrically and anchor notes. */
  areas?: AreaRef[];
  /** URLs on the distribution map — services declare which ones they answer at. */
  urls?: UrlRef[];
  relations: ContextMapRelation[];
  /** Declared human interfaces (the UI twin of an API), realized by apps and pages. */
  uis?: {
    id: string;
    name: string;
    boundedContextId?: string;
    appIds?: string[];
    pageIds?: string[];
    actorIds?: string[];
  }[];
  /** Hand-drawn ArchiMate relationships between any two elements (documentation intent). */
  archimateRelations?: {
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
    label?: string;
    /**
     * Escape hatch over the structural rule (see `relationNature`): force this relation to be a
     * `fact` (real, generates) or `intent` (sketch, no code). Absent ⇒ the endpoints decide.
     */
    nature?: 'intent' | 'fact';
  }[];
  flows: FlowRef[];
  aggregates?: AggregateRef[];
  entities?: EntityRef[];
  valueObjects?: ValueObjectRef[];
  aggregateReferences?: AggregateReference[];
  processes?: ProcessRef[];
  views?: ViewRef[];
  emissions?: EmissionRef[];
  /** Business actors (roles) shown on the context map. */
  actors?: ActorRef[];
  useCaseCalls?: UseCaseCallRef[];
  queryCalls?: QueryCallRef[];
  actorUses?: ActorUseRef[];
  /** Actor → external system dependencies (strategic context-map edges). */
  actorExternalDependencies?: ActorExternalDependencyRef[];
  /** External system → external system dependencies. */
  externalSystemDependencies?: ExternalSystemDependencyRef[];
  proxyApis?: ProxyApiRef[];
  /** APIs (also) implemented in our bounded contexts — same ApiRef, several sites. */
  apiImplementations?: ApiImplementationRef[];
  /** Per-operation routing of proxies to the API's implementation sites. */
  proxyOperationRoutes?: ProxyOperationRouteRef[];
  /** External systems calling specific API operations (at a published API, proxy or implementation). */
  externalOperationUses?: ExternalOperationUseRef[];
  /** Per-site wiring: the use case implementing an operation at a given implementation site. */
  apiOperationImplementations?: ApiOperationImplementationRef[];
  externalCalls?: ExternalCallRef[];
  externalUseCaseCalls?: ExternalUseCaseCallRef[];
  aiAgents?: AiAgentRef[];
  agentUses?: AgentUseRef[];
  agentExternalUses?: AgentExternalUseRef[];
  agentMcpUses?: AgentMcpUseRef[];
  mcpGateways?: McpGatewayRef[];
  agentGatewayUses?: AgentGatewayUseRef[];
  agentApiOpUses?: AgentApiOpUseRef[];
  agentApiUses?: AgentApiUseRef[];
  agentQueryUses?: AgentQueryUseRef[];
  agentDelegations?: AgentDelegationRef[];
  actorAgentUses?: ActorAgentUseRef[];
  agentTriggers?: AgentTriggerRef[];
  rags?: RagRef[];
  agentRags?: AgentRagRef[];
  apis?: ApiRef[];
  workflows?: WorkflowRef[];
  etlFlows?: EtlFlowRef[];
  identityProviders?: IdentityProviderRef[];
  notifications?: NotificationRef[];
  documents?: DocumentRef[];
  aggregateCalls?: AggregateCallRef[];
  /** Domain events published directly by use cases (PublishDomainEvent steps). */
  useCaseEmissions?: EmissionRef[];
  subscriptions?: SubscriptionRef[];
  projections?: ProjectionRef[];
  /** Element id → its description, surfaced as a node's hover tooltip. */
  descriptions?: Record<string, string>;
}
