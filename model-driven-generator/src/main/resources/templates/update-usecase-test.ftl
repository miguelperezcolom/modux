package ${project.packageName}.${module.slug}.application.usecases.${aggregate.name?lower_case}.update;
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ${project.packageName}.${module.slug}.application.out.${aggregate.name}Repository;
import ${project.packageName}.${module.slug}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name};
import ${project.packageName}.${module.slug}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
<#if aggregate.invariants?has_content>
import ${project.packageName}.${module.slug}.domain.aggregates.${aggregate.name?lower_case}.${aggregate.name}Invariants;
</#if>
import java.util.Optional;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Update${aggregate.name}UseCaseTest {

    @Mock
    ${aggregate.name}Repository repository;

<#if aggregate.invariants?has_content>
    @Mock
    ${aggregate.name}Invariants invariants;

</#if>
    @InjectMocks
    Update${aggregate.name}UseCase useCase;

<#if aggregate.behavioural!false>
    @Test
    void is_refused_because_it_changes_through_its_operations() {
        var command = new Update${aggregate.name}Command("1"<#list safeFields as field>, null</#list>);
        org.junit.jupiter.api.Assertions.assertThrows(
                ${project.packageName}.application.BusinessRuleException.class, () -> useCase.handle(command));
        org.mockito.Mockito.verifyNoInteractions(repository);
    }
<#else>
    @Test
    void should_update_and_persist() {
        var existing = new ${aggregate.name}();
        when(repository.findById(any(${aggregate.name}Id.class))).thenReturn(Optional.of(existing));
        var command = new Update${aggregate.name}Command("1"<#list safeFields as field>, null</#list>);
        useCase.handle(command);
        verify(repository).save(existing);
    }
</#if>
}
