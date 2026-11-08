package ${project.packageName}.${module.slug}.infra.in.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
<#list imports as imp>
import ${imp};
</#list>

/**
 * Generated REST controller for the "${api.name}" API: write operations delegate to their use case,
 * the listing reads from the aggregate's query service. Regenerated from the model — do not edit.
 */
@RestController
@RequiredArgsConstructor
public class ${api.className}Controller {

<#list writeOps as op>
    final ${op.ucClass}UseCase ${op.ucField};
</#list>
<#if read??>
    final ${read.qsClass} ${read.qsField};
</#if>

<#list writeOps as op>
    @${op.mappingAnn}("${op.path}")
<#if op.trio?? && op.trio == "create">
    public ResponseEntity<String> ${op.method}(@RequestBody ${op.ucClass}Command command) {
        return ResponseEntity.ok(${op.ucField}.handle(command));
    }
<#elseif op.trio?? && op.trio == "update">
    public ResponseEntity<Void> ${op.method}(@PathVariable String id, @RequestBody ${op.ucClass}Command command) {
        ${op.ucField}.handle(command.withId(id));
        return ResponseEntity.ok().build();
    }
<#elseif op.trio?? && op.trio == "delete">
    public ResponseEntity<Void> ${op.method}(@PathVariable String id) {
        ${op.ucField}.handle(new ${op.ucClass}Command(id));
        return ResponseEntity.ok().build();
    }
<#elseif op.hasOutput>
    public ResponseEntity<${op.ucClass}Result> ${op.method}(@RequestBody ${op.ucClass}Command command) {
        return ResponseEntity.ok(${op.ucField}.handle(command));
    }
<#else>
    public ResponseEntity<Void> ${op.method}(@RequestBody ${op.ucClass}Command command) {
        ${op.ucField}.handle(command);
        return ResponseEntity.ok().build();
    }
</#if>

</#list>
<#if read??>
    @GetMapping("${read.path}")
    public ResponseEntity<io.mateu.uidl.data.ListingData<${read.rowType}>> ${read.method}(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(${read.qsField}.findAll(search, null,
                new io.mateu.uidl.data.Pageable(page, size, java.util.List.of())));
    }
</#if>
}
