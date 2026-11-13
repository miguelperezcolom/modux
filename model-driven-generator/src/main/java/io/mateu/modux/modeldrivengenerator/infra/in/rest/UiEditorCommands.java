package io.mateu.modux.modeldrivengenerator.infra.in.rest;

import io.mateu.modux.modeldrivengenerator.application.usecases.flow.coherence.FlowContextMapCoherenceService;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.flow.vo.FlowArchetype;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.boundedcontext.vo.SubdomainType;
import io.mateu.modux.modeldrivengenerator.domain.aggregates.process.vo.ProcessStepType;
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
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalApiOperationUseEntity;
import io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ExternalSystemEntity;
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Component;
import io.mateu.modux.modeldrivengenerator.infra.in.rest.EditorApiController.*;

/**
 * UI map commands: apps, pages (CRUD, wizards, content), menus, buttons and
 * groups, custom code wiring, models, mappings and transformations.
 */
@Component
@RequiredArgsConstructor
public class UiEditorCommands {

    private final ModelStore repository;
    private final EditorProjectSupport projects;

    public void createUiApp(EditorCommand command) {
        if (repository.findById(command.id(), UiAdapterEntity.class).isPresent()) return;
        var appType = command.type() == null || command.type().isBlank()
                ? io.mateu.modux.modeldrivengenerator.domain.aggregates.uiadapter.vo.UiAppType.APP
                : io.mateu.modux.modeldrivengenerator.domain.aggregates.uiadapter.vo.UiAppType.valueOf(command.type());
        repository.save(UiAdapterEntity.builder()
                .id(command.id()).name(command.name()).title(command.name())
                .menuItems(List.of()).appType(appType)
                .build());
        if (command.boundedContextId() == null || command.boundedContextId().isBlank()) return;
        // Born inside a bounded context: the boundedContext owns the app from the start.
        var boundedContext = repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        if (boundedContext.uiAdapterIds().contains(command.id())) return;
        var ids = new ArrayList<>(boundedContext.uiAdapterIds());
        ids.add(command.id());
        repository.save(boundedContext.toBuilder().uiAdapterIds(ids).build());
    }

    /** MASTER_DETAIL: the page shown as the header; null clears it. */
    public void setAppHeaderPage(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.pageId() != null && !command.pageId().isBlank()) {
            repository.findById(command.pageId(), PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        }
        repository.save(app.toBuilder()
                .headerPageId(command.pageId() == null || command.pageId().isBlank() ? null : command.pageId())
                .build());
    }

