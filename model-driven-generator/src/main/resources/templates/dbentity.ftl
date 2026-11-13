<#-- the column of a field: the same snake_case the migrations write (corrigeA → col_corrige_a) -->
<#function col name><#return ("col_" + name)?replace("([a-z0-9])([A-Z])", "$1_$2", "r")?lower_case></#function>
package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.out.persistence;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>

<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false><#list safeFields as field><#if field.type == "Wrapper"><#if field.primitiveType == "date"><#assign hasDate = true></#if><#if field.primitiveType == "time"><#assign hasTime = true></#if><#if field.primitiveType == "datetime"><#assign hasDateTime = true></#if><#if field.primitiveType == "decimal"><#assign hasBigDecimal = true></#if></#if></#list>
<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "${aggregate.tableName}")
@AllArgsConstructor
@NoArgsConstructor
@Getter
public class ${aggregate.name}Entity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "${aggregate.name?lower_case}_seq_gen")
    @SequenceGenerator(
            name = "${aggregate.name?lower_case}_seq_gen",
            sequenceName = "${aggregate.name?lower_case}_sequence",
            allocationSize = 1
    )
    Long id;

<#list safeFields as field>
    <#if field.type == "Entity">
    @Column(name = "${col(field.name)}_id")
    String ${field.name}Id;
    <#elseif field.type == "ValueObject">
    @Column(name = "${col(field.name)}")
    String ${field.name};
    <#else>
        <#if field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json">
    @Column(name = "${col(field.name)}")
    String ${field.name};
        <#elseif field.primitiveType == "integer">
    @Column(name = "${col(field.name)}")
    Integer ${field.name};
        <#elseif field.primitiveType == "decimal">
    @Column(name = "${col(field.name)}")
    BigDecimal ${field.name};
        <#elseif field.primitiveType == "bool">
    @Column(name = "${col(field.name)}")
    Boolean ${field.name};
        <#elseif field.primitiveType == "date">
    @Column(name = "${col(field.name)}")
    LocalDate ${field.name};
        <#elseif field.primitiveType == "time">
    @Column(name = "${col(field.name)}")
    LocalTime ${field.name};
        <#elseif field.primitiveType == "datetime">
    @Column(name = "${col(field.name)}")
    LocalDateTime ${field.name};
        <#else>
    @Column(name = "${col(field.name)}")
    String ${field.name};
        </#if>
    </#if>
</#list>

}
