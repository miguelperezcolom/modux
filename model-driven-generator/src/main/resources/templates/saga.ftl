package ${project.packageName}.${module.slug}.application.sagas;
<#-- Collect aggregate imports from steps -->
<#assign sagaAggregateImports = []>
<#if saga.steps?has_content>
<#list saga.steps as step>
<#if (step.type == "ReadAggregate" || step.type == "CallAggregateOperation" || step.type == "SaveAggregate") && step.aggregate??>
    <#if !sagaAggregateImports?seq_contains(step.aggregate.name)>
        <#assign sagaAggregateImports = sagaAggregateImports + [step.aggregate.name]>
    </#if>
</#if>
</#list>
</#if>
<#list sagaAggregateImports as aggName>
import ${project.packageName}.${module.slug}.application.out.${aggName}Repository;
import ${project.packageName}.${module.slug}.domain.aggregates.${aggName?lower_case}.${aggName};
import ${project.packageName}.${module.slug}.domain.aggregates.${aggName?lower_case}.vo.${aggName}Id;
</#list>
<#if saga.steps?has_content>
<#list saga.steps as step>
<#if step.type == "PublishDomainEvent" && step.domainEvent??>
import ${project.packageName}.${module.slug}.domain.events.${step.domainEvent.className}Event;
</#if>
<#if step.type == "CallUseCase" && step.useCase??>
import ${project.packageName}.${module.slug}.application.usecases.${step.useCase.name?lower_case?replace("[^a-z0-9]","",'r')}.${step.useCase.className}UseCase;
import ${project.packageName}.${module.slug}.application.usecases.${step.useCase.name?lower_case?replace("[^a-z0-9]","",'r')}.${step.useCase.className}Command;
</#if>
<#if step.type == "CallGateway" && step.gateway??>
import ${project.packageName}.${module.slug}.application.out.${step.gateway.className}Gateway;
</#if>
</#list>
</#if>
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.stream.function.StreamOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ${saga.name?cap_first}Saga {

<#-- Repository fields -->
<#assign addedSagaFields = []>
<#if saga.steps?has_content>
<#list saga.steps as step>
<#if (step.type == "ReadAggregate" || step.type == "CallAggregateOperation" || step.type == "SaveAggregate") && step.aggregate??>
    <#if !addedSagaFields?seq_contains(step.aggregate.name + "Repository")>
        <#assign addedSagaFields = addedSagaFields + [step.aggregate.name + "Repository"]>
    final ${step.aggregate.name}Repository ${step.aggregate.name?uncap_first}Repository;
    </#if>
</#if>
<#if step.type == "CallGateway" && step.gateway??>
    <#if !addedSagaFields?seq_contains(step.gateway.className + "Gateway")>
        <#assign addedSagaFields = addedSagaFields + [step.gateway.className + "Gateway"]>
    final ${step.gateway.className}Gateway ${step.gateway.className?uncap_first}Gateway;
    </#if>
</#if>
<#if step.type == "CallUseCase" && step.useCase??>
    <#if !addedSagaFields?seq_contains(step.useCase.className + "UseCase")>
        <#assign addedSagaFields = addedSagaFields + [step.useCase.className + "UseCase"]>
    final ${step.useCase.className}UseCase ${step.useCase.className?uncap_first}UseCase;
    </#if>
</#if>
</#list>
</#if>
<#if saga.steps?has_content && saga.steps?filter(s -> s.type == "PublishDomainEvent")?has_content>
    final StreamOperations streamBridge;
</#if>
<#if saga.steps?has_content && saga.steps?filter(s -> s.type == "Custom")?has_content>
    final ${saga.name?cap_first}Steps steps;
</#if>

    @Transactional
    public void execute(/* TODO: define the saga trigger payload */) {
        // Orchestration scaffold. The runnable orchestration is the generated EventConductor workflow
        // (resources/workflows/${saga.name?cap_first}.workflow.json). The injected collaborators below are
        // available if you instead drive the saga in-process; wire each step then.
<#if saga.steps?has_content>
<#list saga.steps as step>
<#if step.type == "Custom">
        steps.${step.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}();
<#else>
        // step ${step?index + 1}: ${step.name} (${step.type})<#if step.gateway??> — ${step.gateway.className?uncap_first}Gateway.${(step.gatewayOperation.name)!'?'}(…)</#if><#if step.aggregate??> — ${step.aggregate.name} ${(step.operation.name)!'operation'}(…)</#if><#if step.useCase??> — ${step.useCase.className?uncap_first}UseCase.handle(…)</#if><#if step.domainEvent??> — publish ${step.domainEvent.name}Event</#if>
</#if>
</#list>
<#else>
        // TODO: implement saga steps
</#if>
    }

    public void compensate(/* TODO: define saga payload */) {
        // TODO: implement compensation logic
<#if saga.steps?has_content>
<#list saga.steps?reverse as step>
        // Compensate: ${step.name} (${step.type})
</#list>
</#if>
    }

}
