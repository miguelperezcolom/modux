package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.out.persistence;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>
<#assign visibleFields = safeFields?filter(f -> f.searchable || f.visible)>
<#assign firstStringField = safeFields?filter(f -> f.type == "Wrapper" && (f.primitiveType == "string" || f.primitiveType == "email" || f.primitiveType == "url"))?first!"">
<#-- the listing search matches any text column (a status, a name…), not just the first one -->
<#assign searchFields = safeFields?filter(f -> f.type == "Wrapper" && (f.primitiveType == "string" || f.primitiveType == "email" || f.primitiveType == "url"))>
<#function selectColumns fields>
  <#assign cols = "">
  <#list fields as f>
    <#assign cols = cols + ', ' + f.columnName>
  </#list>
  <#return cols>
</#function>

import io.mateu.uidl.data.ListingData;
import io.mateu.uidl.data.Page;
import io.mateu.uidl.data.Pageable;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.${aggregate.name}QueryService;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.dto.${aggregate.name}Dto;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.dto.${aggregate.name}Row;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
<#if dataAccess == "JPA">

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ${aggregate.name}DBQueryService implements ${aggregate.name}QueryService {

    final ${aggregate.name}EntityRepository repository;
<#list (rowLookups!{})?keys as f>
    /** {@code ${f}} names another aggregate: the listing shows its label (lazy, so two listings can reference each other). */
    final org.springframework.beans.factory.ObjectProvider<${rowLookups[f]}> ${f}Labels;
</#list>

    @Override
    public String getLabel(String id) {
        return repository.findById(Long.valueOf(id))
<#if firstStringField?is_hash>
                .map(e -> e.get${firstStringField.name?cap_first}())
<#elseif safeFields?has_content>
                .map(e -> String.valueOf(e.get${safeFields?first.name?cap_first}()))
<#else>
                .map(e -> e.getId().toString())
</#if>
                .orElse("Unknown");
    }

    @Override
    public Optional<${aggregate.name}Dto> getById(String id) {
        return repository.findById(Long.valueOf(id)).map(this::toDto);
    }

    private ${aggregate.name}Dto toDto(${aggregate.name}Entity entity) {
        return new ${aggregate.name}Dto(
                entity.getId().toString()<#if safeFields?has_content>,</#if>
<#list safeFields as field>
    <#if field.type == "ValueObject">
                entity.get${field.name?cap_first}()<#sep>,</#sep>
    <#elseif field.type == "Entity">
                entity.get${field.name?cap_first}Id()<#sep>,</#sep>
    <#else>
        <#-- Pass native type directly — Dto has the correct type already -->
                entity.get${field.name?cap_first}()<#sep>,</#sep>
    </#if>
</#list>
        );
    }

    /** The label of the aggregate a reference names, or the id itself when it cannot be found. */
    private static String label(org.springframework.beans.factory.ObjectProvider<? extends ${project.packageName}.application.query.QueryService<?, ?, ?>> labels, Object id) {
        if (id == null || id.toString().isBlank()) return null;
        try {
            var label = labels.getObject().getLabel(id.toString());
            return label == null || "Unknown".equals(label) ? id.toString() : label;
        } catch (RuntimeException e) {
            return id.toString();
        }
    }

    /** A decimal as people read it: money with two decimals, anything else without trailing zeros. */
    private static String decimal(java.math.BigDecimal value, boolean money) {
        if (value == null) return null;
        return money ? value.setScale(2, java.math.RoundingMode.HALF_EVEN).toPlainString()
                : value.stripTrailingZeros().toPlainString();
    }

    private ${aggregate.name}Row toRow(${aggregate.name}Entity entity) {
        return new ${aggregate.name}Row(
                entity.getId().toString()<#if visibleFields?has_content>,</#if>
<#list visibleFields as field>
    <#if field.type == "Entity">
                entity.get${field.name?cap_first}Id()<#sep>,</#sep>
    <#elseif (rowLookups!{})[field.name]??>
                label(${field.name}Labels, entity.get${field.name?cap_first}())<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && field.primitiveType == "decimal">
                decimal(entity.get${field.name?cap_first}(), ${(field.money!false)?c})<#sep>,</#sep>
    <#else>
                entity.get${field.name?cap_first}() != null ? entity.get${field.name?cap_first}().toString() : null<#sep>,</#sep>
    </#if>
</#list>
        );
    }

    @Override
    public ListingData<${aggregate.name}Row> findAll(String searchText, Object filters, Pageable pageable) {
        var allEntities = repository.findAll();
        var filtered = allEntities.stream()
                .filter(e -> searchText == null || searchText.isBlank() || matchesSearch(e, searchText))
                .toList();
        var total = filtered.size();
        var paged = filtered.stream()
                .skip((long) pageable.page() * pageable.size())
                .limit(pageable.size())
                .map(this::toRow)
                .toList();
        return new ListingData<>(new Page<>(
                searchText,
                pageable.size(),
                pageable.page(),
                total,
                paged
        ));
    }

    private boolean matchesSearch(${aggregate.name}Entity entity, String searchText) {
        var lower = searchText.toLowerCase();
        return <#if searchFields?has_content><#list searchFields as f>(entity.get${f.name?cap_first}() != null
                && entity.get${f.name?cap_first}().toLowerCase().contains(lower))<#sep>
                || </#sep></#list><#else>entity.getId().toString().contains(lower)</#if>;
    }

}
<#else>

