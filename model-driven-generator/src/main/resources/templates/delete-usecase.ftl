package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.usecases.${aggregate.name?lower_case}.delete;

import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.out.${aggregate.name}Repository;
import ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.domain.aggregates.${aggregate.name?lower_case}.vo.${aggregate.name}Id;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class Delete${aggregate.name}UseCase {

    final ${aggregate.name}Repository repository;

    @Transactional
<#if aggregate.crudRoles?? && aggregate.crudRoles.delete?has_content>
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole(${aggregate.crudRoles.delete?map(r -> "'" + r + "'")?join(", ")})")
    @org.springframework.security.authorization.method.HandleAuthorizationDenied(handlerClass = ${project.packageName}.application.Forbidden.class)
</#if>
    public void handle(Delete${aggregate.name}Command command) {
        repository.deleteAllById(command.ids().stream()
                .map(Long::valueOf)
                .map(${aggregate.name}Id::new)
                .toList());
    }

}
