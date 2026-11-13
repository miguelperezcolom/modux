<#-- the column of a field: the same snake_case the migrations write (corrigeA → col_corrige_a) -->
<#function col name><#return ("col_" + name)?replace("([a-z0-9])([A-Z])", "$1_$2", "r")?lower_case></#function>
package ${project.packageName}.${module.slug}.infra.out.persistence;

<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false>
<#if model?? && model.fields?has_content>
<#list model.fields as field>
<#if field.basicType>
<#if field.type == "date"><#assign hasDate = true></#if>
<#if field.type == "time"><#assign hasTime = true></#if>
<#if field.type == "dateTime"><#assign hasDateTime = true></#if>
<#if field.type == "number" || field.type == "money"><#assign hasBigDecimal = true></#if>
</#if>
</#list>
</#if>
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "${tableName}")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ${className}Entity {

    @Id
    @Column(name = "id")
    String id;

<#if model?? && model.fields?has_content>
<#list model.fields as field>
    <#if field.basicType>
        <#if field.type == "string" || field.type == "json">
    @Column(name = "${col(field.name)}")
    String ${field.name};
        <#elseif field.type == "integer">
    @Column(name = "${col(field.name)}")
    Integer ${field.name};
        <#elseif field.type == "number" || field.type == "money">
    @Column(name = "${col(field.name)}")
    BigDecimal ${field.name};
        <#elseif field.type == "bool">
    @Column(name = "${col(field.name)}")
    Boolean ${field.name};
        <#elseif field.type == "date">
    @Column(name = "${col(field.name)}")
    LocalDate ${field.name};
        <#elseif field.type == "time">
    @Column(name = "${col(field.name)}")
    LocalTime ${field.name};
        <#elseif field.type == "dateTime">
    @Column(name = "${col(field.name)}")
    LocalDateTime ${field.name};
        <#else>
    @Column(name = "${col(field.name)}")
    String ${field.name};
        </#if>
    <#else>
    @Column(name = "${col(field.name)}_id")
    String ${field.name}Id;
    </#if>
</#list>
</#if>
}
