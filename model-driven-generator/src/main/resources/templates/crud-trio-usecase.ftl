<#-- One of an aggregate's derived CRUD use cases: it rests on the aggregate's built-in CRUD
     (Create/Update/Delete${aggregate.name}UseCase) and publishes the lifecycle event with the
     real aggregate id. -->
<#assign pkg = project.packageName + "." + module.name?lower_case?replace("[^a-z0-9]","",'r')>
<#assign safeFields = aggregate.fields?filter(f -> f.name != "id")>
<#function argName field><#if field.type == "Entity"><#return field.name + "Id"><#else><#return field.name></#if></#function>
<#assign action = {"create": "Create", "update": "Update", "delete": "Delete"}[trio.role]>
<#assign builtIn = action + aggregate.name>
package ${pkg}.application.usecases.${trio.slug};

import ${pkg}.application.usecases.${aggregate.name?lower_case}.${trio.role}.${builtIn}Command;
import ${pkg}.application.usecases.${aggregate.name?lower_case}.${trio.role}.${builtIn}UseCase;
<#if trio.event??>
import ${pkg}.domain.events.${trio.event}Event;
import org.springframework.cloud.stream.function.StreamOperations;
</#if>
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ${trio.className}UseCase {

    final ${builtIn}UseCase ${builtIn?uncap_first};
<#if trio.event??>
    final StreamOperations streamBridge;
</#if>

    @Transactional
<#if trio.role == "create">
    public String handle(${trio.className}Command command) {
        var id = ${builtIn?uncap_first}.handle(new ${builtIn}Command(<#list safeFields as field>command.${argName(field)}()<#sep>, </#sep></#list>));
<#elseif trio.role == "update">
    public String handle(${trio.className}Command command) {
        var id = command.id();
        ${builtIn?uncap_first}.handle(new ${builtIn}Command(id<#list safeFields as field>, command.${argName(field)}()</#list>));
<#else>
    public String handle(${trio.className}Command command) {
        var id = command.id();
        ${builtIn?uncap_first}.handle(new ${builtIn}Command(java.util.List.of(id)));
</#if>
<#if trio.event??>
        streamBridge.send("${trio.event?lower_case?replace("[^a-z0-9]","-",'r')}", new ${trio.event}Event(id));
</#if>
        return id;
    }

}
