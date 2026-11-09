package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.in.ui.pages.${aggregate.name?lower_case};
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>
<#assign enumPackage = project.packageName + "." + module.name?lower_case?replace("[^a-z0-9]","",'r') + ".domain.aggregates." + aggregate.name?lower_case + ".vo.">
<#macro lookup field><#if lookups?? && lookups[field.name]??><#assign sup = lookups[field.name].suppliers>@io.mateu.uidl.annotations.Lookup(search = ${sup}IdOptionsSupplier.class, label = ${sup}IdLabelSupplier.class)</#if></#macro>
<#macro commandArg field><#if field.isEnum>${field.name} != null ? ${field.name}.name() : null<#else>${field.name}<#if field.type == "Entity">Id</#if></#if></#macro>

import io.mateu.uidl.annotations.HiddenInCreate;
import io.mateu.uidl.annotations.ReadOnly;
import io.mateu.uidl.interfaces.HttpRequest;
import io.mateu.uidl.interfaces.Identifiable;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.query.dto.${aggregate.name}Dto;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.create.Create${aggregate.name}Command;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.create.Create${aggregate.name}UseCase;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.update.Update${aggregate.name}Command;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.update.Update${aggregate.name}UseCase;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Scope;
import org.springframework.stereotype.Service;

<#assign hasDate = false><#assign hasTime = false><#assign hasDateTime = false><#assign hasBigDecimal = false><#list safeFields as field><#if field.type == "Wrapper"><#if field.primitiveType == "date"><#assign hasDate = true></#if><#if field.primitiveType == "time"><#assign hasTime = true></#if><#if field.primitiveType == "datetime"><#assign hasDateTime = true></#if><#if field.primitiveType == "decimal"><#assign hasBigDecimal = true></#if></#if></#list>
<#if hasDate>import java.time.LocalDate;
</#if><#if hasTime>import java.time.LocalTime;
</#if><#if hasDateTime>import java.time.LocalDateTime;
</#if><#if hasBigDecimal>import java.math.BigDecimal;
</#if>@Service
@Scope("prototype")
@RequiredArgsConstructor
public class ${aggregate.name}ViewModel implements Identifiable {

    @HiddenInCreate
    @ReadOnly
    String id;

<#list safeFields as field>
    <#if field.readonly>
    @ReadOnly
    </#if>
    <#if field.mandatory>
    <#if !field.isEnum && (field.type == "Entity" || field.type == "ValueObject" || (field.primitiveType!"string") == "string")>@NotEmpty<#else>@NotNull</#if>
    </#if>
    <#if field.label?has_content>
    @io.mateu.uidl.annotations.Label("${field.label}")
    </#if>
    <#if lookups?? && lookups[field.name]??>
    <@lookup field/>

    </#if>
    <#if field.isEnum>
    ${enumPackage}${field.name?cap_first} ${field.name};
    <#elseif field.type == "ValueObject" || field.type == "Entity">
    String ${field.name}<#if field.type == "Entity">Id</#if>;
    <#else>
        <#if field.primitiveType == "string" || field.primitiveType == "email" || field.primitiveType == "password" || field.primitiveType == "url" || field.primitiveType == "color" || field.primitiveType == "image" || field.primitiveType == "file" || field.primitiveType == "json">
    String ${field.name};
        <#elseif field.primitiveType == "integer">
    Integer ${field.name};
        <#elseif field.primitiveType == "decimal">
    BigDecimal ${field.name};
        <#elseif field.primitiveType == "bool">
    Boolean ${field.name};
        <#elseif field.primitiveType == "date">
    LocalDate ${field.name};
        <#elseif field.primitiveType == "time">
    LocalTime ${field.name};
        <#elseif field.primitiveType == "datetime">
    LocalDateTime ${field.name};
        <#else>
    String ${field.name};
        </#if>
    </#if>

</#list>
    final Create${aggregate.name}UseCase create${aggregate.name}UseCase;
    final Update${aggregate.name}UseCase update${aggregate.name}UseCase;

    public String create(HttpRequest httpRequest) {
        return create${aggregate.name}UseCase.handle(new Create${aggregate.name}Command(
<#list safeFields as field>
                <@commandArg field/><#sep>,</#sep>
</#list>
        ));
    }

    public void save(HttpRequest httpRequest) {
        update${aggregate.name}UseCase.handle(new Update${aggregate.name}Command(
                id<#if safeFields?has_content>,</#if>
<#list safeFields as field>
                <@commandArg field/><#sep>,</#sep>
</#list>
        ));
    }

    @Override
    public String id() {
        return id;
    }

    public ${aggregate.name}ViewModel load(${aggregate.name}Dto dto) {
        id = dto.id();
<#list safeFields as field>
        <#if field.isEnum>
        ${field.name} = dto.${field.name}() != null ? ${enumPackage}${field.name?cap_first}.valueOf(dto.${field.name}()) : null;
        <#else>
        ${field.name}<#if field.type == "Entity">Id</#if> = dto.${field.name}<#if field.type == "Entity">Id</#if>();
        </#if>
</#list>
        return this;
    }

    @Override
    public String toString() {
        return id != null ? String.valueOf(<#if safeFields?has_content>${safeFields?first.name}<#else>id</#if>) : "New ${aggregate.name}";
    }

}
