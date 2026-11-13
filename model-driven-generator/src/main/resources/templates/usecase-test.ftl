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
<#list (usecase.steps![])?filter(s -> s.integrationClass??) as step>
    @Mock
    ${project.packageName}.${module.slug}.application.out.integration.${step.integrationClass}Publisher ${step.integrationClass?uncap_first}Publisher;

</#list>
<#list (usecase.steps![])?filter(s -> s.type == "CallRemoteUseCase") as step>
    @Mock
    ${project.packageName}.${module.slug}.application.out.remote.${step.remote.className}Client ${step.remote.var}Client;

</#list>
    @InjectMocks
    ${usecase.className}UseCase useCase;

<#assign reads = (usecase.steps![])?filter(s -> s.type == "ReadAggregate" && s.idField??)>
<#if reads?has_content>
<#assign firstRead = reads[0]>
    @Test
    void rejects_an_unknown_${firstRead.aggregate.name?lower_case}() {
        // the repository mock knows no ${firstRead.aggregate.name}: the use case must say so, not fail
        var command = new ${usecase.className}Command(<#if inputModel?? && inputModel.fields?has_content><#list inputModel.fields as field><#if field.name == firstRead.idField><#if field.basicType?? && field.basicType && field.type == "integer">1<#elseif field.basicType?? && field.basicType && (field.type == "string" || field.type == "")>"1"<#elseif !(field.basicType?? && field.basicType)>"1"<#else>1L</#if><#else>null</#if><#sep>, </#sep></#list><#else>1L</#if>);
        org.junit.jupiter.api.Assertions.assertThrows(
                ${project.packageName}.application.BusinessRuleException.class, () -> useCase.handle(command));
    }
<#else>
    @Test
    void should_execute_successfully() {
        var command = new ${usecase.className}Command(<#if inputModel?? && inputModel.fields?has_content><#list inputModel.fields as field>null<#sep>, </#sep></#list><#else>null</#if>);
<#assign customs = (usecase.steps![])?filter(s -> s.type == "Custom")>
<#assign resultStub><#if outputModel??>new ${usecase.className}Result(<#list (outputModel.fields![]) as f>null<#sep>, </#sep></#list>)</#if></#assign>
<#if (outputModel?? || usecase.outcome??) && customs?has_content>
        // the last custom step decides the result the later steps read
        org.mockito.Mockito.when(steps.${customs?last.name?uncap_first?replace("[^a-zA-Z0-9]","",'r')}(org.mockito.ArgumentMatchers.any()<#list (customs?last.remoteParams![])?filter(r -> r.hasResponse) as r>, org.mockito.ArgumentMatchers.any()</#list>))
<#if usecase.outcome??>
                .thenReturn(new ${usecase.outcome.className}(<#if outputModel??>${resultStub}<#if usecase.outcome.fields?has_content>, </#if></#if><#list usecase.outcome.fields as f>null<#sep>, </#sep></#list>));
<#else>
                .thenReturn(${resultStub});
</#if>
</#if>
        assertDoesNotThrow(() -> useCase.handle(command));
    }
</#if>
}
