package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.update;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>

import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.out.${aggregate.name}Repository;
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
public class Update${aggregate.name}UseCase {

    final ${aggregate.name}Repository repository;
<#if aggregate.invariants?has_content>
    final ${aggregate.name}Invariants invariants;
</#if>

    @Transactional
<#if aggregate.crudRoles?? && aggregate.crudRoles.update?has_content>
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole(${aggregate.crudRoles.update?map(r -> "'" + r + "'")?join(", ")})")
    @org.springframework.security.authorization.method.HandleAuthorizationDenied(handlerClass = ${project.packageName}.application.Forbidden.class)
</#if>
    public void handle(Update${aggregate.name}Command command) {
<#if aggregate.behavioural!false>
        // ${aggregate.name} changes through its operations, each one with its rules: a generic
        // update would overwrite the whole state and skip them.
        throw ${project.packageName}.application.BusinessRuleException.conflict(
                "${aggregate.name} no se edita directamente: usa <#list aggregate.operations as op>«${op.name}»<#sep>, </#sep></#list>");
<#else>
        var entity = repository.findById(new ${aggregate.name}Id(Long.valueOf(command.id()))).orElseThrow();
        entity.update(
<#list safeFields as field>
    <#if field.readonly!false>
                entity.get${field.name?cap_first}<#if field.type == "Entity">Id</#if>()<#sep>,</#sep>
    <#elseif field.type == "ValueObject">
        <#if field.isEnum>
                (command.${field.name}() == null || command.${field.name}().isBlank() ? null : ${field.name?cap_first}.valueOf(command.${field.name}()))<#sep>,</#sep>
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
        invariants.check(new ${aggregate.name}Context(entity));
</#if>
        repository.save(entity);
</#if>
    }

}
