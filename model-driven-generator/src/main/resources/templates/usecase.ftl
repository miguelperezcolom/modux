package ${project.packageName}.${module.slug}.application.usecases.${usecase.name?lower_case?replace("[^a-z0-9]","",'r')};
<#-- With an outbox the event is stored with the state change, so a publishing use case is one transaction -->
<#assign usecaseTransactional = (usecase.transactionBoundary?? && usecase.transactionBoundary?has_content)
    || ((service.outboxEnabled!false) && (usecase.steps![])?filter(s -> s.type == "PublishDomainEvent")?has_content)>
<#-- Aggregate-level imports for ReadAggregate / SaveAggregate / CallAggregateOperation steps -->
<#assign aggregateImports = []>
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if (step.type == "ReadAggregate" || step.type == "CallAggregateOperation" || step.type == "SaveAggregate") && step.aggregate??>
    <#if !aggregateImports?seq_contains(step.aggregate.name)>
        <#assign aggregateImports = aggregateImports + [step.aggregate.name]>
    </#if>
</#if>
</#list>
</#if>
<#list aggregateImports as aggName>
import ${project.packageName}.${module.slug}.application.out.${aggName}Repository;
import ${project.packageName}.${module.slug}.domain.aggregates.${aggName?lower_case}.${aggName};
import ${project.packageName}.${module.slug}.domain.aggregates.${aggName?lower_case}.vo.${aggName}Id;
</#list>
<#-- Gateway imports -->
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if step.type == "CallGateway" && step.gateway??>
import ${project.packageName}.${module.slug}.application.out.${step.gateway.className}Gateway;
</#if>
</#list>
</#if>
<#-- Called use-case imports -->
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if step.type == "CallUseCase" && step.useCase??>
import ${project.packageName}.${module.slug}.application.usecases.${step.useCase.name?lower_case?replace("[^a-z0-9]","",'r')}.${step.useCase.className}UseCase;
import ${project.packageName}.${module.slug}.application.usecases.${step.useCase.name?lower_case?replace("[^a-z0-9]","",'r')}.${step.useCase.className}Command;
</#if>
</#list>
</#if>
<#-- Domain event imports for PublishDomainEvent steps -->
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if step.type == "PublishDomainEvent" && step.domainEvent??>
import ${project.packageName}.${module.slug}.domain.events.${step.domainEvent.className}Event;
</#if>
</#list>
</#if>
<#if usecase.needsStreamBridge>
import org.springframework.cloud.stream.function.StreamOperations;
</#if>
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
<#if usecaseTransactional>
import org.springframework.transaction.annotation.Transactional;
</#if>
<#if usecase.cacheable?? && usecase.cacheable>
import org.springframework.cache.annotation.Cacheable;
</#if>
<#if usecase.allowedRoles?has_content>
import org.springframework.security.access.prepost.PreAuthorize;
</#if>

