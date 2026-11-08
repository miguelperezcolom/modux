package ${project.packageName}.${module.slug}.application.usecases.${usecase.name?lower_case?replace("[^a-z0-9]","",'r')};

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
<#assign importedDeps = []>
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if (step.type == "ReadAggregate" || step.type == "CallAggregateOperation" || step.type == "SaveAggregate") && step.aggregate??>
<#if !importedDeps?seq_contains(step.aggregate.name + "Repo")>
<#assign importedDeps = importedDeps + [step.aggregate.name + "Repo"]>
import ${project.packageName}.${module.slug}.application.out.${step.aggregate.name}Repository;
</#if>
</#if>
<#if step.type == "CallGateway" && step.gateway??>
<#if !importedDeps?seq_contains(step.gateway.name + "Gw")>
<#assign importedDeps = importedDeps + [step.gateway.name + "Gw"]>
import ${project.packageName}.${module.slug}.application.out.${step.gateway.className}Gateway;
</#if>
</#if>
<#if step.type == "CallUseCase" && step.useCase??>
<#if !importedDeps?seq_contains(step.useCase.name + "UC")>
<#assign importedDeps = importedDeps + [step.useCase.name + "UC"]>
import ${project.packageName}.${module.slug}.application.usecases.${step.useCase.name?lower_case?replace("[^a-z0-9]","",'r')}.${step.useCase.className}UseCase;
</#if>
</#if>
</#list>
</#if>
<#if usecase.needsStreamBridge>
import org.springframework.cloud.stream.function.StreamOperations;
</#if>
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@ExtendWith(MockitoExtension.class)
class ${usecase.className}UseCaseTest {

<#assign declaredMocks = []>
<#if usecase.steps?has_content>
<#list usecase.steps as step>
<#if (step.type == "ReadAggregate" || step.type == "CallAggregateOperation" || step.type == "SaveAggregate") && step.aggregate??>
<#if !declaredMocks?seq_contains(step.aggregate.name + "Repository")>
<#assign declaredMocks = declaredMocks + [step.aggregate.name + "Repository"]>
    @Mock
    ${step.aggregate.name}Repository ${step.aggregate.name?uncap_first}Repository;

</#if>
</#if>
<#if step.type == "CallGateway" && step.gateway??>
<#if !declaredMocks?seq_contains(step.gateway.name + "Gateway")>
<#assign declaredMocks = declaredMocks + [step.gateway.name + "Gateway"]>
    @Mock
    ${step.gateway.className}Gateway ${step.gateway.name?lower_case}Gateway;

</#if>
</#if>
<#if step.type == "CallUseCase" && step.useCase??>
<#if !declaredMocks?seq_contains(step.useCase.name + "UseCase")>
<#assign declaredMocks = declaredMocks + [step.useCase.name + "UseCase"]>
    @Mock
    ${step.useCase.className}UseCase ${step.useCase.className?uncap_first}UseCase;

</#if>
</#if>
</#list>
</#if>
<#if usecase.steps?has_content && usecase.steps?filter(s -> s.type == "Custom")?has_content>
    @Mock
    ${usecase.className}Steps steps;

</#if>
<#if usecase.needsStreamBridge>
    @Mock
    StreamOperations streamBridge;

</#if>
    @InjectMocks
    ${usecase.className}UseCase useCase;

    @Test
    void should_execute_successfully() {
        var command = new ${usecase.className}Command(<#if inputModel?? && inputModel.fields?has_content><#list inputModel.fields as field>null<#sep>, </#sep></#list><#else>null</#if>);
        assertDoesNotThrow(() -> useCase.handle(command));
    }
}
