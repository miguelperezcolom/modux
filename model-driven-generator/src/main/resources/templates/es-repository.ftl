package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.out.persistence;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>

import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.out.${aggregate.name}Repository;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name};
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
<#list safeFields as field>
    <#if field.type == "ValueObject">
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${field.name?cap_first};
    </#if>
</#list>
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Event-sourced implementation of {@link ${aggregate.name}Repository}. Every change is appended to the
 * ${aggregate.name} event store (the source of truth); a current-state snapshot is kept for reads and
 * the CRUD UI. {@code findById} folds the event stream via {@link ${aggregate.name}EventSourcing},
 * falling back to the snapshot until that fold is implemented.
 */
@Service
@RequiredArgsConstructor
public class ${aggregate.name}EventSourcedRepository implements ${aggregate.name}Repository {

    final ${aggregate.name}EntityRepository repository;
    final ${aggregate.name}EventAppender eventAppender;
    final ${aggregate.name}EventCodec eventCodec;
    final ${aggregate.name}EventSourcing eventSourcing;
<#if stateTopic??>
    final org.springframework.cloud.stream.function.StreamOperations stateStream;
    final com.fasterxml.jackson.databind.ObjectMapper stateMapper;
</#if>

    @Override
    public Optional<${aggregate.name}> findById(${aggregate.name}Id id) {
        var events = eventAppender.history(String.valueOf(id.value()));
        if (!events.isEmpty()) {
            var decoded = events.stream()
                    .map(e -> eventCodec.decode(e.getEventType(), e.getPayload()))
                    .toList();
            var rebuilt = eventSourcing.replay(id, decoded);
            if (rebuilt != null) {
                return Optional.of(rebuilt);
            }
        }
        // fall back to the current-state snapshot until the fold hook is implemented
        return repository.findById(id.value()).map(this::toDomain);
    }

    @Override
    public List<${aggregate.name}> findAll() {
        return repository.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public ${aggregate.name}Id save(${aggregate.name} domain) {
        var snapshot = repository.save(toEntity(domain));
        var id = new ${aggregate.name}Id(snapshot.getId());
        var events = eventSourcing.eventsOf(domain);
        if (events.isEmpty()) {
            // no domain events of its own: the history is the sequence of states it was saved in
            eventAppender.append(String.valueOf(snapshot.getId()), "${aggregate.name}Guardado", snapshot);
        }
        for (var event : events) {
            eventAppender.append(String.valueOf(snapshot.getId()), event);
        }
<#if stateTopic??>
        publishState(snapshot);
</#if>
        return id;
    }

    @Override
    public void deleteAllById(List<${aggregate.name}Id> selectedIds) {
        repository.deleteAllById(selectedIds.stream().map(${aggregate.name}Id::value).toList());
<#if deletedTopic??>
        selectedIds.forEach(selected -> publishDeleted(selected.value()));
</#if>
    }
<#if stateTopic??>

    /** This aggregate feeds a read model: its whole state travels on every change (event-carried state transfer). */
    private void publishState(${aggregate.name}Entity state) {
        try {
            stateStream.send("${stateTopic}", stateMapper.writeValueAsString(state));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize the state of ${aggregate.name}", e);
        }
    }

    /**
     * Rebuild of the read models fed by this aggregate: on startup the whole current state is
     * published again, so a consumer added later (or one that lost its data) catches up. The
     * consumers upsert by id, so publishing twice is harmless. Turn it off with
     * modux.state.republish-on-startup=false.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void republishStateOnStartup(org.springframework.boot.context.event.ApplicationReadyEvent ready) {
        if (!ready.getApplicationContext().getEnvironment()
                .getProperty("modux.state.republish-on-startup", Boolean.class, true)) return;
        repository.findAll().forEach(this::publishState);
    }

    private void publishDeleted(Object id) {
        stateStream.send("${deletedTopic}", "{\"id\":\"" + id + "\"}");
    }
</#if>

    private ${aggregate.name} toDomain(${aggregate.name}Entity entity) {
        return new ${aggregate.name}(
                new ${aggregate.name}Id(entity.getId()),
<#list safeFields as field>
    <#if field.type == "ValueObject">
        <#if field.isEnum>
                entity.get${field.name?cap_first}() != null ? ${field.name?cap_first}.valueOf(entity.get${field.name?cap_first}()) : null<#sep>,</#sep>
        <#else>
                new ${field.name?cap_first}(entity.get${field.name?cap_first}())<#sep>,</#sep>
        </#if>
    <#elseif field.type == "Entity">
                entity.get${field.name?cap_first}Id()<#sep>,</#sep>
    <#else>
                entity.get${field.name?cap_first}()<#sep>,</#sep>
    </#if>
</#list>
        );
    }

    private ${aggregate.name}Entity toEntity(${aggregate.name} domain) {
        return new ${aggregate.name}Entity(
                domain.getId() != null ? domain.getId().value() : null,
<#list safeFields as field>
    <#if field.type == "ValueObject">
        <#if field.isEnum>
                domain.get${field.name?cap_first}() != null ? domain.get${field.name?cap_first}().name() : null<#sep>,</#sep>
        <#else>
                domain.get${field.name?cap_first}() != null ? domain.get${field.name?cap_first}().value() : null<#sep>,</#sep>
        </#if>
    <#elseif field.type == "Entity">
                domain.get${field.name?cap_first}Id()<#sep>,</#sep>
    <#else>
                domain.get${field.name?cap_first}()<#sep>,</#sep>
    </#if>
</#list>
        );
    }
}
