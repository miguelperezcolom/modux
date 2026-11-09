package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.create;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>

import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.out.${aggregate.name}Repository;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name};
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
<#list safeFields as field>
    <#if field.type == "ValueObject">
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${field.name?cap_first};
    </#if>
</#list>
<#if aggregate.invariants?has_content>
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Invariants;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Context;
</#if>
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class Create${aggregate.name}UseCase {

    final ${aggregate.name}Repository repository;
<#if aggregate.invariants?has_content>
    final ${aggregate.name}Invariants invariants;
</#if>

    @Transactional
<#if aggregate.crudRoles?? && aggregate.crudRoles.create?has_content>
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole(${aggregate.crudRoles.create?map(r -> "'" + r + "'")?join(", ")})")
</#if>
    public String handle(Create${aggregate.name}Command command) {
        var aggregate = ${aggregate.name}.of(
<#list safeFields as field>
    <#if field.type == "ValueObject">
        <#if field.isEnum>
                ${field.name?cap_first}.valueOf(command.${field.name}())<#sep>,</#sep>
        <#else>
                new ${field.name?cap_first}(command.${field.name}())<#sep>,</#sep>
        </#if>
    <#elseif field.type == "Entity">
                command.${field.name}Id()<#sep>,</#sep>
    <#else>
                command.${field.name}()<#sep>,</#sep>
    </#if>
</#list>
        );
<#if aggregate.invariants?has_content>
        invariants.check(new ${aggregate.name}Context(aggregate));
</#if>
        return repository.save(aggregate).value().toString();
    }

}
