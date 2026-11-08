import type { ContextMapRelationType, SubdomainType } from './model.js';

/**
 * Mutations the editor asks the host to apply to the model. The editor never
 * persists anything itself: the host applies the command to its model store
 * and feeds the updated model back through the `model` property.
 */
export type ModuxCommand =
  | {
      kind: 'add-relation';
      sourceId: string;
      targetId: string;
      type: ContextMapRelationType;
    }
  | {
      /** A hand-drawn ArchiMate relationship — the traced line's last word. */
      kind: 'add-archimate-relation';
      id: string;
      sourceId: string;
      targetId: string;
      type: string;
      name?: string;
      /** Escape hatch: force intent (sketch) or fact (real). Absent ⇒ the endpoints decide. */
      nature?: 'intent' | 'fact';
    }
  | { kind: 'set-archimate-relation-type'; id: string; type: string }
  | {
      /** Override the structural intent/fact classification (null clears the override). */
      kind: 'set-archimate-relation-nature';
      id: string;
      nature: 'intent' | 'fact' | null;
    }
  | {
      /** Swap an ArchiMate relation's ends (some — serving, association… — read either way). */
      kind: 'invert-archimate-relation';
      id: string;
    }
  | {
      /** The declared human interface — loose, or exposed by a context. */
      kind: 'add-ui';
      id: string;
      name: string;
      boundedContextId?: string;
    }
  | { kind: 'remove-ui'; id: string }
  | {
      /** ui ⇆ app or page: the ASSIGNMENT — who works this interface (targetId decides). */
      kind: 'add-ui-assignment';
      id: string;
      targetId: string;
    }
  | { kind: 'remove-ui-assignment'; id: string; targetId: string }
  | {
      /** Context ⇆ UI is COMPOSITION and nothing else (omit context to loose it). */
      kind: 'set-ui-context';
      id: string;
      boundedContextId?: string;
    }
  | {
      /** ui ⇆ actor: SERVING and nothing else — the interface serves the person. */
      kind: 'add-ui-serving';
      id: string;
      targetId: string;
    }
  | { kind: 'remove-ui-serving'; id: string; targetId: string }
  | { kind: 'remove-archimate-relation'; id: string }
  | {
      kind: 'remove-relation';
      sourceId: string;
      targetId: string;
    }
  | {
      /** Change the strategic pattern of an existing relation in place. */
      kind: 'set-relation-type';
      sourceId: string;
      targetId: string;
      type: ContextMapRelationType;
    }
  | {
      kind: 'add-boundedContext';
      id: string;
      name: string;
      subdomainType: SubdomainType;
    }
  | {
      kind: 'add-aggregate';
      id: string;
      name: string;
      /** Optional: omit to create it free-standing, then tie it with set-aggregate-context. */
      boundedContextId?: string;
    }
  | {
      /** Tie a free-standing aggregate to a context, or detach it (omit boundedContextId). */
      kind: 'set-aggregate-context';
      id: string;
      boundedContextId?: string;
    }
  | {
      /** An invariant on its owner — an aggregate, value object OR entity. */
      kind: 'add-invariant';
      ownerId: string;
      id: string;
      name: string;
    }
  | { kind: 'remove-invariant'; id: string }
  | {
      /** An invariant's primary condition: the rule expression and its error message (blank clears). */
      kind: 'set-invariant-condition';
      id: string;
      expression: string;
      errorMessage: string;
    }
  | {
      /** Point a field (a ModelField) at a type: primitive | enum | model | value-object. */
      kind: 'set-model-field-type';
      modelId: string;
      fieldId: string;
      type: string;
      targetId: string;
    }
  | { kind: 'set-model-field-required'; modelId: string; fieldId: string; required: boolean }
  | { kind: 'set-model-field-collection'; modelId: string; fieldId: string; collection: boolean }
  | {
      /** An entity WITHIN an aggregate (its parent) — richer than a plain model field. */
      kind: 'add-entity';
      id: string;
      name: string;
      /** Optional: omit to create it free-standing, then tie it with set-entity-aggregate. */
      aggregateId?: string;
    }
  | { kind: 'remove-entity'; id: string; aggregateId?: string }
  | {
      /** A value object owned by an aggregate — its own shape, invariant-ready. */
      kind: 'add-value-object';
      id: string;
      name: string;
      /** Optional: omit to create it free-standing, then tie it with set-value-object-aggregate. */
      aggregateId?: string;
      /** Enum | Record | Wrapper (defaults to Record). */
      type?: string;
    }
  | { kind: 'remove-value-object'; id: string; aggregateId?: string }
  | {
      /** An operation of an aggregate (input model → output model). */
      kind: 'add-operation';
      id: string;
      name: string;
      aggregateId: string;
    }
  | { kind: 'remove-operation'; id: string; aggregateId: string }
  | {
      /** Re-home a value object under an aggregate (a VO belongs to exactly one). */
      kind: 'set-value-object-aggregate';
      id: string;
      aggregateId: string;
    }
  | {
      /** Re-home an entity under an aggregate (changes its parentAggregateId). */
      kind: 'set-entity-aggregate';
      id: string;
      aggregateId: string;
    }
  | {
      kind: 'add-domain-event';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-boundedContext';
      id: string;
    }
  | {
      kind: 'remove-aggregate';
      id: string;
    }
  | {
      kind: 'remove-domain-event';
      id: string;
    }
  | {
      /** A system outside the bounded contexts (channel manager, ERP…). */
      kind: 'add-external-system';
      id: string;
      name: string;
      /** When set, the new system is a SUBSYSTEM living inside this one. */
      parentId?: string;
    }
  | {
      /** Nest an existing external system inside another (null parentId un-nests it). */
      kind: 'set-external-system-parent';
      id: string;
      parentId: string | null;
    }
  | {
      kind: 'remove-external-system';
      id: string;
    }
  | {
      /** A system: OUR grouping of bounded contexts (C4 landscape → system → containers). */
      kind: 'add-system';
      id: string;
      name: string;
      /** When set, the new system is a SUBSYSTEM living inside this one. */
      parentSystemId?: string;
    }
  | {
      kind: 'remove-system';
      id: string;
    }
  | {
      /** Put a bounded context inside a system (null detaches it back to top level). */
      kind: 'set-context-system';
      id: string;
      parentSystemId: string | null;
    }
  | {
      /** A CDC connector (Change Data Capture): streams changes source → target. */
      kind: 'add-cdc';
      id: string;
      name: string;
    }
  | { kind: 'remove-cdc'; id: string }
  | {
      /** Nest a system inside another system (null detaches it back to top level). */
      kind: 'set-system-parent';
      id: string;
      parentSystemId: string | null;
    }
  | {
      /** An AI agent; external = someone else's, entering only through MCP gateways. */
      kind: 'add-ai-agent';
      id: string;
      name: string;
      external?: boolean;
    }
  | {
      kind: 'remove-ai-agent';
      id: string;
    }
  | {
      /** The agent consumes the use case through MCP (sets exposedAsMcp). */
      kind: 'add-agent-use';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-agent-use';
      sourceId: string;
      targetId: string;
    }
  | {
      /** The agent calls an external system's operation (the other half of its tools). */
      kind: 'add-agent-external-use';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-agent-external-use';
      sourceId: string;
      targetId: string;
    }
  | {
      /** A RAG knowledge base an agent can ground its answers on. */
      kind: 'add-rag';
      id: string;
      name: string;
    }
  | { kind: 'remove-rag'; id: string }
  | {
      /** The agent queries the knowledge base (sourceId = agent, targetId = rag). */
      kind: 'add-agent-rag';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-rag'; sourceId: string; targetId: string }
  | {
      /** The RAG indexes a read model's content (sourceId = rag, targetId = read model). */
      kind: 'add-rag-source';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-rag-source'; sourceId: string; targetId: string }
  | {
      /** External content feeding the RAG: a repo, a web site, an FTP server… */
      kind: 'add-rag-content-source';
      sourceId: string;
      type: string;
      uri: string;
    }
  | { kind: 'remove-rag-content-source'; sourceId: string; uri: string; type?: string }
  | {
      /** A table/dataset owned by an external system (boundedContextId = external system id). */
      kind: 'add-external-table';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | { kind: 'remove-external-table'; id: string }
  | {
      /** An MCP server published by an external system (boundedContextId = external system id). */
      kind: 'add-mcp-server';
      id: string;
      name: string;
      boundedContextId: string;
      uri?: string;
    }
  | { kind: 'remove-mcp-server'; id: string }
  | {
      /** The agent consumes the MCP server's tools (sourceId = agent, targetId = server). */
      kind: 'add-agent-mcp';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-mcp'; sourceId: string; targetId: string }
  | {
      /** Our MCP gateway: aggregates MCPs and exposes APIs/operations/use cases/RAGs. */
      kind: 'add-mcp-gateway';
      id: string;
      name: string;
    }
  | { kind: 'remove-mcp-gateway'; id: string }
  | {
      /** The gateway exposes the target (MCP server, API, operation, use case or RAG). */
      kind: 'add-gateway-exposure';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-gateway-exposure'; sourceId: string; targetId: string }
  | {
      /** The agent consumes the gateway's curated tool surface. */
      kind: 'add-agent-gateway';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-gateway'; sourceId: string; targetId: string }
  | {
      /** The agent calls an API operation as a tool. */
      kind: 'add-agent-api-operation';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-api-operation'; sourceId: string; targetId: string }
  | {
      /** An agent may call a whole API — or an API proxy — as a tool. */
      kind: 'add-agent-api';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-api'; sourceId: string; targetId: string }
  | {
      /** The agent consults a query service as a read tool. */
      kind: 'add-agent-query';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-query'; sourceId: string; targetId: string }
  | {
      /** The agent delegates work to another agent. */
      kind: 'add-agent-delegate';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-delegate'; sourceId: string; targetId: string }
  | {
      /** The actor talks to the agent (a chat/supervision UI derives from it). */
      kind: 'add-actor-agent';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-actor-agent'; sourceId: string; targetId: string }
  | {
      /** The event triggers a run of the agent (sourceId = event, targetId = agent). */
      kind: 'add-agent-trigger';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-agent-trigger'; sourceId: string; targetId: string }
  | {
      /** Adds an existing catalog element to a CURATED view. */
      kind: 'add-view-member';
      id: string;
      targetId: string;
    }
  | {
      /** Removes an element from the view WITHOUT touching the element itself. */
      kind: 'remove-view-member';
      id: string;
      targetId: string;
    }
  | {
      /** A published API as a first-class element (usually born from an import). */
      kind: 'add-api';
      id: string;
      name: string;
    }
  | { kind: 'remove-api'; id: string }
  | {
      kind: 'add-api-operation';
      apiId: string;
      id: string;
      name: string;
      httpMethod?: string;
      path?: string;
      boundedContextId?: string;
      targetUseCaseId?: string;
    }
  | { kind: 'remove-api-operation'; apiId: string; id: string }
  | {
      /** Wires (or, with both omitted, unwires) the operation to its implementer. */
      kind: 'set-api-operation-target';
      apiId: string;
      id: string;
      boundedContextId?: string;
      targetUseCaseId?: string;
    }
  | {
      /** A business actor (role). */
      kind: 'add-actor';
      id: string;
      name: string;
    }
  | {
      /** A sticky note; name carries its text. */
      kind: 'add-note';
      id: string;
      name: string;
    }
  | {
      kind: 'remove-note';
      id: string;
    }
  | {
      /** Ties the note to an element (plain id) or a relation (edge ref with «->»). */
      kind: 'note-attach';
      id: string;
      targetId: string;
    }
  | {
      kind: 'note-detach';
      id: string;
      targetId: string;
    }
  | {
      /** An area: a named rectangle grouping elements geometrically. */
      kind: 'add-area';
      id: string;
      name: string;
    }
  | {
      kind: 'add-url';
      id: string;
      name: string;
      /** The address itself (optional at birth). */
      uri?: string;
    }
  | {
      kind: 'remove-url';
      id: string;
    }
  | {
      kind: 'add-service-url';
      serviceId: string;
      id: string;
    }
  | {
      kind: 'remove-service-url';
      serviceId: string;
      id: string;
    }
  | {
      kind: 'remove-area';
      id: string;
    }
  | {
      kind: 'remove-actor';
      id: string;
    }
  | {
      /** An application event: a fact published by a use case. */
      kind: 'add-application-event';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-application-event';
      id: string;
    }
  | {
      /** An integration event: a fact this context publishes across boundaries. */
      kind: 'add-integration-event';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | { kind: 'remove-integration-event'; id: string }
  | {
      /** A domain service: stateless domain logic owned by a bounded context. */
      kind: 'add-domain-service';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-domain-service';
      id: string;
    }
  | {
      /** A read model born from an aggregate (it lives in the aggregate's boundedContext). */
      kind: 'add-read-model';
      id: string;
      name: string;
      aggregateId: string;
    }
  | {
      kind: 'remove-read-model';
      id: string;
    }
  | {
      /**
       * Project a source onto a read model — possibly in another bounded context.
       * The source is exactly one of: an aggregate's state, an external operation to
       * poll, or a legacy table to poll. `targetId` names an existing read model;
       * otherwise `boundedContextId` is the target context and a stub read model is born there.
       */
      kind: 'add-projection';
      id: string;
      name: string;
      aggregateId?: string;
      externalUseCaseId?: string;
      externalTableId?: string;
      targetId?: string;
      boundedContextId?: string;
      readModelName?: string;
    }
  | {
      kind: 'remove-projection';
      id: string;
    }
  | {
      /** A query service owned by a bounded context. */
      kind: 'add-query-service';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-query-service';
      id: string;
    }
  | {
      /** Use case A consumes query service B (a CallQueryService step in A). */
      kind: 'add-query-call';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-query-call';
      sourceId: string;
      targetId: string;
    }
  | {
      /** An actor uses a use case or a query service directly (derives a UI). */
      kind: 'add-actor-use';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-actor-use';
      sourceId: string;
      targetId: string;
    }
  | {
      /** An actor depends on an external system (a context-map dependency edge). */
      kind: 'add-actor-external';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-actor-external';
      sourceId: string;
      targetId: string;
    }
  | {
      /** Nest an API inside the external system publishing it; empty target un-nests. */
      kind: 'set-api-publisher';
      id: string;
      targetId: string;
    }
  | {
      /** An external system depends on another one, an API or an API proxy. */
      kind: 'add-external-dependency';
      sourceId: string;
      targetId: string;
      /** DEPENDS (default) or CQRS (only between external systems). */
      type?: string;
    }
  | {
      /** An API proxy/cache — fronts a published API, consumable exactly like it. */
      kind: 'add-proxy-api';
      id: string;
      name: string;
      /** The API it fronts (optional at birth). */
      targetId?: string;
      /** Host external system (optional at birth) — boundedContextId carries it, as elsewhere. */
      boundedContextId?: string;
    }
  | {
      kind: 'remove-proxy-api';
      id: string;
    }
  | {
      /** Point the proxy at the published API it fronts; empty target clears it. */
      kind: 'set-proxy-target';
      id: string;
      targetId: string;
    }
  | {
      /** The API gets (another) implementation inside one of our bounded contexts —
       *  the same API, never a copy; proxies fronting it route there too. */
      kind: 'add-api-implementation';
      apiId: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-api-implementation';
      apiId: string;
      boundedContextId: string;
    }
  | {
      /** Route ONE proxy operation to an implementation site of the fronted API
       *  (a bounded context, or the apiId itself for "as published"). */
      kind: 'add-proxy-operation-route';
      proxyId: string;
      operationId: string;
      targetSiteId: string;
    }
  | {
      kind: 'remove-proxy-operation-route';
      proxyId: string;
      operationId: string;
      targetSiteId: string;
    }
  | {
      /** An external system calls ONE API operation at a site (published API, proxy or
       *  bounded-context implementation). sourceId = the external system. */
      kind: 'add-external-operation-use';
      sourceId: string;
      operationId: string;
      targetSiteId: string;
    }
  | {
      kind: 'remove-external-operation-use';
      sourceId: string;
      operationId: string;
      targetSiteId: string;
    }
  | {
      /** Wires the operation AT an implementation site to the use case implementing it
       *  there (the use case may live in any bounded context). */
      kind: 'set-api-operation-implementation';
      apiId: string;
      operationId: string;
      boundedContextId: string;
      targetUseCaseId: string;
    }
  | {
      kind: 'remove-api-operation-implementation';
      apiId: string;
      operationId: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-external-dependency';
      sourceId: string;
      targetId: string;
    }
  | {
      /** An actor manages an aggregate through a CRUD UI (stub use cases appear). */
      kind: 'add-actor-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-actor-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      /** A UI app manages an aggregate through a CRUD: a menu entry is added and the CRUD
       * page (+ listing query, CRUD use cases, lifecycle events) is materialized from it. */
      kind: 'add-ui-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-ui-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      /** An external system integrates with an aggregate: its CRUD API is materialized
       * (resting on the CRUD use cases + listing query) and the system is wired as consumer. */
      kind: 'add-external-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-external-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      /** Another bounded context consumes an aggregate: its CRUD API is materialized. */
      kind: 'add-context-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-context-crud';
      sourceId: string;
      targetId: string;
    }
  | {
      /** A plain use case in a bounded context — or a policy when flagged. */
      kind: 'add-use-case';
      id: string;
      name: string;
      /** Optional: omit to create it free-standing, then tie it with set-use-case-context. */
      boundedContextId?: string;
      /** Reaction logic with use-case shape that expresses no business case. */
      policy?: boolean;
    }
  | {
      /** Tie a free-standing use case to a context, or detach it (omit boundedContextId). */
      kind: 'set-use-case-context';
      id: string;
      boundedContextId?: string;
    }
  | {
      /** Move a context-scoped element (`type` = its store bucket) to a context, or detach it (omit boundedContextId). */
      kind: 'set-element-context';
      type: string;
      id: string;
      boundedContextId?: string;
    }
  | {
      /** Change what an element is, within a family (see store/commands/retype.ts); blocked while referenced. */
      kind: 'change-element-type';
      id: string;
      from: string;
      to: string;
    }
  | {
      /** A free-standing element with no parent yet (adopted into its owner later by composition). */
      kind: 'add-loose-element';
      id: string;
      name: string;
      elementType: 'operation' | 'invariant' | 'field' | 'use-case-step' | 'read-model' | 'external-table' | 'integration-event';
    }
  | { kind: 'remove-loose-element'; id: string }
  | {
      /** Compose a loose element into a parent: graft it into the parent's nested array. */
      kind: 'adopt-loose-element';
      id: string;
      ownerId: string;
    }
  | {
      kind: 'remove-use-case';
      id: string;
    }
  | {
      /** An external system calls one of our use cases in (INBOUND ACL). */
      kind: 'add-external-call';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-external-call';
      sourceId: string;
      targetId: string;
    }
  | {
      /** A use case OFFERED by an external system (boundedContextId = external system id). */
      kind: 'add-external-use-case';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | {
      kind: 'remove-external-use-case';
      id: string;
    }
  | {
      /** Our use case calls an external system's use case (CallExternalUseCase step). */
      kind: 'add-external-uc-call';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-external-uc-call';
      sourceId: string;
      targetId: string;
    }
  | {
      /** Use case A invokes use case B (a CallUseCase step in A). */
      kind: 'add-use-case-call';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-use-case-call';
      sourceId: string;
      targetId: string;
    }
  | {
      /** A bare Custom step (no counterpart on the map); typed steps come from gestures. */
      kind: 'add-use-case-step';
      useCaseId: string;
      id: string;
      name: string;
    }
  | {
      kind: 'remove-use-case-step';
      useCaseId: string;
      id: string;
    }
  | {
      /** A cron task in a bounded context (its target use case may come later). */
      kind: 'add-scheduled-trigger';
      id: string;
      name: string;
      boundedContextId: string;
      cronExpression?: string;
      targetUseCaseId?: string;
    }
  | { kind: 'remove-scheduled-trigger'; id: string }
  | {
      /** Points (or, with null, unpoints) the trigger at the use case it fires. */
      kind: 'set-scheduled-trigger-target';
      id: string;
      targetUseCaseId: string | null;
    }
  | {
      /** Use case A operates on aggregate B (a CallAggregateOperation step in A). */
      kind: 'add-aggregate-call';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-aggregate-call';
      sourceId: string;
      targetId: string;
    }
  | {
      /** The source aggregate emits the target domain event. */
      kind: 'add-emission';
      sourceId: string;
      targetId: string;
    }
  | {
      kind: 'remove-emission';
      sourceId: string;
      targetId: string;
    }
  | {
      /** `type` carries the elementType (boundedContext | aggregate | entity | domain-event). */
      kind: 'rename-element';
      type: string;
      id: string;
      name: string;
    }
  | {
      kind: 'add-flow';
      id: string;
      name: string;
      archetype: string;
      triggerAggregateId: string;
      triggerEvent: string;
      /** Alternative trigger: the domain service emitting the trigger event. */
      triggerDomainServiceId?: string;
      /** Alternative trigger: the use case publishing the trigger APPLICATION event. */
      triggerUseCaseId?: string;
      /** Target boundedContext or external system. */
      targetId: string;
      readModelName?: string;
      targetUseCaseId?: string;
    }
  | { kind: 'remove-flow'; id: string }
  | {
      kind: 'add-process';
      id: string;
      name: string;
      boundedContextId: string;
      triggerAggregateId?: string;
      triggerEvent?: string;
      steps?: import('./model.js').ProcessStepRef[];
    }
  | { kind: 'remove-process'; id: string }
  | {
      kind: 'add-process-step';
      processId: string;
      id: string;
      name: string;
      stepType: 'AUTOMATED' | 'HUMAN';
      roleId?: string;
      deadline?: string;
      useCaseId?: string;
      compensationUseCaseId?: string;
      /** Insert after this step; append when omitted. */
      afterStepId?: string;
    }
  | { kind: 'remove-process-step'; processId: string; id: string }
  | {
      /** CURATED modux View whose members come from the canvas selection. */
      kind: 'add-view';
      id: string;
      name: string;
      memberIds: string[];
    }
  | { kind: 'remove-view'; id: string }
  | {
      /** Reposition a step; afterStepId omitted moves it to the front. */
      kind: 'move-process-step';
      processId: string;
      id: string;
      afterStepId?: string;
    }
  | {
      /** Replaces roleId/deadline/compensationUseCaseId wholesale (omitted clears). */
      kind: 'update-process-step';
      processId: string;
      id: string;
      roleId?: string;
      deadline?: string;
      compensationUseCaseId?: string;
    }
  | {
      /** A cross-context orchestrator living OUTSIDE the bounded contexts. */
      kind: 'add-workflow';
      id: string;
      name: string;
      triggerAggregateId?: string;
      triggerDomainServiceId?: string;
      triggerUseCaseId?: string;
      triggerEvent?: string;
      /** Event published when every step completes. */
      completionEventName?: string;
      workflowSteps?: import('./model.js').WorkflowStepRef[];
    }
  | { kind: 'remove-workflow'; id: string }
  | {
      /** Points the workflow at the event that starts it (and at its emitter). */
      kind: 'set-workflow-trigger';
      id: string;
      triggerEvent: string;
      triggerAggregateId?: string;
      triggerDomainServiceId?: string;
      triggerUseCaseId?: string;
    }
  | {
      kind: 'add-workflow-step';
      workflowId: string;
      id: string;
      name: string;
      emittedEventName?: string;
      targetUseCaseId?: string;
      completionEventName?: string;
      dependsOnStepIds?: string[];
      /** Insert after this step; append when omitted. */
      afterStepId?: string;
      /** TASK (default), JOIN or SPLIT. */
      stepType?: string;
      /** HUMAN step: role, deadline and compensation travel with it. */
      roleId?: string;
      deadline?: string;
      compensationUseCaseId?: string;
    }
  | { kind: 'remove-workflow-step'; workflowId: string; id: string }
  | {
      /** HUMAN step ⇆ its role: targetId is the ACTOR whose worklist gets the task (omit to clear). */
      kind: 'set-workflow-step-role';
      workflowId: string;
      id: string;
      targetId?: string;
    }
  | {
      /** A deployable service — the distribution level's container. */
      kind: 'add-service';
      id: string;
      name: string;
    }
  | {
      /** HUMAN step ⇆ its form: targetId is the PAGE the forms engine renders (omit to clear). */
      kind: 'set-workflow-step-form';
      workflowId: string;
      id: string;
      targetId?: string;
    }
  | {
      /** A LOOSE gateway: JOIN or SPLIT — its workflow is inferred from its links. */
      kind: 'add-workflow-gateway';
      id: string;
      name: string;
      stepType: 'JOIN' | 'SPLIT';
    }
  | { kind: 'remove-workflow-gateway'; id: string }
  | {
      /** The FUSION: every business process becomes a workflow (same id). */
      kind: 'migrate-processes-to-workflows';
    }
  | {
      /** The other half: every saga becomes a workflow, compensation on the step. */
      kind: 'migrate-sagas-to-workflows';
    }
  | {
      /** ALL/ANY for a join, PARALLEL/EXCLUSIVE for a split (null back to default). */
      kind: 'set-gateway-semantics';
      id: string;
      type: string | null;
    }
  | {
      /** The condition guarding ONE branch of an EXCLUSIVE split (blank clears). */
      kind: 'set-gateway-branch-condition';
      id: string;
      targetId: string;
      text: string;
    }
  | {
      /** A flow link touching a gateway, or a step's hand-off to another workflow. */
      kind: 'add-workflow-link';
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-workflow-link'; sourceId: string; targetId: string }
  | {
      /** The step moves to ANOTHER workflow; dependencies left behind drop. */
      kind: 'move-workflow-step';
      workflowId: string;
      id: string;
      targetId: string;
    }
  | {
      /** Replaces emittedEventName/targetUseCaseId/completionEventName wholesale (omitted clears). */
      kind: 'update-workflow-step';
      workflowId: string;
      id: string;
      emittedEventName?: string;
      targetUseCaseId?: string;
      completionEventName?: string;
    }
  | {
      kind: 'create-ui-app';
      id: string;
      name: string;
      type?: string;
      /** Born inside a bounded context: the boundedContext owns the app from the start. */
      boundedContextId?: string;
    }
  | {
      /** MASTER_DETAIL: the page shown as the header (null clears it). */
      kind: 'set-app-header-page';
      appId: string;
      pageId: string | null;
    }
  | {
      /** What the app opens first: a page (pageId) or another app (toAppId); nulls clear. */
      kind: 'set-app-home-page';
      appId: string;
      pageId: string | null;
      toAppId?: string | null;
    }
  | {
      /** WIZARD: a new step — mapped to the page `targetId`, or bare (itemId + label). */
      kind: 'add-page-wizard-step';
      pageId: string;
      targetId?: string | null;
      label?: string;
      itemId?: string;
    }
  | {
      /** WIZARD: maps (or unmaps) the step `itemId` onto the page implementing it. */
      kind: 'set-wizard-step-page';
      pageId: string;
      itemId: string;
      targetId: string | null;
    }
  | { kind: 'remove-page-wizard-step'; pageId: string; targetId: string }
  | {
      /** The app's viewmodel — the orchestrator's state (null clears it). */
      kind: 'set-app-model';
      appId: string;
      modelId: string | null;
    }
  | {
      /** A fresh empty data model, ready to be a viewmodel. */
      kind: 'add-model';
      id: string;
      name: string;
    }
  | { kind: 'remove-model'; id: string }
  | {
      /** A declarative mapping between two models (rules grow in its form). */
      kind: 'add-model-mapping';
      id: string;
      name: string;
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-model-mapping'; id: string }
  | { kind: 'add-model-field'; modelId: string; fieldId: string; name: string; type?: string }
  | { kind: 'remove-model-field'; modelId: string; fieldId: string }
  | { kind: 'set-model-field'; modelId: string; fieldId: string; name?: string; type?: string }
  | {
      /** Moves the field to another model; the rules that mapped it drop. */
      kind: 'move-model-field';
      modelId: string;
      fieldId: string;
      targetId: string;
    }
  | {
      /** A field-to-field rule of an existing mapping (source/target are FIELD ids). */
      kind: 'add-model-mapping-rule';
      id: string;
      sourceId: string;
      targetId: string;
    }
  | { kind: 'remove-model-mapping-rule'; id: string; itemId: string }
  | {
      /**
       * References ANOTHER modux project as an external system.
       *
       * The editor emits the COORDINATE; the HOST fills in `snapshot`, because reading another
       * model off disk is I/O and the applier does none — that is what lets it be tested without
       * files. The snapshot is what generation reads, so a build never needs the other repository
       * present; the coordinate is only consulted to refresh. See §4.7.
       */
      kind: 'add-project-reference';
      referencedProject: { gitUrl?: string; branch?: string; path?: string };
      /** Filled in by the host: the other project's name and exposed use cases. */
      snapshot?: { name: string; useCases: { id: string; name: string }[] };
      id?: string;
    }
  | { kind: 'add-button-group'; id: string; name: string }
  | { kind: 'remove-button-group'; id: string }
  | { kind: 'add-group-button'; id: string; itemId: string; label: string }
  | { kind: 'remove-group-button'; id: string; itemId: string }
  | {
      /** What the button FIRES: a use case/policy, or one API operation (both null clears). */
      kind: 'set-group-button-target';
      id: string;
      itemId: string;
      useCaseId?: string | null;
      apiId?: string | null;
      operationId?: string | null;
      mappingId?: string | null;
      label?: string;
    }
  | { kind: 'add-group-subgroup'; id: string; targetId: string }
  | { kind: 'remove-group-subgroup'; id: string; targetId: string }
  | {
      /** Hooks the group to the page's toolbar or bottom bar. */
      kind: 'add-page-bar-group';
      pageId: string;
      id: string;
      bar: 'toolbar' | 'bottom';
    }
  | { kind: 'remove-page-bar-group'; pageId: string; id: string }
  | { kind: 'add-custom-code'; id: string; name: string }
  | { kind: 'remove-custom-code'; id: string }
  | {
      /** The mapping delegates to hand-written code (targetId null unwires). */
      kind: 'set-mapping-custom-code';
      id: string;
      targetId: string | null;
    }
  | {
      /** The transformation delegates to hand-written code (targetId null unwires). */
      kind: 'set-transformation-custom-code';
      id: string;
      targetId: string | null;
    }
  | {
      /** The use case operation (step) delegates to hand-written code. */
      kind: 'set-use-case-step-custom-code';
      useCaseId: string;
      id: string;
      targetId: string | null;
    }
  | {
      /** The page delegates to hand-written code — the page is CUSTOM (null unwires). */
      kind: 'set-page-custom-code';
      id: string;
      targetId: string | null;
    }
  | {
      /** The component delegates to hand-written code — the component is CUSTOM. */
      kind: 'set-page-component-custom-code';
      pageId: string;
      componentId: string;
      targetId: string | null;
    }
  | {
      /** The custom code TOUCHES an element (UI, use case, model… free-form intent). */
      kind: 'add-custom-code-use';
      id: string;
      elementId: string;
    }
  | { kind: 'remove-custom-code-use'; id: string; elementId: string }
  | { kind: 'add-transformation'; id: string; name: string }
  | { kind: 'remove-transformation'; id: string }
  | {
      /** An input of the transformation: a whole model (no fieldId) or one field. */
      kind: 'add-transformation-input';
      id: string;
      modelId: string;
      fieldId?: string;
    }
  | { kind: 'remove-transformation-input'; id: string; modelId: string; fieldId?: string }
  | {
      /** The model or field the transformation produces; without modelId it unwires. */
      kind: 'set-transformation-output';
      id: string;
      modelId?: string;
      fieldId?: string;
    }
  | {
      /** A code boundedContext: the bounded context distributes its elements into it. */
      kind: 'add-module';
      id: string;
      name: string;
      boundedContextId: string;
    }
  | { kind: 'remove-module'; id: string }
  | {
      /** An element lives in ONE boundedContext of its bounded context: assigning moves it. */
      kind: 'add-module-element';
      id: string;
      elementId: string;
    }
  | { kind: 'remove-module-element'; id: string; elementId: string }
  | {
      /** The service deploys the boundedContext (a shared boundedContext may deploy in several). */
      kind: 'add-service-module';
      serviceId: string;
      id: string;
    }
  | { kind: 'remove-service-module'; serviceId: string; id: string }
  | {
      /** An integrator: an ETL flow owned by a bounded context. */
      kind: 'add-etl-flow';
      id: string;
      name: string;
      /** Omitted: the pipeline floats until the ficha wires its owner context. */
      boundedContextId?: string;
    }
  | { kind: 'remove-etl-flow'; id: string }
  | {
      /** One ETL step; targetId carries the event for consumers/event writes. */
      kind: 'add-etl-step';
      etlFlowId: string;
      id: string;
      name?: string;
      stepType: string;
      externalTableId?: string;
      apiId?: string;
      operationId?: string;
      targetId?: string;
      mappingId?: string;
    }
  | { kind: 'remove-etl-step'; etlFlowId: string; id: string }
  | {
      /** An identity provider: who issues the identities the system trusts. */
      kind: 'add-identity-provider';
      id: string;
      name: string;
      type?: string;
    }
  | { kind: 'remove-identity-provider'; id: string }
  | {
      /** When an event happens, tell these roles through this channel. */
      kind: 'add-notification';
      id: string;
      name: string;
      boundedContextId: string;
      type?: string;
    }
  | { kind: 'remove-notification'; id: string }
  | { kind: 'set-notification-event'; id: string; targetId: string | null }
  | { kind: 'add-notification-recipient'; id: string; roleId: string }
  | { kind: 'remove-notification-recipient'; id: string; roleId: string }
  | {
      /** A generated document (DOCUMENT) or report (REPORT). */
      kind: 'add-document';
      id: string;
      name: string;
      boundedContextId: string;
      type?: string;
    }
  | { kind: 'remove-document'; id: string }
  | { kind: 'set-document-model'; id: string; modelId: string | null }
  | {
      kind: 'set-document-query';
      id: string;
      queryServiceId: string | null;
      queryOperationId: string | null;
    }
  | {
      /** i18n: the locales the system speaks (fieldIds carries them; label = default). */
      kind: 'set-project-locales';
      fieldIds: string[];
      label?: string;
    }
  | {
      /** Federation: the external system publishing the IdP (null = ours). */
      kind: 'set-idp-publisher';
      id: string;
      targetId: string | null;
    }
  | {
      /** Wires (or unwires) an app / bounded context / ETL flow to the IdP `targetId`. */
      kind: 'set-identity-provider';
      id: string;
      targetId: string | null;
    }
  | {
      /** CRUD: what opens a row — a page (targetId) or an app (toAppId); nulls clear. */
      kind: 'set-crud-detail';
      pageId: string;
      targetId?: string | null;
      toAppId?: string | null;
    }
  | {
      /** CRUD: the new-record form — a page (targetId) or an app (toAppId); nulls clear. */
      kind: 'set-crud-create';
      pageId: string;
      targetId?: string | null;
      toAppId?: string | null;
    }
  | {
      /** VIEW_EDITOR: the read-only detail view (null clears it). */
      kind: 'set-app-view-page';
      appId: string;
      pageId: string | null;
    }
  | {
      /** VIEW_EDITOR: the edit view (null clears it). */
      kind: 'set-app-edit-page';
      appId: string;
      pageId: string | null;
    }
  | {
      /** WIZARD: re-slots the step before another step's page (null = the end). */
      kind: 'move-page-wizard-step';
      pageId: string;
      targetId: string;
      beforeItemId?: string | null;
    }
  | { kind: 'delete-ui-app'; id: string }
  | {
      kind: 'create-ui-page';
      id: string;
      name: string;
      pageType?: string;
      appId?: string;
      menuLabel?: string;
    }
  | { kind: 'delete-ui-page'; id: string }
  | {
      kind: 'add-menu-item';
      appId: string;
      label: string;
      pageId?: string | null;
      itemId?: string;
      parentId?: string;
      parentLabel?: string;
    }
  | { kind: 'remove-menu-item'; appId: string; label?: string; itemId?: string }
  | {
      /** Moves an entry (subtree included): to another app, under a parent, into a slot. */
      kind: 'move-menu-item';
      appId: string;
      toAppId: string;
      itemId?: string;
      label?: string;
      parentId?: string;
      beforeItemId?: string;
    }
  | { kind: 'set-menu-app'; appId: string; toAppId: string | null; itemId?: string; label?: string }
  | {
      kind: 'set-menu-use-case';
      appId: string;
      useCaseId: string | null;
      itemId?: string;
      label?: string;
    }
  | {
      kind: 'set-menu-aggregate';
      appId: string;
      aggregateId: string | null;
      itemId?: string;
      label?: string;
    }
  | {
      kind: 'set-menu-query-operation';
      appId: string;
      queryServiceId: string | null;
      queryOperationId: string | null;
      itemId?: string;
      label?: string;
    }
  | {
      kind: 'set-menu-page';
      appId: string;
      pageId: string | null;
      itemId?: string;
      label?: string;
    }
  | { kind: 'add-page-button'; pageId: string; useCaseId: string; label?: string; type?: string }
  | { kind: 'remove-page-button'; pageId: string; useCaseId: string }
  | { kind: 'add-mockup'; id: string; name: string; pageId?: string }
  | { kind: 'delete-mockup'; id: string }
  | { kind: 'set-mockup-page'; id: string; pageId: string | null }
  | { kind: 'rename-ui-page'; pageId: string; name: string }
  | { kind: 'set-page-type'; pageId: string; pageType: string }
  | { kind: 'set-page-route'; pageId: string; path: string }
  | {
      kind: 'set-page-button';
      pageId: string;
      useCaseId: string;
      label: string | null;
      mappingId: string | null;
    }
  | {
      kind: 'add-page-component';
      /** The host of the component tree: a page (`pageId`) or a mockup (`mockupId`). */
      pageId?: string;
      mockupId?: string;
      componentId: string;
      componentKind: string;
      parentComponentId?: string;
    }
  | { kind: 'remove-page-component'; pageId?: string; mockupId?: string; componentId: string }
  | {
      kind: 'set-page-component';
      pageId?: string;
      mockupId?: string;
      componentId: string;
      title?: string | null;
      text?: string | null;
      label?: string | null;
      useCaseId?: string | null;
      mappingId?: string | null;
      modelId?: string | null;
      queryServiceId?: string | null;
      queryOperationId?: string | null;
      fieldId?: string | null;
      stereotype?: string | null;
      colspan?: number | null;
      detailPageId?: string | null;
    }
  | {
      kind: 'move-page-component';
      pageId?: string;
      mockupId?: string;
      componentId: string;
      parentComponentId?: string | null;
      beforeComponentId?: string | null;
    }
  | { kind: 'set-page-listing'; pageId: string; queryServiceId: string | null }
  | { kind: 'set-page-model'; pageId: string; modelId: string | null }
  | {
      kind: 'set-page-field-config';
      pageId: string;
      fieldId: string;
      stereotype: string | null;
      colspan: number | null;
      label: string | null;
    }
  | { kind: 'set-page-field-order'; pageId: string; fieldIds: string[] }
  | { kind: 'add-actor-app'; actorId: string; appId: string }
  | { kind: 'remove-actor-app'; actorId: string; appId: string }
  | {
      /** The step `id` starts only after `dependsOnStepId` completes. */
      kind: 'add-workflow-dependency';
      workflowId: string;
      id: string;
      dependsOnStepId: string;
    }
  | {
      kind: 'remove-workflow-dependency';
      workflowId: string;
      id: string;
      dependsOnStepId: string;
    };

export interface ModuxSelection {
  elementType: string;
  id: string;
}
