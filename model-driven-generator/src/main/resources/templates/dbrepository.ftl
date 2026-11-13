package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.out.persistence;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>
<#function selectColumns fields>
  <#assign cols = "">
  <#list fields as f>
    <#assign cols = cols + ', ' + f.columnName>
  </#list>
  <#return cols>
</#function>

import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.out.${aggregate.name}Repository;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name};
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
<#list safeFields as field>
    <#if field.type == "ValueObject">
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${field.name?cap_first};
    </#if>
</#list>
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
<#if dataAccess != "JPA">
import org.springframework.jdbc.core.JdbcTemplate;
</#if>
<#if dataAccess == "STORED_PROCEDURE">
import com.fasterxml.jackson.databind.ObjectMapper;
</#if>

import java.util.List;
import java.util.Optional;

/**
 * The repository port's adapter. Writes stay JPA (dirty checking, optimistic locking);
 * reads follow the ${dataAccess} strategy:
<#if dataAccess == "JPA">
 * plain JPA repositories.
<#elseif dataAccess == "JDBC">
 * plain JDBC (JdbcTemplate) — no Hibernate session on the read path.
<#else>
 * the generated stored procedure ${aggregate.name?lower_case}_get(bigint) when available
 * (Postgres), falling back to a plain JDBC select when it is not (e.g. local H2).
</#if>
 */
@Service
@RequiredArgsConstructor
public class ${aggregate.name}DBRepository implements ${aggregate.name}Repository {

    final ${aggregate.name}EntityRepository repository;
    final ApplicationEventPublisher domainEvents;
<#if stateTopic??>
    final org.springframework.cloud.stream.function.StreamOperations stateStream;
    final com.fasterxml.jackson.databind.ObjectMapper stateMapper;
</#if>
<#if dataAccess != "JPA">
    final JdbcTemplate jdbc;
</#if>
<#if dataAccess == "STORED_PROCEDURE">
    final ObjectMapper mapper;
    /** Set once the proc proves missing/unreadable — avoids paying an exception per read. */
    final java.util.concurrent.atomic.AtomicBoolean procMissing = new java.util.concurrent.atomic.AtomicBoolean(false);
</#if>

<#if dataAccess == "JPA">
    @Override
    public Optional<${aggregate.name}> findById(${aggregate.name}Id id) {
        return repository.findById(id.value()).map(this::toDomain);
    }

    @Override
    public List<${aggregate.name}> findAll() {
        return repository.findAll().stream().map(this::toDomain).toList();
    }
<#else>
    @Override
    public Optional<${aggregate.name}> findById(${aggregate.name}Id id) {
        return findEntityById(id.value()).map(this::toDomain);
    }

    @Override
    public List<${aggregate.name}> findAll() {
        return jdbc.query("SELECT id${selectColumns(safeFields)} FROM ${aggregate.tableName} ORDER BY id",
                        (rs, n) -> toEntity(rs))
                .stream().map(this::toDomain).toList();
    }

    private Optional<${aggregate.name}Entity> findEntityById(Long id) {
<#if dataAccess == "STORED_PROCEDURE">
        if (!procMissing.get()) {
            try {
                var json = jdbc.queryForObject("SELECT ${aggregate.name?lower_case}_get(?)::text",
                        String.class, id);
                if (json == null) return Optional.empty();
                return Optional.of(mapper.readValue(json, ${aggregate.name}Entity.class));
            } catch (org.springframework.dao.EmptyResultDataAccessException e) {
                return Optional.empty(); // no aggregate with that id
            } catch (Exception e) {
                // The proc is not there (or unreadable): plain JDBC from now on.
                procMissing.set(true);
            }
        }
</#if>
        var rows = jdbc.query("SELECT id${selectColumns(safeFields)} FROM ${aggregate.tableName} WHERE id = ?",
                (rs, n) -> toEntity(rs), id);
        return rows.stream().findFirst();
    }

    private ${aggregate.name}Entity toEntity(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ${aggregate.name}Entity(
                rs.getLong("id")<#if safeFields?has_content>,</#if>
<#list safeFields as field>
    <#if field.type == "Wrapper" && field.primitiveType == "integer">
                rs.getObject("${field.columnName}", Integer.class)<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && (field.primitiveType == "decimal" || field.primitiveType == "number" || field.primitiveType == "money")>
                rs.getBigDecimal("${field.columnName}")<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && field.primitiveType == "bool">
                rs.getObject("${field.columnName}", Boolean.class)<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && field.primitiveType == "date">
                rs.getObject("${field.columnName}", java.time.LocalDate.class)<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && field.primitiveType == "time">
                rs.getObject("${field.columnName}", java.time.LocalTime.class)<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && field.primitiveType == "datetime">
                rs.getObject("${field.columnName}", java.time.LocalDateTime.class)<#sep>,</#sep>
    <#else>
                rs.getString("${field.columnName}")<#sep>,</#sep>
    </#if>
</#list>
        );
    }
</#if>

    private ${aggregate.name} toDomain(${aggregate.name}Entity entity) {
        return new ${aggregate.name}(
                new ${aggregate.name}Id(entity.getId())<#if safeFields?has_content>,</#if>
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
                domain.getId() != null ? domain.getId().value() : null<#if safeFields?has_content>,</#if>
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

    @Override
    public ${aggregate.name}Id save(${aggregate.name} domain) {
<#if dataAccess == "JPA">
        var saved = repository.save(toEntity(domain));
<#else>
        // reads go through JDBC, not the persistence context: flush now, so a read later in this
        // same transaction (save, then findById) sees what was just written
        var saved = repository.saveAndFlush(toEntity(domain));
</#if>
        var id = new ${aggregate.name}Id(saved.getId());
<#if stateTopic??>
        publishState(saved);
</#if>
        // Domain events raised inside the aggregate (AggregateRoot.send) surface as Spring
        // application events on save — in-process policies subscribe with @EventListener.
        domain.popEvents().forEach(domainEvents::publishEvent);
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

}