import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Objects;
import java.util.Optional;

/**
 * Read side over plain JDBC: filtering and pagination happen in SQL — the table is
 * never loaded into memory. The write side stays JPA (see ${aggregate.name}DBRepository).
 */
@Service
@RequiredArgsConstructor
public class ${aggregate.name}DBQueryService implements ${aggregate.name}QueryService {

    final JdbcTemplate jdbc;
<#list (rowLookups!{})?keys as f>
    /** {@code ${f}} names another aggregate: the listing shows its label (lazy, so two listings can reference each other). */
    final org.springframework.beans.factory.ObjectProvider<${rowLookups[f]}> ${f}Labels;
</#list>

    @Override
    public String getLabel(String id) {
        var rows = jdbc.query(
                "SELECT CAST(${firstStringField?is_hash?then(firstStringField.columnName, (safeFields?has_content)?then(safeFields?first.columnName, "id"))} AS varchar) FROM ${aggregate.tableName} WHERE id = ?",
                (rs, n) -> rs.getString(1), Long.valueOf(id));
        return rows.stream().findFirst().orElse("Unknown");
    }

    @Override
    public Optional<${aggregate.name}Dto> getById(String id) {
        var rows = jdbc.query(
                "SELECT id${selectColumns(safeFields)} FROM ${aggregate.tableName} WHERE id = ?",
                (rs, n) -> toDto(rs), Long.valueOf(id));
        return rows.stream().findFirst();
    }

    private ${aggregate.name}Dto toDto(ResultSet rs) throws SQLException {
        return new ${aggregate.name}Dto(
                String.valueOf(rs.getLong("id"))<#if safeFields?has_content>,</#if>
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

    /** The label of the aggregate a reference names, or the id itself when it cannot be found. */
    private static String label(org.springframework.beans.factory.ObjectProvider<? extends ${project.packageName}.application.query.QueryService<?, ?, ?>> labels, Object id) {
        if (id == null || id.toString().isBlank()) return null;
        try {
            var label = labels.getObject().getLabel(id.toString());
            return label == null || "Unknown".equals(label) ? id.toString() : label;
        } catch (RuntimeException e) {
            return id.toString();
        }
    }

    /** A decimal as people read it: money with two decimals, anything else without trailing zeros. */
    private static String decimal(java.math.BigDecimal value, boolean money) {
        if (value == null) return null;
        return money ? value.setScale(2, java.math.RoundingMode.HALF_EVEN).toPlainString()
                : value.stripTrailingZeros().toPlainString();
    }

    private ${aggregate.name}Row toRow(ResultSet rs) throws SQLException {
        return new ${aggregate.name}Row(
                String.valueOf(rs.getLong("id"))<#if visibleFields?has_content>,</#if>
<#list visibleFields as field>
    <#if (rowLookups!{})[field.name]??>
                label(${field.name}Labels, rs.getObject("${field.columnName}"))<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && (field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json")>
                rs.getString("${field.columnName}")<#sep>,</#sep>
    <#elseif field.type == "Wrapper" && field.primitiveType == "decimal">
                decimal(rs.getBigDecimal("${field.columnName}"), ${(field.money!false)?c})<#sep>,</#sep>
    <#else>
                Objects.toString(rs.getObject("${field.columnName}"), null)<#sep>,</#sep>
    </#if>
</#list>
        );
    }

    @Override
    public ListingData<${aggregate.name}Row> findAll(String searchText, Object filters, Pageable pageable) {
        var where = new StringBuilder();
        var params = new ArrayList<Object>();
        if (searchText != null && !searchText.isBlank()) {
<#if searchFields?has_content>
            where.append(" WHERE <#list searchFields as f>lower(CAST(${f.columnName} AS varchar)) LIKE ?<#sep> OR </#sep></#list>");
<#list searchFields as f>
            params.add("%" + searchText.toLowerCase() + "%");
</#list>
<#else>
            where.append(" WHERE lower(CAST(id AS varchar)) LIKE ?");
            params.add("%" + searchText.toLowerCase() + "%");
</#if>
        }
        var total = jdbc.queryForObject("SELECT COUNT(*) FROM ${aggregate.tableName}" + where,
                Integer.class, params.toArray());
        params.add(pageable.size());
        params.add((long) pageable.page() * pageable.size());
        var rows = jdbc.query(
                "SELECT id${selectColumns(visibleFields)} FROM ${aggregate.tableName}" + where + " ORDER BY id LIMIT ? OFFSET ?",
                (rs, n) -> toRow(rs), params.toArray());
        return new ListingData<>(new Page<>(
                searchText,
                pageable.size(),
                pageable.page(),
                total != null ? total : 0,
                rows
        ));
    }

}
</#if>