@Service
@RequiredArgsConstructor
public class ${usecase.className}UseCase {

<#-- Repository fields -->
<#assign addedFields = []>
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if (step.type == "ReadAggregate" || step.type == "CallAggregateOperation" || step.type == "SaveAggregate") && step.aggregate??>
    <#if !addedFields?seq_contains(step.aggregate.name + "Repository")>
        <#assign addedFields = addedFields + [step.aggregate.name + "Repository"]>
    final ${step.aggregate.name}Repository ${step.aggregate.name?uncap_first}Repository;
    </#if>
</#if>
<#if step.type == "SaveAggregate" && step.aggregate?? && (step.aggregate.invariants![])?has_content && (step.aggregateLoaded!false)>
    <#if !addedFields?seq_contains(step.aggregate.name + "Invariants")>
        <#assign addedFields = addedFields + [step.aggregate.name + "Invariants"]>
    /** Its invariants hold after whatever the operations did, before it is saved. */
    final ${project.packageName}.${module.slug}.domain.aggregates.${step.aggregate.name?lower_case}.${step.aggregate.name}Invariants ${step.aggregate.name?uncap_first}Invariants;
    </#if>
</#if>
<#if step.type == "CallGateway" && step.gateway??>
    <#if !addedFields?seq_contains(step.gateway.className + "Gateway")>
        <#assign addedFields = addedFields + [step.gateway.className + "Gateway"]>
    final ${step.gateway.className}Gateway ${step.gateway.className?uncap_first}Gateway;
    </#if>
</#if>
<#if step.type == "CallUseCase" && step.useCase??>
    <#if !addedFields?seq_contains(step.useCase.className + "UseCase")>
        <#assign addedFields = addedFields + [step.useCase.className + "UseCase"]>
    final ${step.useCase.className}UseCase ${step.useCase.className?uncap_first}UseCase;
    </#if>
</#if>
</#list>
</#if>
<#if usecase.needsStreamBridge>
    final StreamOperations streamBridge;
</#if>
<#if usecase.usesSequences!false>
    /** Correlative numbers (the operations' SEQUENCE fields). */
    final ${project.packageName}.${module.slug}.application.out.Sequences sequences;
</#if>
<#if usecase.usesCurrentUser!false>
    /** Who runs it: what the operations' «by whom» fields are filled with. */
    final ${project.packageName}.${module.slug}.application.out.CurrentUser currentUser;
</#if>
<#list (usecase.steps![])?filter(s -> s.type == "CallRemoteUseCase") as step>
    final ${project.packageName}.${module.slug}.application.out.remote.${step.remote.className}Client ${step.remote.var}Client;
</#list>
<#list (usecase.steps![])?filter(s -> s.integrationClass??) as step>
    final ${project.packageName}.${module.slug}.application.out.integration.${step.integrationClass}Publisher ${step.integrationClass?uncap_first}Publisher;
</#list>
<#list (usecase.steps![])?filter(s -> s.operationCall??) as step>
    final ${project.packageName}.${module.slug}.domain.aggregates.${step.aggregate.name?lower_case}.${step.operationClass} ${step.operationClass?uncap_first};
</#list>
<#if usecase.steps?has_content && usecase.steps?filter(s -> s.type == "Custom")?has_content>
    final ${usecase.className}Steps steps;
</#if>

<#if usecase.allowedRoles?has_content>
    @PreAuthorize("hasAnyRole(${usecase.allowedRoles?map(r -> "'" + r + "'")?join(", ")})")
    @org.springframework.security.authorization.method.HandleAuthorizationDenied(handlerClass = ${project.packageName}.application.Forbidden.class)
</#if>
<#if usecase.cacheable?? && usecase.cacheable>
    @Cacheable(value = "${usecase.name?lower_case}", <#if usecase.cacheTtlSeconds??>/* ttlSeconds=${usecase.cacheTtlSeconds} */</#if>)
</#if>
<#if usecaseTransactional>
    @Transactional
</#if>
<#assign customSteps = (usecase.steps![])?filter(s -> s.type == "Custom")>
    public <#if outputModel??>${usecase.className}Result<#else>void</#if> handle(${usecase.className}Command command) {
<#if outputModel??>
        ${usecase.className}Result result = null;
</#if>
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if step.type == "ReadAggregate" && step.aggregate??>
        var ${step.aggregate.name?uncap_first} = ${step.aggregate.name?uncap_first}Repository
                .findById(new ${step.aggregate.name}Id(Long.valueOf(String.valueOf(command.${step.idField}()))))
                .orElseThrow(() -> ${project.packageName}.application.BusinessRuleException.notFound(
                        "${step.aggregate.name} " + command.${step.idField}() + " no existe"));
<#elseif step.type == "CallAggregateOperation" && step.aggregate??>
<#if step.operationCall??>
        ${step.aggregate.name?uncap_first}.${step.operation.name?uncap_first}(${step.operationClass?uncap_first}<#if step.operationInputArgs??>, new ${project.packageName}.${module.slug}.domain.aggregates.${step.aggregate.name?lower_case}.${step.operationClass}.Input(${step.operationInputArgs})</#if>);
<#elseif step.operation??>
        ${step.aggregate.name?uncap_first}.${step.operation.name?uncap_first}(/* TODO: pass operation args */);
<#else>
        // TODO: call operation on ${step.aggregate.name?uncap_first} (operationId not resolved)
</#if>
<#elseif step.type == "SaveAggregate" && step.aggregate??>
<#if !step.aggregateLoaded?? || !step.aggregateLoaded>
        ${step.aggregate.name} ${step.aggregate.name?uncap_first} = null; // TODO: build ${step.aggregate.name} from command + gateway results
</#if>
<#if (step.aggregate.invariants![])?has_content && (step.aggregateLoaded!false)>
        ${step.aggregate.name?uncap_first}Invariants.check(new ${project.packageName}.${module.slug}.domain.aggregates.${step.aggregate.name?lower_case}.${step.aggregate.name}Context(${step.aggregate.name?uncap_first}));
</#if>
        ${step.aggregate.name?uncap_first}Repository.save(${step.aggregate.name?uncap_first});
<#elseif step.type == "CallGateway" && step.gateway??>
<#if step.gatewayOperation??>
        ${step.gateway.className?uncap_first}Gateway.${step.gatewayOperation.name?uncap_first}(<#if step.argFields??><#list step.argFields as a><#if a.matched>command.${a.name}()<#else>null /* TODO: ${a.name} */</#if><#sep>, </#sep></#list></#if>);
<#else>
        // TODO: call gateway ${step.gateway.className?uncap_first}Gateway (operation not resolved)
</#if>
<#elseif step.type == "PublishDomainEvent" && step.domainEvent??>
<#if step.integrationClass??>
        ${step.integrationClass?uncap_first}Publisher.publish(new ${project.packageName}.${module.slug}.application.out.integration.${step.integrationClass}(<#if step.argFields??><#list step.argFields as a><#if a.expr??>${a.expr}<#elseif a.matched>command.${a.name}()<#else>null /* TODO: ${a.name} */</#if><#sep>, </#sep></#list></#if>));
<#else>
        streamBridge.send("${step.domainEvent.name?lower_case?replace("[^a-z0-9]","-",'r')}", new ${step.domainEvent.className}Event(<#if step.aggregateIdExpr??>String.valueOf(${step.aggregateIdExpr})<#else>null /* TODO: aggregateId */</#if><#if step.argFields??><#list step.argFields as a>, <#if a.expr??>${a.expr}<#elseif a.matched>command.${a.name}()<#else>null /* TODO: ${a.name} */</#if></#list></#if>));
</#if>
<#elseif step.type == "CallRemoteUseCase">
        <#if step.remote.hasResponse>var ${step.remote.var} = </#if>${step.remote.var}Client.call(new ${project.packageName}.${module.slug}.application.out.remote.${step.remote.className}Client.Request(<#list step.remote.request as f>${f.expr}<#sep>, </#sep></#list>));
<#elseif step.type == "CallUseCase" && step.useCase??>
        ${step.useCase.className?uncap_first}UseCase.handle(/* TODO: build ${step.useCase.className}Command */);
<#elseif step.type == "ApplyModelMapping">
<#if step.modelMapping??>
        // TODO: apply model mapping "${step.modelMapping.name}"
<#else>
        // TODO: apply model mapping (not resolved)
</#if>
<#elseif step.type == "Custom">
<#if usecase.outcome?? && customSteps?has_content && step.id == customSteps?last.id>
        var outcome = steps.${step.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}(command<#list (step.remoteParams![])?filter(r -> r.hasResponse) as r>, ${r.var}</#list>);
<#if outputModel??>
        result = outcome.result();
</#if>
<#elseif outputModel?? && customSteps?has_content && step.id == customSteps?last.id>
        result = steps.${step.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}(command<#list (step.remoteParams![])?filter(r -> r.hasResponse) as r>, ${r.var}</#list>);
<#else>
        steps.${step.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}(command<#list (step.remoteParams![])?filter(r -> r.hasResponse) as r>, ${r.var}</#list>);
</#if>
<#else>
        // TODO: implement step "${step.name}" (${step.type})
</#if>
</#list>
<#else>
        // TODO: implement use case logic
</#if>
<#if outputModel??>
        return result;
</#if>
    }

}
