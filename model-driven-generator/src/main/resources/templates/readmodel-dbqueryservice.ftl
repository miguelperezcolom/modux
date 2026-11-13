package ${project.packageName}.${module.slug}.infra.out.persistence;
<#assign declaresId = model?? && (model.fields![])?filter(f -> f.name == "id")?has_content>
<#function selectColumns fields>
  <#assign cols = "">
  <#list fields as f>
    <#assign cols = cols + f.columnName>
    <#if f?has_next>
      <#assign cols = cols + ", ">
    </#if>
  </#list>
  <#return cols>
</#function>

import ${project.packageName}.${module.slug}.application.query.${className}QueryService;
import ${project.packageName}.${module.slug}.application.query.readmodel.${className};
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
<#if dataAccess == "JPA">

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ${className}DBQueryService implements ${className}QueryService {

    final ${className}EntityRepository repository;

    @Override
    public Optional<${className}> getById(String id) {
        return repository.findById(id).map(this::toDto);
    }

    @Override
    public List<${className}> findAll() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    private ${className} toDto(${className}Entity entity) {
        return new ${className}(<#if !declaresId>entity.getId()<#if model?? && model.fields?has_content>,</#if></#if><#if model?? && model.fields?has_content>
<#list model.fields as field>
    <#if field.basicType>
                entity.get${field.name?cap_first}()<#sep>,</#sep>
    <#else>
                entity.get${field.name?cap_first}Id()<#sep>,</#sep>
    </#if>
</#list>
</#if>);
    }
}
<#else>

import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

/** Read side of the ${className} read model over plain JDBC (writes stay JPA in the projection). */
@Service
@RequiredArgsConstructor
public class ${className}DBQueryService implements ${className}QueryService {

    final JdbcTemplate jdbc;

    @Override
    public Optional<${className}> getById(String id) {
        var rows = jdbc.query("SELECT <#if !declaresId>id, </#if>${selectColumns(jdbcFields![])} FROM ${tableName} WHERE id = ?",
                (rs, n) -> toDto(rs), id);
        return rows.stream().findFirst();
    }

    @Override
    public List<${className}> findAll() {
        return jdbc.query("SELECT <#if !declaresId>id, </#if>${selectColumns(jdbcFields![])} FROM ${tableName}", (rs, n) -> toDto(rs));
    }

    private ${className} toDto(ResultSet rs) throws SQLException {
        return new ${className}(<#if !declaresId>rs.getString("id")<#if jdbcFields?? && jdbcFields?has_content>,</#if></#if><#if jdbcFields?? && jdbcFields?has_content>
<#list jdbcFields as field>
    <#if field.basicType>
        <#if field.primitiveType == "integer">
                rs.getObject("${field.columnName}", Integer.class)<#sep>,</#sep>
        <#elseif field.primitiveType == "decimal">
                rs.getBigDecimal("${field.columnName}")<#sep>,</#sep>
        <#elseif field.primitiveType == "bool">
                rs.getObject("${field.columnName}", Boolean.class)<#sep>,</#sep>
        <#elseif field.primitiveType == "date">
                rs.getObject("${field.columnName}", java.time.LocalDate.class)<#sep>,</#sep>
        <#elseif field.primitiveType == "time">
                rs.getObject("${field.columnName}", java.time.LocalTime.class)<#sep>,</#sep>
        <#elseif field.primitiveType == "datetime">
                rs.getObject("${field.columnName}", java.time.LocalDateTime.class)<#sep>,</#sep>
        <#else>
                rs.getString("${field.columnName}")<#sep>,</#sep>
        </#if>
    <#else>
                rs.getString("${field.columnName}")<#sep>,</#sep>
    </#if>
</#list>
</#if>);
    }
}
</#if>
