package ${project.packageName}.${module.slug}.infra.in.projection;

<#assign hasReadModel = readModel??>
<#assign needsBigDecimal = false><#assign needsLocalDate = false><#assign needsLocalTime = false><#assign needsLocalDateTime = false>
<#if hasReadModel && readModel.fields??>
<#list readModel.fields as f>
<#if f.basicType>
<#if f.type == "date"><#assign needsLocalDate = true></#if>
<#if f.type == "time"><#assign needsLocalTime = true></#if>
<#if f.type == "dateTime"><#assign needsLocalDateTime = true></#if>
<#if f.type == "number" || f.type == "money"><#assign needsBigDecimal = true></#if>
</#if>
</#list>
</#if>
<#if hasReadModel>
import ${project.packageName}.${module.slug}.infra.out.persistence.${readModel.entityClassName};
import ${project.packageName}.${module.slug}.infra.out.persistence.${readModel.className}EntityRepository;
</#if>
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;

<#if needsBigDecimal>import java.math.BigDecimal;
</#if><#if needsLocalDate>import java.time.LocalDate;
</#if><#if needsLocalTime>import java.time.LocalTime;
</#if><#if needsLocalDateTime>import java.time.LocalDateTime;
</#if>import java.util.Map;
import java.util.function.Consumer;

@Configuration
@RequiredArgsConstructor
public class ${className} {

<#if hasReadModel>
    final ${readModel.className}EntityRepository repository;
</#if>
    final ObjectMapper mapper;

<#if enrichedHandlers?has_content>
<#list enrichedHandlers as handler>
    @Bean
    <#-- Qualified with the projection: two projections may handle the same event, and the
         function bean name must be unique in the shared application context. -->
    public Consumer<Message<String>> ${className?uncap_first}${handler.name?cap_first?replace("[^a-zA-Z0-9]","",'r')}() {
        return message -> {
            try {
                @SuppressWarnings("unchecked")
                var payload = (Map<String, Object>) mapper.readValue(message.getPayload(), Map.class);
<#if handler.idField??>
                var id = payload.get("${handler.idField}") != null ? String.valueOf(payload.get("${handler.idField}")) : null;
<#else>
                String id = null; // TODO: payload model has no basic field to use as id
</#if>
<#if handler.type == "Delete">
                if (id != null) repository.deleteById(id);
<#elseif hasReadModel>
<#if handler.type == "Create">
                var entity = new ${readModel.entityClassName}();
<#elseif handler.type == "Update">
                if (id == null) return;
                repository.findById(id).ifPresent(entity -> {
<#else>
                var entity = id != null
                        ? repository.findById(id).orElseGet(${readModel.entityClassName}::new)
                        : new ${readModel.entityClassName}();
</#if>
                entity.setId(<#if appendOnly>java.util.UUID.randomUUID().toString()<#else>id</#if>);
<#if handler.matchedFields??>
<#list handler.matchedFields as f>
<#if f.basicType>
<#if f.type == "string" || f.type == "json">
                entity.set${f.name?cap_first}((String) payload.get("${f.name}"));
<#elseif f.type == "integer">
                entity.set${f.name?cap_first}(payload.get("${f.name}") != null ? ((Number) payload.get("${f.name}")).intValue() : null);
<#elseif f.type == "number" || f.type == "money">
                entity.set${f.name?cap_first}(payload.get("${f.name}") != null ? new BigDecimal(payload.get("${f.name}").toString()) : null);
<#elseif f.type == "bool">
                entity.set${f.name?cap_first}((Boolean) payload.get("${f.name}"));
<#elseif f.type == "date">
                entity.set${f.name?cap_first}(payload.get("${f.name}") != null ? LocalDate.parse(payload.get("${f.name}").toString()) : null);
<#elseif f.type == "time">
                entity.set${f.name?cap_first}(payload.get("${f.name}") != null ? LocalTime.parse(payload.get("${f.name}").toString()) : null);
<#elseif f.type == "dateTime">
                entity.set${f.name?cap_first}(payload.get("${f.name}") != null ? LocalDateTime.parse(payload.get("${f.name}").toString()) : null);
<#else>
                entity.set${f.name?cap_first}((String) payload.get("${f.name}"));
</#if>
<#else>
                entity.set${f.name?cap_first}Id(payload.get("${f.name}") != null ? String.valueOf(payload.get("${f.name}")) : null);
</#if>
</#list>
</#if>
<#if handler.unmatchedFields?? && handler.unmatchedFields?has_content>
                // TODO: read model has fields with no source in payload: <#list handler.unmatchedFields as u>${u}<#sep>, </#sep></#list>
</#if>
<#if handler.type == "Update">
                    repository.save(entity);
                });
<#else>
                repository.save(entity);
</#if>
<#else>
                // TODO: no ReadModel linked to this projection
</#if>
<#if handler.modelMappingId?? && handler.modelMappingId != "">
                // Apply model mapping: ${handler.modelMappingId}
</#if>
            } catch (Exception e) {
                throw new RuntimeException("Error in ${className}.${handler.name}", e);
            }
        };
    }

</#list>
<#else>
    @Bean
    <#-- Named after the class + suffix: the bare projection name would collide with the
         @Configuration class's own default bean name. -->
    public Consumer<Message<String>> ${className?uncap_first}Consumer() {
        return message -> {
            // TODO: no handlers configured for this projection
        };
    }
</#if>
}