    /** What the app opens first — a page (pageId) or another app (toAppId); null clears. */
    public void setAppHomePage(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (app.appType() != io.mateu.modux.modeldrivengenerator.domain.aggregates.uiadapter.vo.UiAppType.APP) {
            throw new IllegalArgumentException(
                    "Solo las apps normales tienen home: el maestro-detalle es cabecera y pestañas, y el orquestador solo enseña páginas hijas");
        }
        var pageId = command.pageId() == null || command.pageId().isBlank() ? null : command.pageId();
        var toAppId = command.toAppId() == null || command.toAppId().isBlank() ? null : command.toAppId();
        if (pageId != null) {
            repository.findById(pageId, PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + pageId));
        }
        if (toAppId != null) {
            if (toAppId.equals(app.id())) {
                throw new IllegalArgumentException("Una app no puede ser su propia home");
            }
            repository.findById(toAppId, UiAdapterEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + toAppId));
        }
        repository.save(app.toBuilder()
                .homePageId(toAppId != null ? null : pageId)
                .homeAppId(toAppId)
                .build());
    }

    /** An identity provider — ours, or federated when published by an external system. */
    public void addIdentityProvider(EditorCommand command) {
        if (repository.findById(command.id(), IdentityProviderEntity.class).isPresent()) return;
        var type = command.type() == null || command.type().isBlank() ? "CORPORATE" : command.type();
        if (!IdentityProviderEntity.TYPES.contains(type)) {
            throw new IllegalArgumentException("Unknown IdP type: " + type);
        }
        repository.save(new IdentityProviderEntity(command.id(), command.name(), type,
                null, null, null, null));
    }

    /** Deletes the IdP and clears every trust edge pointing at it. */
    public void removeIdentityProvider(EditorCommand command) {
        for (var app : repository.findAllOfType(UiAdapterEntity.class)) {
            if (command.id().equals(app.identityProviderId())) {
                repository.save(app.toBuilder().identityProviderId(null).build());
            }
        }
        for (var mo : repository.findAllOfType(BoundedContextEntity.class)) {
            if (command.id().equals(mo.identityProviderId())) {
                repository.save(mo.toBuilder().identityProviderId(null).build());
            }
        }
        for (var flow : repository.findAllOfType(EtlFlowEntity.class)) {
            if (command.id().equals(flow.identityProviderId())) {
                repository.save(new EtlFlowEntity(flow.id(), flow.name(), flow.description(),
                        flow.ownerBoundedContextId(), flow.steps(), null, null));
            }
        }
        repository.deleteAllById(List.of(command.id()), IdentityProviderEntity.class);
    }

    /** Federation: the external system publishing this IdP (null = ours). */
    public void setIdpPublisher(EditorCommand command) {
        var idp = repository.findById(command.id(), IdentityProviderEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown IdP: " + command.id()));
        if (command.targetId() != null && !command.targetId().isBlank()) {
            var known = projects.externalSystems().stream()
                    .anyMatch(x -> x.id().equals(command.targetId()));
            if (!known) {
                throw new IllegalArgumentException("Sistema externo desconocido: " + command.targetId());
            }
        }
        repository.save(new IdentityProviderEntity(idp.id(), idp.name(), idp.type(), idp.issuer(),
                command.targetId() == null || command.targetId().isBlank() ? null : command.targetId(),
                idp.description(), null));
    }

    /** Wires (or, with null, unwires) an app / bounded context / ETL flow to its IdP. */
    public void setIdentityProvider(EditorCommand command) {
        var idpId = command.targetId() == null || command.targetId().isBlank() ? null : command.targetId();
        if (idpId != null) {
            repository.findById(idpId, IdentityProviderEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown IdP: " + idpId));
        }
        var app = repository.findById(command.id(), UiAdapterEntity.class);
        if (app.isPresent()) {
            repository.save(app.get().toBuilder().identityProviderId(idpId).build());
            return;
        }
        var mo = repository.findById(command.id(), BoundedContextEntity.class);
        if (mo.isPresent()) {
            repository.save(mo.get().toBuilder().identityProviderId(idpId).build());
            return;
        }
        var flow = repository.findById(command.id(), EtlFlowEntity.class);
        if (flow.isPresent()) {
            var f = flow.get();
            repository.save(new EtlFlowEntity(f.id(), f.name(), f.description(),
                    f.ownerBoundedContextId(), f.steps(), idpId, null));
            return;
        }
        throw new IllegalArgumentException(
                "El IdP se relaciona con apps, bounded contexts o flujos ETL: " + command.id());
    }

    /** A notification: when an event happens, tell these roles through these channels. */
    public void addNotification(EditorCommand command) {
        if (repository.findById(command.id(), NotificationEntity.class).isPresent()) return;
        repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        var channel = command.type() == null || command.type().isBlank() ? "EMAIL" : command.type();
        if (!NotificationEntity.CHANNELS.contains(channel)) {
            throw new IllegalArgumentException("Unknown channel: " + channel);
        }
        repository.save(new NotificationEntity(command.id(), command.name(), command.boundedContextId(),
                null, List.of(channel), List.of(), null, null, null, null));
    }

    public void removeNotification(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), NotificationEntity.class);
    }

    /** Points (or, with null, unpoints) the notification at the event that fires it. */
    public void setNotificationEvent(EditorCommand command) {
        var n = repository.findById(command.id(), NotificationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown notification: " + command.id()));
        var eventId = command.targetId() == null || command.targetId().isBlank() ? null : command.targetId();
        if (eventId != null
                && repository.findById(eventId, DomainEventEntity.class).isEmpty()
                && repository.findById(eventId, ApplicationEventEntity.class).isEmpty()) {
            throw new IllegalArgumentException("Unknown event: " + eventId);
        }
        repository.save(new NotificationEntity(n.id(), n.name(), n.ownerBoundedContextId(), eventId,
                n.channels(), n.recipientRoleIds(), n.recipientExpression(), n.subject(), n.body(), null));
    }

    /** Adds/removes a recipient role. */
    public void toggleNotificationRecipient(EditorCommand command, boolean add) {
        var n = repository.findById(command.id(), NotificationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown notification: " + command.id()));
        if (add) {
            repository.findById(command.roleId(), RoleEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown role: " + command.roleId()));
        }
        var roles = new ArrayList<>(n.recipientRoleIds());
        if (add && !roles.contains(command.roleId())) roles.add(command.roleId());
        if (!add) roles.remove(command.roleId());
        repository.save(new NotificationEntity(n.id(), n.name(), n.ownerBoundedContextId(), n.eventId(),
                n.channels(), roles, n.recipientExpression(), n.subject(), n.body(), null));
    }

    /** A generated document (template + model) or report (query-fed dataset). */
    public void addDocument(EditorCommand command) {
        if (repository.findById(command.id(), DocumentEntity.class).isPresent()) return;
        repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        var kind = command.type() == null || command.type().isBlank() ? "DOCUMENT" : command.type();
        if (!DocumentEntity.KINDS.contains(kind)) {
            throw new IllegalArgumentException("Unknown document kind: " + kind);
        }
        repository.save(new DocumentEntity(command.id(), command.name(), command.boundedContextId(),
                kind, null, null, null, null, null, null));
    }

    public void removeDocument(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), DocumentEntity.class);
    }

    /** DOCUMENT: the model that fills the template (null clears). */
    public void setDocumentModel(EditorCommand command) {
        var doc = repository.findById(command.id(), DocumentEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown document: " + command.id()));
        var modelId = command.modelId() == null || command.modelId().isBlank() ? null : command.modelId();
        if (modelId != null) {
            repository.findById(modelId, ModelEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + modelId));
        }
        repository.save(new DocumentEntity(doc.id(), doc.name(), doc.ownerBoundedContextId(), doc.kind(),
                modelId, doc.queryServiceId(), doc.queryOperationId(), doc.templateUri(), doc.description(), null));
    }

    /** REPORT: the query operation feeding the dataset (nulls clear). */
    public void setDocumentQuery(EditorCommand command) {
        var doc = repository.findById(command.id(), DocumentEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown document: " + command.id()));
        var qs = command.queryServiceId() == null || command.queryServiceId().isBlank() ? null : command.queryServiceId();
        var op = command.queryOperationId() == null || command.queryOperationId().isBlank() ? null : command.queryOperationId();
        repository.save(new DocumentEntity(doc.id(), doc.name(), doc.ownerBoundedContextId(), doc.kind(),
                doc.modelId(), qs, op, doc.templateUri(), doc.description(), null));
    }

    /** i18n: the locales the system speaks. */
    public void setProjectLocales(EditorCommand command) {
        var project = projects.currentProject()
                .orElseThrow(() -> new IllegalArgumentException("No current project"));
        repository.save(project.toBuilder()
                .locales(command.fieldIds())
                .defaultLocale(command.label())
                .build());
    }

    public void addEtlFlow(EditorCommand command) {
        if (repository.findById(command.id(), EtlFlowEntity.class).isPresent()) return;
        if (command.boundedContextId() != null) {
            repository.findById(command.boundedContextId(), BoundedContextEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown boundedContext: " + command.boundedContextId()));
        }
        // Ownerless pipelines FLOAT on the integrations view; the ficha wires the owner.
        repository.save(new EtlFlowEntity(command.id(), command.name(), null,
                command.boundedContextId(), List.of()));
    }

    public void removeEtlFlow(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), EtlFlowEntity.class);
    }

    /** One ETL step: a source (pull/consumer), a transform, or a write (api/db/event). */
    public void addEtlStep(EditorCommand command) {
        var flow = repository.findById(command.etlFlowId(), EtlFlowEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown ETL flow: " + command.etlFlowId()));
        if (command.stepType() == null || !EtlStepEntity.KINDS.contains(command.stepType())) {
            throw new IllegalArgumentException("Unknown ETL step type: " + command.stepType());
        }
        var steps = new ArrayList<>(flow.steps());
        if (steps.stream().anyMatch(s -> s.id().equals(command.id()))) return;
        steps.add(new EtlStepEntity(command.id(),
                command.name() != null ? command.name() : command.stepType(),
                command.stepType(), command.externalTableId(), command.apiId(),
                command.operationId(), command.targetId(), command.mappingId(), null));
        repository.save(new EtlFlowEntity(flow.id(), flow.name(), flow.description(),
                flow.ownerBoundedContextId(), steps));
    }

    public void removeEtlStep(EditorCommand command) {
        repository.findById(command.etlFlowId(), EtlFlowEntity.class).ifPresent(flow ->
                repository.save(new EtlFlowEntity(flow.id(), flow.name(), flow.description(),
                        flow.ownerBoundedContextId(),
                        flow.steps().stream().filter(s -> !s.id().equals(command.id())).toList())));
    }

    /** A declarative mapping between two models; its rules grow in its form. */
    public void addTransformation(EditorCommand command) {
        if (repository.findById(command.id(), TransformationEntity.class).isPresent()) return;
        repository.save(new TransformationEntity(command.id(), command.name(), List.of(), null));
    }

    public void removeTransformation(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), TransformationEntity.class);
    }

    private TransformationRefEntity refOf(EditorCommand command) {
        repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        return new TransformationRefEntity(command.modelId(),
                command.fieldId() == null || command.fieldId().isBlank() ? null : command.fieldId());
    }

    public void addTransformationInput(EditorCommand command) {
        var t = repository.findById(command.id(), TransformationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown transformation: " + command.id()));
        var ref = refOf(command);
        if (t.inputs().contains(ref)) return;
        var inputs = new ArrayList<>(t.inputs());
        inputs.add(ref);
        repository.save(t.toBuilder().inputs(inputs).build());
    }

    public void removeTransformationInput(EditorCommand command) {
        var t = repository.findById(command.id(), TransformationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown transformation: " + command.id()));
        var fieldId = command.fieldId() == null || command.fieldId().isBlank() ? null : command.fieldId();
        repository.save(t.toBuilder()
                .inputs(t.inputs().stream()
                        .filter(r -> !(r.modelId().equals(command.modelId())
                                && java.util.Objects.equals(r.fieldId(), fieldId)))
                        .toList())
                .build());
    }

    /** The model or field the transformation produces; without modelId it just unwires. */
    public void setTransformationOutput(EditorCommand command) {
        var t = repository.findById(command.id(), TransformationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown transformation: " + command.id()));
        var output = command.modelId() == null || command.modelId().isBlank() ? null : refOf(command);
        repository.save(t.toBuilder().output(output).build());
    }

    public void addButtonGroup(EditorCommand command) {
        if (repository.findById(command.id(), ButtonGroupEntity.class).isPresent()) return;
        repository.save(new ButtonGroupEntity(command.id(), command.name(), List.of(), List.of(), null));
    }

    public void removeButtonGroup(EditorCommand command) {
        // pages unhook it, parent groups let go of it
        for (var pg : repository.findAllOfType(PageEntity.class)) {
            var tb = pg.toolbarGroupIds() == null ? List.<String>of() : pg.toolbarGroupIds();
            var bb = pg.bottomBarGroupIds() == null ? List.<String>of() : pg.bottomBarGroupIds();
            if (tb.contains(command.id()) || bb.contains(command.id())) {
                repository.save(pg.toBuilder()
                        .toolbarGroupIds(AgentEditorCommands.without(tb, command.id()))
                        .bottomBarGroupIds(AgentEditorCommands.without(bb, command.id()))
                        .build());
            }
        }
        repository.findAllOfType(ButtonGroupEntity.class).stream()
                .filter(g -> g.groupIds().contains(command.id()))
                .forEach(g -> repository.save(g.toBuilder()
                        .groupIds(AgentEditorCommands.without(g.groupIds(), command.id())).build()));
        repository.deleteAllById(List.of(command.id()), ButtonGroupEntity.class);
    }

    public void addGroupButton(EditorCommand command) {
        var g = repository.findById(command.id(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.id()));
        if (g.buttons().stream().anyMatch(bt -> bt.id().equals(command.itemId()))) return;
        var buttons = new ArrayList<>(g.buttons());
        buttons.add(new GroupButtonEntity(command.itemId(), command.label(), null, null, null, null));
        repository.save(g.toBuilder().buttons(buttons).build());
    }

    public void removeGroupButton(EditorCommand command) {
        var g = repository.findById(command.id(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.id()));
        repository.save(g.toBuilder()
                .buttons(g.buttons().stream().filter(bt -> !bt.id().equals(command.itemId())).toList())
                .build());
    }

    /** What the button FIRES: a use case/policy, or one API operation (both null clears). */
    public void setGroupButtonTarget(EditorCommand command) {
        var g = repository.findById(command.id(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.id()));
        repository.save(g.toBuilder()
                .buttons(g.buttons().stream()
                        .map(bt -> bt.id().equals(command.itemId())
                                ? new GroupButtonEntity(bt.id(),
                                        command.label() == null || command.label().isBlank()
                                                ? bt.label() : command.label(),
                                        command.useCaseId(), command.apiId(), command.operationId(),
                                        command.mappingId())
                                : bt)
                        .toList())
                .build());
    }

    public void addGroupSubgroup(EditorCommand command) {
        var g = repository.findById(command.id(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.id()));
        repository.findById(command.targetId(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.targetId()));
        if (command.id().equals(command.targetId()) || g.groupIds().contains(command.targetId())) return;
        var ids = new ArrayList<>(g.groupIds());
        ids.add(command.targetId());
        repository.save(g.toBuilder().groupIds(ids).build());
    }

    public void removeGroupSubgroup(EditorCommand command) {
        var g = repository.findById(command.id(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.id()));
        repository.save(g.toBuilder().groupIds(AgentEditorCommands.without(g.groupIds(), command.targetId())).build());
    }

    /** Hooks the group to the page's toolbar or bottom bar (command.bar()). */
    public void addPageBarGroup(EditorCommand command) {
        var pg = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        repository.findById(command.id(), ButtonGroupEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown button group: " + command.id()));
        var toolbar = "toolbar".equals(command.bar());
        var current = toolbar
                ? (pg.toolbarGroupIds() == null ? List.<String>of() : pg.toolbarGroupIds())
                : (pg.bottomBarGroupIds() == null ? List.<String>of() : pg.bottomBarGroupIds());
        if (current.contains(command.id())) return;
        var grown = new ArrayList<>(current);
        grown.add(command.id());
        repository.save(toolbar
                ? pg.toBuilder().toolbarGroupIds(grown).build()
                : pg.toBuilder().bottomBarGroupIds(grown).build());
    }

    public void removePageBarGroup(EditorCommand command) {
        var pg = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        repository.save(pg.toBuilder()
                .toolbarGroupIds(AgentEditorCommands.without(pg.toolbarGroupIds() == null ? List.of() : pg.toolbarGroupIds(), command.id()))
                .bottomBarGroupIds(AgentEditorCommands.without(pg.bottomBarGroupIds() == null ? List.of() : pg.bottomBarGroupIds(), command.id()))
                .build());
    }

    public void addCustomCode(EditorCommand command) {
        if (repository.findById(command.id(), CustomCodeEntity.class).isPresent()) return;
        repository.save(new CustomCodeEntity(command.id(), command.name(), null, null));
    }

    public void removeCustomCode(EditorCommand command) {
        // whoever delegated to this code lets go of it
        repository.findAllOfType(ModelMappingEntity.class).stream()
                .filter(mm -> command.id().equals(mm.customCodeId()))
                .forEach(mm -> repository.save(mm.toBuilder().customCodeId(null).build()));
        repository.findAllOfType(TransformationEntity.class).stream()
                .filter(t -> command.id().equals(t.customCodeId()))
                .forEach(t -> repository.save(t.toBuilder().customCodeId(null).build()));
        for (var uc : repository.findAllOfType(UseCaseEntity.class)) {
            if (uc.steps() == null
                    || uc.steps().stream().noneMatch(st -> command.id().equals(st.customCodeId()))) {
                continue;
            }
            repository.save(EditorApiController.withSteps(uc, uc.steps().stream()
                    .map(st -> command.id().equals(st.customCodeId()) ? stepWithCustomCode(st, null) : st)
                    .toList()));
        }
        for (var pg : repository.findAllOfType(PageEntity.class)) {
            var content = withoutComponentCustomCode(pg.content(), command.id());
            var pageLinked = command.id().equals(pg.customCodeId());
            if (pageLinked || content != null) {
                repository.save(pg.toBuilder()
                        .customCodeId(pageLinked ? null : pg.customCodeId())
                        .content(content != null ? content : pg.content())
                        .build());
            }
        }
        repository.deleteAllById(List.of(command.id()), CustomCodeEntity.class);
    }

    private String customCodeRefOf(EditorCommand command) {
        var ccId = command.targetId() == null || command.targetId().isBlank() ? null : command.targetId();
        if (ccId != null) {
            repository.findById(ccId, CustomCodeEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown custom code: " + ccId));
        }
        return ccId;
    }

    /** The mapping delegates to hand-written code (targetId null unwires). */
    public void setMappingCustomCode(EditorCommand command) {
        var mm = repository.findById(command.id(), ModelMappingEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown mapping: " + command.id()));
        repository.save(mm.toBuilder().customCodeId(customCodeRefOf(command)).build());
    }

    /** The transformation delegates to hand-written code (targetId null unwires). */
    public void setTransformationCustomCode(EditorCommand command) {
        var t = repository.findById(command.id(), TransformationEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown transformation: " + command.id()));
        repository.save(t.toBuilder().customCodeId(customCodeRefOf(command)).build());
    }

    /** The use case operation (step) delegates to hand-written code. */
    public void setUseCaseStepCustomCode(EditorCommand command) {
        var uc = repository.findById(command.useCaseId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown use case: " + command.useCaseId()));
        var ccId = customCodeRefOf(command);
        repository.save(EditorApiController.withSteps(uc,
                (uc.steps() == null ? List.<UseCaseStepEntity>of() : uc.steps()).stream()
                        .map(st -> st.id().equals(command.id()) ? stepWithCustomCode(st, ccId) : st)
                        .toList()));
    }

    static UseCaseStepEntity stepWithCustomCode(UseCaseStepEntity s, String customCodeId) {
        return new UseCaseStepEntity(s.id(), s.name(), s.type(), s.aggregateId(), s.operationId(),
                s.gatewayId(), s.gatewayOperationId(), s.domainEventId(), s.useCaseId(),
                s.modelMappingId(), s.queryServiceId(), s.queryOperationId(), s.intent(),
                s.applicationEventId(), s.externalUseCaseId(), customCodeId);
    }

    /** The page delegates to hand-written code — the page is CUSTOM (targetId null unwires). */
    public void setPageCustomCode(EditorCommand command) {
        var page = repository.findById(command.id(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.id()));
        repository.save(page.toBuilder().customCodeId(customCodeRefOf(command)).build());
    }

    /** The component delegates to hand-written code — the component is CUSTOM. */
    public void setPageComponentCustomCode(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var ccId = customCodeRefOf(command);
        repository.save(page.toBuilder()
                .content(withComponentCustomCode(page.content(), command.componentId(), ccId))
                .build());
    }

    static List<UiComponentNodeEntity> withComponentCustomCode(
            List<UiComponentNodeEntity> nodes, String componentId, String customCodeId) {
        if (nodes == null) return null;
        return nodes.stream()
                .map(n -> n.toBuilder()
                        .children(withComponentCustomCode(n.children(), componentId, customCodeId))
                        .customCodeId(n.id().equals(componentId) ? customCodeId : n.customCodeId())
                        .build())
                .toList();
    }

    /** The content tree with every reference to the given code cleared, or null when untouched. */
    static List<UiComponentNodeEntity> withoutComponentCustomCode(
            List<UiComponentNodeEntity> nodes, String customCodeId) {
        if (nodes == null) return null;
        var changed = false;
        var copy = new ArrayList<UiComponentNodeEntity>();
        for (var n : nodes) {
            var children = withoutComponentCustomCode(n.children(), customCodeId);
            var hit = customCodeId.equals(n.customCodeId());
            if (hit || children != null) changed = true;
            copy.add(n.toBuilder()
                    .children(children != null ? children : n.children())
                    .customCodeId(hit ? null : n.customCodeId())
                    .build());
        }
        return changed ? copy : null;
    }

    /** The custom code TOUCHES an element (UI, use case, model… free-form intent). */
    public void addCustomCodeUse(EditorCommand command) {
        var cc = repository.findById(command.id(), CustomCodeEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown custom code: " + command.id()));
        if (cc.usedElementIds().contains(command.elementId())) return;
        var ids = new ArrayList<>(cc.usedElementIds());
        ids.add(command.elementId());
        repository.save(cc.toBuilder().usedElementIds(ids).build());
    }

    public void removeCustomCodeUse(EditorCommand command) {
        var cc = repository.findById(command.id(), CustomCodeEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown custom code: " + command.id()));
        repository.save(cc.toBuilder()
                .usedElementIds(AgentEditorCommands.without(cc.usedElementIds(), command.elementId())).build());
    }

    public void addModelField(EditorCommand command) {
        var model = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var fields = model.fields() == null ? List.<ModelFieldEntity>of() : model.fields();
        if (fields.stream().anyMatch(f -> f.id().equals(command.fieldId()))) return;
        var type = command.type() == null || command.type().isBlank()
                ? io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType.string
                : io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType.valueOf(command.type());
        var grown = new ArrayList<>(fields);
        grown.add(new ModelFieldEntity(command.fieldId(), command.name(), true, type,
                null, false, null, List.of()));
        repository.save(new ModelEntity(model.id(), model.name(), grown, model.validations(), null));
    }

    public void removeModelField(EditorCommand command) {
        var model = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var fields = model.fields() == null ? List.<ModelFieldEntity>of() : model.fields();
        repository.save(new ModelEntity(model.id(), model.name(),
                fields.stream().filter(f -> !f.id().equals(command.fieldId())).toList(),
                model.validations(), null));
        pruneMappingRulesReferencing(model.id(), command.fieldId());
    }

    /**
     * Points a field at a TYPE: a value object (with invariants), a pure Model, an enum, or a
     * basic type. Exactly one reference is kept; the rest are cleared.
     */
    public void setModelFieldType(EditorCommand command) {
        var model = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var fields = (model.fields() == null ? List.<ModelFieldEntity>of() : model.fields()).stream()
                .map(f -> {
                    if (!f.id().equals(command.fieldId())) return f;
                    boolean basic = false;
                    io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType type = f.type();
                    String modelRef = null;
                    boolean isEnum = false;
                    String enumRef = null;
                    String voRef = null;
                    String entRef = null;
                    switch (command.type() == null ? "primitive" : command.type()) {
                        case "value-object" -> voRef = command.targetId();
                        case "entity" -> entRef = command.targetId();
                        case "model" -> modelRef = command.targetId();
                        case "enum" -> { isEnum = true; enumRef = command.targetId(); }
                        default -> {
                            basic = true;
                            type = command.targetId() != null && !command.targetId().isBlank()
                                    ? io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType.valueOf(command.targetId())
                                    : (f.type() != null ? f.type() : io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType.string);
                        }
                    }
                    return new ModelFieldEntity(f.id(), f.name(), basic, type, modelRef, isEnum, enumRef,
                            f.validations(), f.piiClassification(), f.anonymizationStrategy(),
                            f.label(), f.priority(), f.identifier(), voRef, entRef, f.collection(), f.stereotype());
                })
                .toList();
        repository.save(new ModelEntity(model.id(), model.name(), fields, model.validations(), null));
    }

    /** Toggles a field's mandatory flag as a NotNull validation. */
    public void setModelFieldRequired(EditorCommand command) {
        var model = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var req = command.required() != null && command.required();
        var reqTypes = java.util.Set.of(
                io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelFieldValidationType.NotNull,
                io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelFieldValidationType.NotEmpty,
                io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelFieldValidationType.NotBlank);
        var fields = (model.fields() == null ? List.<ModelFieldEntity>of() : model.fields()).stream()
                .map(f -> {
                    if (!f.id().equals(command.fieldId())) return f;
                    var vals = new ArrayList<>(f.validations() == null
                            ? List.<io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldValidationEntity>of()
                            : f.validations());
                    boolean has = vals.stream().anyMatch(v -> reqTypes.contains(v.type()));
                    if (req && !has) {
                        vals.add(new io.mateu.modux.modeldrivengenerator.infra.out.persistence.file.ModelFieldValidationEntity(
                                java.util.UUID.randomUUID().toString(),
                                io.mateu.modux.modeldrivengenerator.domain.aggregates.model.vo.ModelFieldValidationType.NotNull,
                                null));
                    } else if (!req && has) {
                        vals = vals.stream().filter(v -> !reqTypes.contains(v.type()))
                                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
                    }
                    return new ModelFieldEntity(f.id(), f.name(), f.basicType(), f.type(), f.modelId(),
                            f.isEnum(), f.enumId(), vals, f.piiClassification(), f.anonymizationStrategy(),
                            f.label(), f.priority(), f.identifier(), f.valueObjectId(), f.entityId(),
                            f.collection(), f.stereotype());
                })
                .toList();
        repository.save(new ModelEntity(model.id(), model.name(), fields, model.validations(), null));
    }

    /** Toggles a field's multiplicity: a collection (List/Set) of its type, or a single value. */
    public void setModelFieldCollection(EditorCommand command) {
        var model = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var coll = command.collection() != null && command.collection();
        var fields = (model.fields() == null ? List.<ModelFieldEntity>of() : model.fields()).stream()
                .map(f -> f.id().equals(command.fieldId())
                        ? new ModelFieldEntity(f.id(), f.name(), f.basicType(), f.type(), f.modelId(),
                                f.isEnum(), f.enumId(), f.validations(), f.piiClassification(),
                                f.anonymizationStrategy(), f.label(), f.priority(), f.identifier(),
                                f.valueObjectId(), f.entityId(), coll, f.stereotype())
                        : f)
                .toList();
        repository.save(new ModelEntity(model.id(), model.name(), fields, model.validations(), null));
    }

    public void setModelField(EditorCommand command) {
        var model = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var fields = (model.fields() == null ? List.<ModelFieldEntity>of() : model.fields()).stream()
                .map(f -> f.id().equals(command.fieldId())
                        // Preserve type ref (value object / entity / model / enum), multiplicity and
                        // metadata; only name/basic-type change here.
                        ? new ModelFieldEntity(f.id(),
                                command.name() == null || command.name().isBlank() ? f.name() : command.name(),
                                f.basicType(),
                                command.type() == null || command.type().isBlank()
                                        ? f.type() : io.mateu.modux.modeldrivengenerator.domain.shared.FieldDataType.valueOf(command.type()),
                                f.modelId(), f.isEnum(), f.enumId(), f.validations(),
                                f.piiClassification(), f.anonymizationStrategy(),
                                f.label(), f.priority(), f.identifier(), f.valueObjectId(), f.entityId(),
                                f.collection(), f.stereotype())
                        : f)
                .toList();
        repository.save(new ModelEntity(model.id(), model.name(), fields, model.validations(), null));
    }

    /** Moves a field to another model; the rules that mapped it no longer apply and drop. */
    public void moveModelField(EditorCommand command) {
        var source = repository.findById(command.modelId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        var target = repository.findById(command.targetId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.targetId()));
        var moving = (source.fields() == null ? List.<ModelFieldEntity>of() : source.fields()).stream()
                .filter(f -> f.id().equals(command.fieldId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown field: " + command.fieldId()));
        var targetFields = target.fields() == null ? List.<ModelFieldEntity>of() : target.fields();
        if (targetFields.stream().anyMatch(f -> f.id().equals(moving.id()))) {
            throw new IllegalArgumentException(
                    "El modelo destino ya tiene un campo con id " + moving.id());
        }
        repository.save(new ModelEntity(source.id(), source.name(),
                source.fields().stream().filter(f -> !f.id().equals(moving.id())).toList(),
                source.validations(), null));
        var grown = new ArrayList<>(targetFields);
        grown.add(moving);
        repository.save(new ModelEntity(target.id(), target.name(), grown, target.validations(), null));
        pruneMappingRulesReferencing(source.id(), moving.id());
    }

    /** Drops every rule of the model's mappings that references the given field. */
    public void pruneMappingRulesReferencing(String modelId, String fieldId) {
        for (var mm : repository.findAllOfType(ModelMappingEntity.class)) {
            if (!modelId.equals(mm.sourceModelId()) && !modelId.equals(mm.targetModelId())) continue;
            var rules = mm.rules() == null ? List.<ModelMappingRuleEntity>of() : mm.rules();
            var kept = rules.stream()
                    .filter(r -> !fieldId.equals(r.sourceFieldId()) && !fieldId.equals(r.targetFieldId()))
                    .toList();
            if (kept.size() != rules.size()) {
                repository.save(mm.toBuilder().rules(kept).build());
            }
        }
    }

    public void addModelMappingRule(EditorCommand command) {
        var mm = repository.findById(command.id(), ModelMappingEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown mapping: " + command.id()));
        var rules = mm.rules() == null ? List.<ModelMappingRuleEntity>of() : mm.rules();
        if (rules.stream().anyMatch(r -> command.sourceId().equals(r.sourceFieldId())
                && command.targetId().equals(r.targetFieldId()))) return;
        var taken = rules.stream().map(ModelMappingRuleEntity::id).collect(java.util.stream.Collectors.toSet());
        var n = rules.size() + 1;
        while (taken.contains("mr-" + n)) n++;
        var grown = new ArrayList<>(rules);
        grown.add(new ModelMappingRuleEntity("mr-" + n, command.sourceId(), command.targetId(), List.of()));
        repository.save(mm.toBuilder().rules(grown).build());
    }

    public void removeModelMappingRule(EditorCommand command) {
        var mm = repository.findById(command.id(), ModelMappingEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown mapping: " + command.id()));
        var rules = mm.rules() == null ? List.<ModelMappingRuleEntity>of() : mm.rules();
        repository.save(mm.toBuilder()
                .rules(rules.stream().filter(r -> !r.id().equals(command.itemId())).toList())
                .build());
    }

    public void addModelMapping(EditorCommand command) {
        if (repository.findById(command.id(), ModelMappingEntity.class).isPresent()) return;
        repository.findById(command.sourceId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.sourceId()));
        repository.findById(command.targetId(), ModelEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.targetId()));
        repository.save(new ModelMappingEntity(command.id(), command.name(),
                command.sourceId(), command.targetId(), false, List.of()));
    }

    public void removeModelMapping(EditorCommand command) {
        repository.deleteAllById(List.of(command.id()), ModelMappingEntity.class);
    }

    /** A fresh empty data model, ready to be a viewmodel; fields grow in its form. */
    public void addModel(EditorCommand command) {
        if (repository.findById(command.id(), ModelEntity.class).isPresent()) return;
        repository.save(new ModelEntity(command.id(), command.name(), List.of(), List.of(), null));
    }

    /** Deletes the model and unlinks whoever used it as a viewmodel. */
    public void removeModel(EditorCommand command) {
        for (var pg : repository.findAllOfType(PageEntity.class)) {
            var pageModel = command.id().equals(pg.modelId());
            var content = pg.content() == null ? null : withoutComponentModel(pg.content(), command.id());
            if (pageModel || content != null) {
                repository.save(pg.toBuilder()
                        .modelId(pageModel ? null : pg.modelId())
                        .content(content != null ? content : pg.content())
                        .build());
            }
        }
        for (var app : repository.findAllOfType(UiAdapterEntity.class)) {
            if (command.id().equals(app.modelId())) {
                repository.save(app.toBuilder().modelId(null).build());
            }
        }
        repository.deleteAllById(List.of(command.id()), ModelEntity.class);
    }

    /** The content forest with every `modelId` reference to the model cleared; null if untouched. */
    static List<UiComponentNodeEntity> withoutComponentModel(List<UiComponentNodeEntity> items,
                                                                     String modelId) {
        var touched = false;
        var out = new ArrayList<UiComponentNodeEntity>();
        for (var it : items) {
            var children = it.children() == null ? List.<UiComponentNodeEntity>of() : it.children();
            var nested = withoutComponentModel(children, modelId);
            var hit = modelId.equals(it.modelId());
            if (hit || nested != null) {
                touched = true;
                out.add(it.toBuilder()
                        .modelId(hit ? null : it.modelId())
                        .children(nested != null ? nested : children)
                        .build());
            } else {
                out.add(it);
            }
        }
        return touched ? out : null;
    }

    /** The app's viewmodel (the orchestrator's state); null clears it. */
    public void setAppModel(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.modelId() != null && !command.modelId().isBlank()) {
            repository.findById(command.modelId(), ModelEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown model: " + command.modelId()));
        }
        repository.save(app.toBuilder()
                .modelId(command.modelId() == null || command.modelId().isBlank() ? null : command.modelId())
                .build());
    }

    /** CRUD: what opens a row / the new-record form — a page OR an app; nulls clear. */
    public void setCrudTarget(EditorCommand command, boolean detail) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        if (!"CRUD".equalsIgnoreCase(page.type() == null ? "" : page.type())) {
            throw new IllegalArgumentException("Solo un CRUD tiene detalle y formulario de alta");
        }
        var targetPage = command.targetId() == null || command.targetId().isBlank() ? null : command.targetId();
        var targetApp = command.toAppId() == null || command.toAppId().isBlank() ? null : command.toAppId();
        if (targetPage != null) {
            repository.findById(targetPage, PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + targetPage));
        }
        if (targetApp != null) {
            repository.findById(targetApp, UiAdapterEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + targetApp));
        }
        var pageRef = targetApp != null ? null : targetPage;
        repository.save(detail
                ? page.toBuilder().crudDetailPageId(pageRef).crudDetailAppId(targetApp).build()
                : page.toBuilder().crudCreatePageId(pageRef).crudCreateAppId(targetApp).build());
    }

    /** VIEW_EDITOR: the read-only view / the edit view; null clears. */
    public void setAppViewOrEdit(EditorCommand command, boolean view) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (app.appType() != io.mateu.modux.modeldrivengenerator.domain.aggregates.uiadapter.vo.UiAppType.VIEW_EDITOR) {
            throw new IllegalArgumentException("Solo un vista-editor tiene vista y edición");
        }
        var pageId = command.pageId() == null || command.pageId().isBlank() ? null : command.pageId();
        if (pageId != null) {
            repository.findById(pageId, PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + pageId));
        }
        repository.save(view
                ? app.toBuilder().viewPageId(pageId).build()
                : app.toBuilder().editPageId(pageId).build());
    }

    /** WIZARD: a new step — mapped to a page (targetId) or bare (itemId + label). */
    public void addPageWizardStep(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var targetId = command.targetId() == null || command.targetId().isBlank() ? null : command.targetId();
        PageEntity mapped = null;
        if (targetId != null) {
            mapped = repository.findById(targetId, PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.targetId()));
            if (page.id().equals(mapped.id())) {
                throw new IllegalArgumentException("Un wizard no puede contenerse a sí mismo");
            }
        }
        var steps = new ArrayList<>(page.wizardSteps() == null
                ? List.<PageWizardStepEntity>of() : page.wizardSteps());
        if (targetId != null && steps.stream().anyMatch(s -> targetId.equals(s.pageId()))) return;
        var id = command.itemId() != null && !command.itemId().isBlank()
                ? command.itemId() : "wzs-" + (steps.size() + 1) + "-" + Math.abs(page.id().hashCode() % 1000);
        if (steps.stream().anyMatch(s -> id.equals(s.key()))) return;
        steps.add(new PageWizardStepEntity(targetId,
                command.label() != null ? command.label()
                        : mapped != null ? mapped.name() : "Paso " + (steps.size() + 1),
                id));
        repository.save(withWizardSteps(page, steps));
    }

    /** WIZARD: maps (or, with null, unmaps) the step onto the page implementing it. */
    public void setWizardStepPage(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var targetId = command.targetId() == null || command.targetId().isBlank() ? null : command.targetId();
        if (targetId != null) {
            if (page.id().equals(targetId)) {
                throw new IllegalArgumentException("Un wizard no puede contenerse a sí mismo");
            }
            repository.findById(targetId, PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + targetId));
        }
        var found = false;
        var steps = new ArrayList<PageWizardStepEntity>();
        for (var s : page.wizardSteps() == null ? List.<PageWizardStepEntity>of() : page.wizardSteps()) {
            if (command.itemId().equals(s.key())) {
                found = true;
                steps.add(new PageWizardStepEntity(targetId, s.label(), s.id()));
            } else {
                steps.add(s);
            }
        }
        if (!found) throw new IllegalArgumentException("Unknown wizard step: " + command.itemId());
        repository.save(withWizardSteps(page, steps));
    }

    public void removePageWizardStep(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var steps = (page.wizardSteps() == null ? List.<PageWizardStepEntity>of() : page.wizardSteps()).stream()
                .filter(s -> !command.targetId().equals(s.key()))
                .toList();
        repository.save(withWizardSteps(page, steps));
    }

    /** WIZARD: re-slots the step `targetId` before `beforeItemId` (append when null). */
    public void movePageWizardStep(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var steps = page.wizardSteps() == null ? List.<PageWizardStepEntity>of() : page.wizardSteps();
        var moving = steps.stream().filter(s -> command.targetId().equals(s.key())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown wizard step: " + command.targetId()));
        var rest = new ArrayList<>(steps.stream()
                .filter(s -> !command.targetId().equals(s.key())).toList());
        var at = command.beforeItemId() == null ? -1
                : java.util.stream.IntStream.range(0, rest.size())
                        .filter(i -> command.beforeItemId().equals(rest.get(i).key()))
                        .findFirst().orElse(-1);
        if (at < 0) rest.add(moving); else rest.add(at, moving);
        repository.save(withWizardSteps(page, rest));
    }

    /** Record copy with only wizardSteps replaced. */
    static PageEntity withWizardSteps(PageEntity page, List<PageWizardStepEntity> steps) {
        return page.toBuilder().wizardSteps(steps).build();
    }

    /** Removing an app also unlinks it from every actor that used it. */
    public void deleteUiApp(EditorCommand command) {
        repository.findAllOfType(RoleEntity.class).stream()
                .filter(r -> r.uiAdapterIds().contains(command.id()))
                .forEach(r -> repository.save(r.withUiAdapterIds(
                        AgentEditorCommands.without(r.uiAdapterIds(), command.id()))));
        // the bounded context that owned the app lets go of it
        repository.findAllOfType(BoundedContextEntity.class).stream()
                .filter(m -> m.uiAdapterIds().contains(command.id()))
                .forEach(m -> repository.save(m.toBuilder()
                        .uiAdapterIds(AgentEditorCommands.without(m.uiAdapterIds(), command.id())).build()));
        // menu entries of OTHER apps pointing at this one lose their target, not their place
        for (var other : repository.findAllOfType(UiAdapterEntity.class)) {
            if (other.id().equals(command.id())) continue;
            var cleared = withoutMenuAppRefs(other.menuItems(), command.id());
            if (cleared != null) repository.save(withMenuItems(other, cleared));
            var reloaded = repository.findById(other.id(), UiAdapterEntity.class).orElse(other);
            if (command.id().equals(reloaded.homeAppId())) {
                repository.save(reloaded.toBuilder().homeAppId(null).build());
            }
        }
        // CRUDs pointing at the deleted app (detail/create) lose the ref
        for (var pg : repository.findAllOfType(PageEntity.class)) {
            if (command.id().equals(pg.crudDetailAppId()) || command.id().equals(pg.crudCreateAppId())) {
                repository.save(pg.toBuilder()
                        .crudDetailAppId(command.id().equals(pg.crudDetailAppId()) ? null : pg.crudDetailAppId())
                        .crudCreateAppId(command.id().equals(pg.crudCreateAppId()) ? null : pg.crudCreateAppId())
                        .build());
            }
        }
        repository.deleteAllById(List.of(command.id()), UiAdapterEntity.class);
    }

    /** The tree with every reference to the given app cleared, or null when there were none. */
    static List<UiMenuItemEntity> withoutMenuAppRefs(List<UiMenuItemEntity> items,
                                                             String appId) {
        if (items == null) return null;
        var changed = false;
        var copy = new ArrayList<UiMenuItemEntity>();
        for (var item : items) {
            var clearedChildren = withoutMenuAppRefs(item.children(), appId);
            var hit = appId.equals(item.uiAdapterId());
            if (hit || clearedChildren != null) changed = true;
            copy.add(new UiMenuItemEntity(item.label(), item.icon(), item.description(),
                    item.route(), item.pageId(),
                    clearedChildren != null ? clearedChildren
                            : item.children() == null ? List.of() : item.children(),
                    item.id(), hit ? null : item.uiAdapterId(), item.useCaseId(),
                    item.aggregateId(), item.queryServiceId(), item.queryOperationId()));
        }
        return changed ? copy : null;
    }

    public void createUiPage(EditorCommand command) {
        if (repository.findById(command.id(), PageEntity.class).isPresent()) return;
        var type = command.pageType() == null || command.pageType().isBlank()
                ? "PAGE" : command.pageType();
        repository.save(PageEntity.builder()
                .id(command.id()).name(command.name()).route("/" + command.id()).type(type)
                .componentIds(List.of()).toolbar(List.of()).bottomBar(List.of())
                .triggers(List.of()).rules(List.of()).validations(List.of())
                .fieldConfigs(List.of()).wizardSteps(List.of()).completionActions(List.of())
                .content(List.of())
                .build());
        if (command.appId() == null || command.appId().isBlank()) return;
        // Born reachable: the page hangs from the app's menu right away.
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        var label = command.menuLabel() == null || command.menuLabel().isBlank()
                ? command.name() : command.menuLabel();
        var items = new ArrayList<>(app.menuItems() == null
                ? List.<UiMenuItemEntity>of() : app.menuItems());
        items.add(new UiMenuItemEntity(label, null, null, null, command.id(), List.of()));
        repository.save(withMenuItems(app, items));
    }

    /** Removing a page also drops every menu entry pointing at it, in any app at any depth. */
    public void deleteUiPage(EditorCommand command) {
        for (var app : repository.findAllOfType(UiAdapterEntity.class)) {
            var items = app.menuItems() == null ? List.<UiMenuItemEntity>of() : app.menuItems();
            var pruned = withoutMenuEntriesFor(items, command.id());
            var header = command.id().equals(app.headerPageId()) ? null : app.headerPageId();
            var home = command.id().equals(app.homePageId()) ? null : app.homePageId();
            if (!pruned.equals(items)
                    || !java.util.Objects.equals(header, app.headerPageId())
                    || !java.util.Objects.equals(home, app.homePageId())) {
                repository.save(app.toBuilder()
                        .menuItems(pruned).headerPageId(header).homePageId(home)
                        .build());
            }
        }
        // CRUDs pointing at the deleted page (detail/create) and view-editors lose the ref
        for (var pg : repository.findAllOfType(PageEntity.class)) {
            if (pg.id().equals(command.id())) continue;
            if (command.id().equals(pg.crudDetailPageId()) || command.id().equals(pg.crudCreatePageId())) {
                repository.save(pg.toBuilder()
                        .crudDetailPageId(command.id().equals(pg.crudDetailPageId()) ? null : pg.crudDetailPageId())
                        .crudCreatePageId(command.id().equals(pg.crudCreatePageId()) ? null : pg.crudCreatePageId())
                        .build());
            }
        }
        for (var app : repository.findAllOfType(UiAdapterEntity.class)) {
            if (command.id().equals(app.viewPageId()) || command.id().equals(app.editPageId())) {
                repository.save(app.toBuilder()
                        .viewPageId(command.id().equals(app.viewPageId()) ? null : app.viewPageId())
                        .editPageId(command.id().equals(app.editPageId()) ? null : app.editPageId())
                        .build());
            }
        }
        // wizard steps mapped to the deleted page survive, unmapped
        for (var pg : repository.findAllOfType(PageEntity.class)) {
            if (pg.id().equals(command.id()) || pg.wizardSteps() == null) continue;
            var touched = pg.wizardSteps().stream().anyMatch(s -> command.id().equals(s.pageId()));
            if (touched) {
                repository.save(withWizardSteps(pg, pg.wizardSteps().stream()
                        .map(s -> command.id().equals(s.pageId())
                                ? new PageWizardStepEntity(null, s.label(), s.key())
                                : s)
                        .toList()));
            }
        }
        repository.deleteAllById(List.of(command.id()), PageEntity.class);
    }

    public void addMenuItem(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        var items = app.menuItems() == null ? List.<UiMenuItemEntity>of() : app.menuItems();
        var entry = new UiMenuItemEntity(command.label(), null, null, null,
                command.pageId(), List.of(),
                command.itemId() != null ? command.itemId() : newMenuItemId(items, command.label()));
        var hasParent = (command.parentId() != null && !command.parentId().isBlank())
                || (command.parentLabel() != null && !command.parentLabel().isBlank());
        if (!hasParent) {
            var copy = new ArrayList<>(items);
            copy.add(entry);
            repository.save(withMenuItems(app, copy));
            return;
        }
        var inserted = insertedUnderParent(items, command.parentId(), command.parentLabel(), entry);
        if (inserted == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.parentId() != null ? command.parentId() : command.parentLabel()));
        }
        repository.save(withMenuItems(app, inserted));
    }

    public void removeMenuItem(EditorCommand command) {
        repository.findById(command.appId(), UiAdapterEntity.class).ifPresent(app -> {
            var pruned = withoutFirstMatching(app.menuItems(), command.itemId(), command.label());
            if (pruned != null) {
                repository.save(withMenuItems(app, pruned));
            }
        });
    }

    /** Points a menu entry at an APP — an app is just another UI component, like a page. */
    public void setMenuApp(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.toAppId() != null) {
            repository.findById(command.toAppId(), UiAdapterEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.toAppId()));
        }
        var updated = withMenuTarget(app.menuItems(), command.itemId(), command.label(),
                item -> retargeted(item, null, command.toAppId(), null, null, null, null));
        if (updated == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.itemId() != null ? command.itemId() : command.label()));
        }
        repository.save(withMenuItems(app, updated));
    }



    /** Points a menu entry at a USE CASE — third kind of target, same exclusivity. */
    public void setMenuUseCase(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.useCaseId() != null) {
            repository.findById(command.useCaseId(), UseCaseEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown use case: " + command.useCaseId()));
        }
        var updated = withMenuTarget(app.menuItems(), command.itemId(), command.label(),
                item -> retargeted(item, null, null, command.useCaseId(), null, null, null));
        if (updated == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.itemId() != null ? command.itemId() : command.label()));
        }
        repository.save(withMenuItems(app, updated));
    }

    /** Points a menu entry at an AGGREGATE — a CRUD over it is inferred downstream. */
    public void setMenuAggregate(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.aggregateId() != null) {
            repository.findById(command.aggregateId(), AggregateEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown aggregate: " + command.aggregateId()));
        }
        var updated = withMenuTarget(app.menuItems(), command.itemId(), command.label(),
                item -> retargeted(item, null, null, null, command.aggregateId(), null, null));
        if (updated == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.itemId() != null ? command.itemId() : command.label()));
        }
        repository.save(withMenuItems(app, updated));
    }

    /** Points a menu entry at a QUERY SERVICE OPERATION — a filtered listing is inferred. */
    public void setMenuQueryOperation(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.queryOperationId() != null) {
            var service = repository.findById(command.queryServiceId(), QueryServiceEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown query service: " + command.queryServiceId()));
            var known = (service.operations() == null ? List.<QueryOperationEntity>of() : service.operations())
                    .stream().anyMatch(op -> command.queryOperationId().equals(op.id()));
            if (!known) {
                throw new IllegalArgumentException("Unknown query operation: "
                        + command.queryOperationId() + " en " + command.queryServiceId());
            }
        }
        var updated = withMenuTarget(app.menuItems(), command.itemId(), command.label(),
                item -> retargeted(item, null, null, null, null,
                        command.queryOperationId() == null ? null : command.queryServiceId(),
                        command.queryOperationId()));
        if (updated == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.itemId() != null ? command.itemId() : command.label()));
        }
        repository.save(withMenuItems(app, updated));
    }

    /** Moves a menu entry (subtree included) to another app's menu root. */
    /**
     * Moves an entry (subtree included) anywhere in the menu forest: to another app,
     * under a parent entry (nesting — the parent becomes a grouper), to the root
     * (promotion), and into a concrete slot (`beforeItemId`). Same-app moves reorder.
     */
    public void moveMenuItem(EditorCommand command) {
        var source = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        var target = repository.findById(command.toAppId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.toAppId()));
        var entry = findMenuItem(source.menuItems(), command.itemId(), command.label());
        if (entry == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.itemId() != null ? command.itemId() : command.label()));
        }
        if (command.parentId() != null
                && findMenuItem(List.of(entry), command.parentId(), null) != null) {
            throw new IllegalArgumentException("Una opción no puede moverse dentro de sí misma");
        }
        var pruned = withoutFirstMatching(source.menuItems(), command.itemId(), command.label());
        repository.save(withMenuItems(source, pruned == null ? source.menuItems() : pruned));
        var reloaded = repository.findById(command.toAppId(), UiAdapterEntity.class).orElse(target);
        var items = reloaded.menuItems() == null
                ? List.<UiMenuItemEntity>of() : reloaded.menuItems();
        List<UiMenuItemEntity> placed = command.parentId() == null || command.parentId().isBlank()
                ? insertedMenu(items, entry, command.beforeItemId())
                : withMenuChildInserted(items, command.parentId(), entry, command.beforeItemId());
        if (placed == null) {
            throw new IllegalArgumentException("Unknown menu item: " + command.parentId());
        }
        repository.save(withMenuItems(reloaded, placed));
    }

    /** The list with `entry` inserted before `beforeId` (append when null or absent). */
    static List<UiMenuItemEntity> insertedMenu(List<UiMenuItemEntity> items,
                                                       UiMenuItemEntity entry, String beforeId) {
        var out = new ArrayList<>(items);
        var at = beforeId == null ? -1
                : java.util.stream.IntStream.range(0, out.size())
                        .filter(i -> beforeId.equals(out.get(i).id()))
                        .findFirst().orElse(-1);
        if (at < 0) out.add(entry); else out.add(at, entry);
        return out;
    }

    /** The forest with `entry` hung from the entry `parentId`, wherever it lives; null if absent. */
    static List<UiMenuItemEntity> withMenuChildInserted(List<UiMenuItemEntity> items,
                                                                String parentId,
                                                                UiMenuItemEntity entry,
                                                                String beforeId) {
        var out = new ArrayList<UiMenuItemEntity>();
        var found = false;
        for (var it : items) {
            if (parentId.equals(it.id())) {
                found = true;
                var children = it.children() == null ? List.<UiMenuItemEntity>of() : it.children();
                out.add(withChildren(it, insertedMenu(children, entry, beforeId)));
                continue;
            }
            var children = it.children() == null ? List.<UiMenuItemEntity>of() : it.children();
            var nested = withMenuChildInserted(children, parentId, entry, beforeId);
            if (nested != null) {
                found = true;
                out.add(withChildren(it, nested));
            } else {
                out.add(it);
            }
        }
        return found ? out : null;
    }


    static UiMenuItemEntity findMenuItem(List<UiMenuItemEntity> items,
                                                 String itemId, String label) {
        for (var item : items == null ? List.<UiMenuItemEntity>of() : items) {
            if (menuItemMatches(item, itemId, label)) return item;
            var hit = findMenuItem(item.children(), itemId, label);
            if (hit != null) return hit;
        }
        return null;
    }

    /** Points a menu entry (by stable id, or by label on pre-id entries) at a page. */
    public void setMenuPage(EditorCommand command) {
        var app = repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (command.pageId() != null) {
            repository.findById(command.pageId(), PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        }
        var updated = withMenuTarget(app.menuItems(), command.itemId(), command.label(),
                item -> retargeted(item, command.pageId(), null, null, null, null, null));
        if (updated == null) {
            throw new IllegalArgumentException(
                    "Unknown menu item: " + (command.itemId() != null ? command.itemId() : command.label()));
        }
        repository.save(withMenuItems(app, updated));
    }

    public void addPageButton(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var useCase = repository.findById(command.useCaseId(), UseCaseEntity.class)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unknown use case: " + command.useCaseId()));
        var label = command.label() == null || command.label().isBlank()
                ? useCase.name() : command.label();
        var bottom = "bottom".equalsIgnoreCase(command.type());
        var bar = new ArrayList<>((bottom ? page.bottomBar() : page.toolbar()) == null
                ? List.<PageButtonEntity>of() : (bottom ? page.bottomBar() : page.toolbar()));
        bar.add(new PageButtonEntity(label, null, command.useCaseId(), null, null));
        repository.save(bottom
                ? withButtons(page, page.toolbar(), bar)
                : withButtons(page, bar, page.bottomBar()));
    }

    public void removePageButton(EditorCommand command) {
        repository.findById(command.pageId(), PageEntity.class).ifPresent(page ->
                repository.save(withButtons(page,
                        withoutUseCaseButtons(page.toolbar(), command.useCaseId()),
                        withoutUseCaseButtons(page.bottomBar(), command.useCaseId()))));
    }

    public void setPageListing(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        if (command.queryServiceId() != null) {
            repository.findById(command.queryServiceId(), QueryServiceEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown query service: " + command.queryServiceId()));
        }
        repository.save(withListingQueryServiceId(page, command.queryServiceId()));
    }

    public void setPageModel(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        if (command.modelId() != null) {
            repository.findById(command.modelId(), ModelEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown model: " + command.modelId()));
        }
        repository.save(withModelId(page, command.modelId()));
    }

    /** Actor → app: the person opens the app (the actor→app link of the UI map). */
    public void addActorApp(EditorCommand command) {
        var role = repository.findById(command.actorId(), RoleEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown actor: " + command.actorId()));
        repository.findById(command.appId(), UiAdapterEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown UI app: " + command.appId()));
        if (role.uiAdapterIds().contains(command.appId())) return;
        repository.save(role.withUiAdapterIds(AgentEditorCommands.appended(role.uiAdapterIds(), command.appId())));
    }

    public void removeActorApp(EditorCommand command) {
        repository.findById(command.actorId(), RoleEntity.class).ifPresent(role ->
                repository.save(role.withUiAdapterIds(
                        AgentEditorCommands.without(role.uiAdapterIds(), command.appId()))));
    }

    /** Record copy with only menuItems replaced — every other field preserved verbatim. */
    static UiAdapterEntity withMenuItems(UiAdapterEntity app, List<UiMenuItemEntity> menuItems) {
        return app.toBuilder().menuItems(menuItems).build();
    }

    /** Record copy with only toolbar/bottomBar replaced — every other field preserved verbatim. */
    /**
     * The designer's field list: the viewmodel Model's fields, ordered by the page's
     * fieldConfigs (configured fields first, in config order), each merged with its config.
     */
    List<UiFieldDto> uiFields(PageEntity p) {
        if (p.modelId() == null) return List.of();
        var model = repository.findById(p.modelId(), ModelEntity.class).orElse(null);
        if (model == null || model.fields() == null) return List.of();
        var configs = p.fieldConfigs() == null ? List.<PageFieldConfigEntity>of() : p.fieldConfigs();
        // Authored YAML often declares fields by name only — the name is the identity then.
        var fieldById = new java.util.LinkedHashMap<String, ModelFieldEntity>();
        model.fields().forEach(f -> fieldById.put(f.id() != null ? f.id() : f.name(), f));
        var order = new ArrayList<String>();
        configs.forEach(c -> { if (fieldById.containsKey(c.fieldId()) && !order.contains(c.fieldId())) order.add(c.fieldId()); });
        fieldById.keySet().forEach(id -> { if (!order.contains(id)) order.add(id); });
        var configById = new java.util.HashMap<String, PageFieldConfigEntity>();
        configs.forEach(c -> configById.putIfAbsent(c.fieldId(), c));
        return order.stream().map(id -> {
            var f = fieldById.get(id);
            var c = configById.get(id);
            var type = f.basicType() ? String.valueOf(f.type()) : f.isEnum() ? "ENUM" : "MODEL";
            return new UiFieldDto(id, f.name(), type,
                    c == null ? null : c.stereotype(), c == null ? null : c.colspan(),
                    c == null ? null : c.label(), c == null ? null : c.help());
        }).toList();
    }

    public void setPageFieldConfig(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("No existe la página " + command.pageId()));
        var configs = new ArrayList<>(page.fieldConfigs() == null
                ? List.<PageFieldConfigEntity>of() : page.fieldConfigs());
        var index = -1;
        for (int i = 0; i < configs.size(); i++) {
            if (configs.get(i).fieldId().equals(command.fieldId())) index = i;
        }
        var previous = index >= 0 ? configs.get(index) : null;
        var next = new PageFieldConfigEntity(command.fieldId(), command.stereotype(), command.colspan(),
                previous == null ? null : previous.style(), previous == null ? null : previous.cssClass(),
                command.label(), previous == null ? null : previous.help());
        if (index >= 0) configs.set(index, next); else configs.add(next);
        repository.save(withFieldConfigs(page, configs));
    }

    public void setPageFieldOrder(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("No existe la página " + command.pageId()));
        var configById = new java.util.HashMap<String, PageFieldConfigEntity>();
        (page.fieldConfigs() == null ? List.<PageFieldConfigEntity>of() : page.fieldConfigs())
                .forEach(c -> configById.putIfAbsent(c.fieldId(), c));
        var configs = command.fieldIds().stream()
                .map(id -> configById.getOrDefault(id,
                        new PageFieldConfigEntity(id, null, null, null, null, null, null)))
                .toList();
        repository.save(withFieldConfigs(page, configs));
    }

    // ---- page content tree -------------------------------------------------

    /**
     * Adds a node to the page's content tree: at the root, or appended to the children of
     * parentComponentId. A new tabLayout is seeded with two tabs so it is usable right away.
     */
    public void addPageComponent(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var kind = command.componentKind();
        if (!UiComponentNodeEntity.KINDS.contains(kind)) {
            throw new IllegalArgumentException("Unknown component kind: " + kind);
        }
        var node = newComponentNode(command.componentId(), kind);
        var content = page.content() == null
                ? List.<UiComponentNodeEntity>of() : page.content();
        if (command.parentComponentId() == null || command.parentComponentId().isBlank()) {
            requireTabRules(kind, null);
            repository.save(withContent(page, inserted(content, node, null)));
            return;
        }
        var parent = findComponent(content, command.parentComponentId());
        if (parent == null) {
            throw new IllegalArgumentException("Unknown component: " + command.parentComponentId());
        }
        requireTabRules(kind, parent.kind());
        repository.save(withContent(page,
                withChildInserted(content, command.parentComponentId(), node, null)));
    }

    /** A fresh node: everything null but id+kind — except tabLayouts, born with two tabs. */
    static UiComponentNodeEntity newComponentNode(String id, String kind) {
        var children = "tabLayout".equals(kind)
                ? List.of(
                        new UiComponentNodeEntity(id + "-tab-1", "tab", "Pestaña 1", null, null,
                                null, null, null, null, null, null, null, null, List.of()),
                        new UiComponentNodeEntity(id + "-tab-2", "tab", "Pestaña 2", null, null,
                                null, null, null, null, null, null, null, null, List.of()))
                : List.<UiComponentNodeEntity>of();
        return new UiComponentNodeEntity(id, kind, null, null, null,
                null, null, null, null, null, null, null, null, children);
    }

    /** tab ↔ tabLayout go together: a tabLayout only holds tabs, a tab only hangs from one. */
    static void requireTabRules(String kind, String parentKind) {
        if ("tabLayout".equals(parentKind) && !"tab".equals(kind)) {
            throw new IllegalArgumentException("A tabLayout only admits tab children");
        }
        if ("tab".equals(kind) && !"tabLayout".equals(parentKind)) {
            throw new IllegalArgumentException("A tab can only hang from a tabLayout");
        }
    }

    /** Prunes the node — subtree included — from the page's content tree. */
    public void removePageComponent(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var pruned = withoutComponent(page.content(), command.componentId());
        if (pruned == null) {
            throw new IllegalArgumentException("Unknown component: " + command.componentId());
        }
        repository.save(withContent(page, pruned));
    }

    /**
     * Replaces the node's configuration with the given values (null clears), keeping
     * id, kind and children. References are validated when present.
     */
    public void setPageComponent(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        if (command.useCaseId() != null) {
            repository.findById(command.useCaseId(), UseCaseEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown use case: " + command.useCaseId()));
        }
        if (command.modelId() != null) {
            repository.findById(command.modelId(), ModelEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown model: " + command.modelId()));
        }
        if (command.mappingId() != null) {
            repository.findById(command.mappingId(), ModelMappingEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown mapping: " + command.mappingId()));
        }
        if (command.queryServiceId() != null) {
            repository.findById(command.queryServiceId(), QueryServiceEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown query service: " + command.queryServiceId()));
        }
        if (command.detailPageId() != null) {
            repository.findById(command.detailPageId(), PageEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown detail page: " + command.detailPageId()));
        }
        var updated = withComponentReplaced(page.content(), command.componentId(),
                node -> node.toBuilder()
                        .title(command.title()).text(command.text()).label(command.label())
                        .useCaseId(command.useCaseId()).mappingId(command.mappingId())
                        .modelId(command.modelId())
                        .queryServiceId(command.queryServiceId())
                        .queryOperationId(command.queryOperationId())
                        .fieldId(command.fieldId()).stereotype(command.stereotype())
                        .colspan(command.colspan())
                        .detailPageId(command.detailPageId())
                        .build());
        if (updated == null) {
            throw new IllegalArgumentException("Unknown component: " + command.componentId());
        }
        repository.save(withContent(page, updated));
    }

    /**
     * Moves a node (subtree included) under toParentId — or to the root — before
     * beforeComponentId, or to the end. A node never moves into its own subtree.
     */
    public void movePageComponent(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        var node = findComponent(page.content(), command.componentId());
        if (node == null) {
            throw new IllegalArgumentException("Unknown component: " + command.componentId());
        }
        var toParentId = command.parentComponentId();
        var toRoot = toParentId == null || toParentId.isBlank();
        if (!toRoot && findComponent(List.of(node), toParentId) != null) {
            throw new IllegalArgumentException(
                    "A component cannot move into its own subtree: " + command.componentId());
        }
        var pruned = withoutComponent(page.content(), command.componentId());
        if (toRoot) {
            requireTabRules(node.kind(), null);
            repository.save(withContent(page,
                    inserted(pruned, node, command.beforeComponentId())));
            return;
        }
        var parent = findComponent(pruned, toParentId);
        if (parent == null) {
            throw new IllegalArgumentException("Unknown component: " + toParentId);
        }
        requireTabRules(node.kind(), parent.kind());
        repository.save(withContent(page,
                withChildInserted(pruned, toParentId, node, command.beforeComponentId())));
    }

    static UiComponentNodeEntity findComponent(List<UiComponentNodeEntity> nodes, String id) {
        for (var node : nodes == null ? List.<UiComponentNodeEntity>of() : nodes) {
            if (id.equals(node.id())) return node;
            var hit = findComponent(node.children(), id);
            if (hit != null) return hit;
        }
        return null;
    }

    /** The siblings with the node inserted before beforeId (or at the end when null/absent). */
    static List<UiComponentNodeEntity> inserted(List<UiComponentNodeEntity> siblings,
                                                        UiComponentNodeEntity node, String beforeId) {
        var copy = new ArrayList<>(siblings == null ? List.<UiComponentNodeEntity>of() : siblings);
        var at = copy.size();
        if (beforeId != null) {
            for (int i = 0; i < copy.size(); i++) {
                if (beforeId.equals(copy.get(i).id())) { at = i; break; }
            }
        }
        copy.add(at, node);
        return copy;
    }

    /** The tree with the child inserted into the given parent's children, or null when not found. */
    static List<UiComponentNodeEntity> withChildInserted(List<UiComponentNodeEntity> nodes,
                                                                 String parentId,
                                                                 UiComponentNodeEntity child,
                                                                 String beforeId) {
        return withComponentReplaced(nodes, parentId,
                parent -> withNodeChildren(parent, inserted(parent.children(), child, beforeId)));
    }

    /** The tree without the given node (subtree included), or null when it was not found. */
    static List<UiComponentNodeEntity> withoutComponent(List<UiComponentNodeEntity> nodes,
                                                                String id) {
        if (nodes == null) return null;
        for (int i = 0; i < nodes.size(); i++) {
            var node = nodes.get(i);
            if (id.equals(node.id())) {
                var copy = new ArrayList<>(nodes);
                copy.remove(i);
                return copy;
            }
            var prunedChildren = withoutComponent(node.children(), id);
            if (prunedChildren != null) {
                var copy = new ArrayList<>(nodes);
                copy.set(i, withNodeChildren(node, prunedChildren));
                return copy;
            }
        }
        return null;
    }

    /** The tree with the given node replaced by edit(node), or null when it was not found. */
    static List<UiComponentNodeEntity> withComponentReplaced(
            List<UiComponentNodeEntity> nodes, String id,
            java.util.function.UnaryOperator<UiComponentNodeEntity> edit) {
        if (nodes == null) return null;
        for (int i = 0; i < nodes.size(); i++) {
            var node = nodes.get(i);
            if (id.equals(node.id())) {
                var copy = new ArrayList<>(nodes);
                copy.set(i, edit.apply(node));
                return copy;
            }
            var editedChildren = withComponentReplaced(node.children(), id, edit);
            if (editedChildren != null) {
                var copy = new ArrayList<>(nodes);
                copy.set(i, withNodeChildren(node, editedChildren));
                return copy;
            }
        }
        return null;
    }

    /** Record copy with only children replaced — every other field preserved verbatim. */
    static UiComponentNodeEntity withNodeChildren(UiComponentNodeEntity node,
                                                          List<UiComponentNodeEntity> children) {
        return node.toBuilder().children(children).build();
    }

    public void renameUiPage(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        repository.save(page.toBuilder().name(command.name()).build());
    }

    public void setPageType(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        repository.save(page.toBuilder().type(command.pageType()).build());
    }

    public void setPageRoute(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        repository.save(page.toBuilder().route(command.path()).build());
    }

    /** Edits an existing toolbar/bottomBar button (matched by useCaseId): label and mapping. */
    public void setPageButton(EditorCommand command) {
        var page = repository.findById(command.pageId(), PageEntity.class)
                .orElseThrow(() -> new IllegalArgumentException("Unknown page: " + command.pageId()));
        if (command.mappingId() != null) {
            repository.findById(command.mappingId(), ModelMappingEntity.class)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown mapping: " + command.mappingId()));
        }
        java.util.function.Function<List<PageButtonEntity>, List<PageButtonEntity>> edit = buttons ->
                (buttons == null ? List.<PageButtonEntity>of() : buttons).stream()
                        .map(b -> command.useCaseId().equals(b.useCaseId())
                                ? new PageButtonEntity(
                                        command.label() != null && !command.label().isBlank()
                                                ? command.label() : b.label(),
                                        b.icon(), b.useCaseId(), b.actionId(), command.mappingId())
                                : b)
                        .toList();
        repository.save(withButtons(page, edit.apply(page.toolbar()), edit.apply(page.bottomBar())));
    }

    /** Record copy with only fieldConfigs replaced — every other field preserved verbatim. */
    static PageEntity withFieldConfigs(PageEntity p, List<PageFieldConfigEntity> fieldConfigs) {
        return p.toBuilder().fieldConfigs(fieldConfigs).build();
    }

    static PageEntity withButtons(PageEntity p, List<PageButtonEntity> toolbar,
                                          List<PageButtonEntity> bottomBar) {
        return p.toBuilder().toolbar(toolbar).bottomBar(bottomBar).build();
    }

    /** Record copy with only listingQueryServiceId replaced — every other field preserved verbatim. */
    static PageEntity withListingQueryServiceId(PageEntity p, String listingQueryServiceId) {
        return p.toBuilder().listingQueryServiceId(listingQueryServiceId).build();
    }

    /** Record copy with only modelId replaced — every other field preserved verbatim. */
    static PageEntity withModelId(PageEntity p, String modelId) {
        return p.toBuilder().modelId(modelId).build();
    }

    /** Record copy with only content replaced — every other field preserved verbatim. */
    static PageEntity withContent(PageEntity p, List<UiComponentNodeEntity> content) {
        return p.toBuilder().content(content).build();
    }

    static List<PageButtonEntity> withoutUseCaseButtons(List<PageButtonEntity> buttons,
                                                                String useCaseId) {
        if (buttons == null) return List.of();
        return buttons.stream().filter(b -> !useCaseId.equals(b.useCaseId())).toList();
    }

    /** The menu tree without any entry (at any depth) pointing at the given page. */
    static List<UiMenuItemEntity> withoutMenuEntriesFor(List<UiMenuItemEntity> items,
                                                                String pageId) {
        if (items == null) return List.of();
        return items.stream()
                .filter(i -> !pageId.equals(i.pageId()))
                .map(i -> withChildren(i, withoutMenuEntriesFor(i.children(), pageId)))
                .toList();
    }

    /**
     * The tree with every entry carrying a UNIQUE stable id — null when it already does
     * (nothing to save then). Duplicates count as missing: the first keeps the id.
     */
    static List<UiMenuItemEntity> withMenuItemIds(List<UiMenuItemEntity> items,
                                                          java.util.Set<String> used) {
        if (items == null) return null;
        var changed = false;
        var copy = new ArrayList<UiMenuItemEntity>();
        for (var item : items) {
            var id = item.id();
            if (id == null || id.isBlank() || used.contains(id)) {
                id = null; // reassign below, uniquified against everything seen so far
            }
            if (id == null) {
                var base = "mi-" + (item.label() == null ? "entrada" : item.label()).toLowerCase()
                        .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
                id = base;
                for (var n = 2; used.contains(id); n++) id = base + "-" + n;
                changed = true;
            }
            used.add(id);
            var healedChildren = withMenuItemIds(item.children(), used);
            if (healedChildren != null) changed = true;
            var isGroup = item.children() != null && !item.children().isEmpty();
            if (isGroup && (item.pageId() != null || item.uiAdapterId() != null || item.useCaseId() != null
                    || item.aggregateId() != null || item.queryOperationId() != null)) {
                changed = true; // a parent is a pure grouper — legacy targets are dropped
            }
            copy.add(new UiMenuItemEntity(item.label(), item.icon(), item.description(),
                    item.route(), isGroup ? null : item.pageId(),
                    healedChildren != null ? healedChildren
                            : item.children() == null ? List.of() : item.children(),
                    id, isGroup ? null : item.uiAdapterId(), isGroup ? null : item.useCaseId(),
                    isGroup ? null : item.aggregateId(), isGroup ? null : item.queryServiceId(),
                    isGroup ? null : item.queryOperationId()));
        }
        return changed ? copy : null;
    }

    /** Entry identity: the stable id when both sides have one, the label for pre-id entries. */
    static boolean menuItemMatches(UiMenuItemEntity item, String itemId, String label) {
        if (itemId != null && !itemId.isBlank()) return itemId.equals(item.id());
        return label != null && label.equals(item.label());
    }

    /** A fresh stable id for a new entry: mi-<slug(label)>, uniquified within the app's tree. */
    static String newMenuItemId(List<UiMenuItemEntity> items, String label) {
        var used = new java.util.HashSet<String>();
        collectMenuItemIds(items, used);
        var base = "mi-" + (label == null ? "entrada" : label).toLowerCase()
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        var id = base;
        for (var n = 2; used.contains(id); n++) id = base + "-" + n;
        return id;
    }

    static void collectMenuItemIds(List<UiMenuItemEntity> items, java.util.Set<String> out) {
        for (var item : items == null ? List.<UiMenuItemEntity>of() : items) {
            if (item.id() != null) out.add(item.id());
            collectMenuItemIds(item.children(), out);
        }
    }

    /** Record copy with only children replaced — id and the rest preserved verbatim. */
    static UiMenuItemEntity withChildren(UiMenuItemEntity item,
                                                 List<UiMenuItemEntity> children) {
        return new UiMenuItemEntity(item.label(), item.icon(), item.description(), item.route(),
                item.pageId(), children, item.id(), item.uiAdapterId(), item.useCaseId(),
                item.aggregateId(), item.queryServiceId(), item.queryOperationId());
    }

    /**
     * The menu tree with the entry appended under the FIRST matching item (depth-first),
     * or null when nothing matches.
     */
    static List<UiMenuItemEntity> insertedUnderParent(List<UiMenuItemEntity> items,
                                                              String parentId, String parentLabel,
                                                              UiMenuItemEntity entry) {
        if (items == null) return null;
        for (var i = 0; i < items.size(); i++) {
            var item = items.get(i);
            var children = item.children() == null ? List.<UiMenuItemEntity>of() : item.children();
            List<UiMenuItemEntity> newChildren;
            if (menuItemMatches(item, parentId, parentLabel)) {
                newChildren = new ArrayList<>(children);
                newChildren.add(entry);
                // a parent is a pure grouper: gaining a submenu clears any target it had
                var copy = new ArrayList<>(items);
                copy.set(i, new UiMenuItemEntity(item.label(), item.icon(), item.description(),
                        item.route(), null, newChildren, item.id(), null, null, null, null, null));
                return copy;
            } else {
                newChildren = insertedUnderParent(children, parentId, parentLabel, entry);
            }
            if (newChildren != null) {
                var copy = new ArrayList<>(items);
                copy.set(i, withChildren(item, newChildren));
                return copy;
            }
        }
        return null;
    }

    /**
     * The menu tree without the FIRST matching item (depth-first), or null when nothing
     * matches (nothing to save then).
     */
    static List<UiMenuItemEntity> withoutFirstMatching(List<UiMenuItemEntity> items,
                                                               String itemId, String label) {
        if (items == null) return null;
        for (var i = 0; i < items.size(); i++) {
            var item = items.get(i);
            if (menuItemMatches(item, itemId, label)) {
                var copy = new ArrayList<>(items);
                copy.remove(i);
                return copy;
            }
            var newChildren = withoutFirstMatching(item.children(), itemId, label);
            if (newChildren != null) {
                var copy = new ArrayList<>(items);
                copy.set(i, withChildren(item, newChildren));
                return copy;
            }
        }
        return null;
    }

    /**
     * The tree with the FIRST matching item's target replaced — an entry opens/fires
     * exactly ONE thing, so every retarget lambda sets ITS target and nulls the rest;
     * null when nothing matches. Entries with a submenu are pure groupers: linking
     * them is rejected (linking = the lambda yields any non-null target).
     */
    static List<UiMenuItemEntity> withMenuTarget(
            List<UiMenuItemEntity> items, String itemId, String label,
            java.util.function.UnaryOperator<UiMenuItemEntity> retarget) {
        if (items == null) return null;
        for (var i = 0; i < items.size(); i++) {
            var item = items.get(i);
            if (menuItemMatches(item, itemId, label)) {
                var retargeted = retarget.apply(item);
                var links = retargeted.pageId() != null || retargeted.uiAdapterId() != null
                        || retargeted.useCaseId() != null || retargeted.aggregateId() != null
                        || retargeted.queryOperationId() != null;
                if (links && item.children() != null && !item.children().isEmpty()) {
                    throw new IllegalArgumentException(
                            "La entrada «" + item.label() + "» tiene submenú: no puede abrir nada");
                }
                var copy = new ArrayList<>(items);
                copy.set(i, retargeted);
                return copy;
            }
            var newChildren = withMenuTarget(item.children(), itemId, label, retarget);
            if (newChildren != null) {
                var copy = new ArrayList<>(items);
                copy.set(i, withChildren(item, newChildren));
                return copy;
            }
        }
        return null;
    }

    /** The item retargeted: one target set, every other cleared. */
    static UiMenuItemEntity retargeted(UiMenuItemEntity item, String pageId, String appId,
                                               String useCaseId, String aggregateId,
                                               String queryServiceId, String queryOperationId) {
        return new UiMenuItemEntity(item.label(), item.icon(), item.description(), item.route(),
                pageId, item.children(), item.id(), appId, useCaseId,
                aggregateId, queryServiceId, queryOperationId);
    }

    /** Record copy with only externalSystems replaced — every other field preserved verbatim. */
}
