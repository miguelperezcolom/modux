package ${project.packageName}.${module.slug}.infra.in.async;

<#assign hasCallUseCase = false>
<#assign needsBigDecimal = false><#assign needsLocalDate = false><#assign needsLocalTime = false><#assign needsLocalDateTime = false>
<#if enrichedActions?has_content>
<#list enrichedActions as action>
<#if action.type == "CallUseCase">
<#assign hasCallUseCase = true>
<#if action.commandFields??>
<#-- the fields the constructor call below actually writes -->
<#list action.commandFields as f>
<#if f.basicType>
<#if f.type == "date"><#assign needsLocalDate = true></#if>
<#if f.type == "time"><#assign needsLocalTime = true></#if>
<#if f.type == "dateTime"><#assign needsLocalDateTime = true></#if>
<#if f.type == "number" || f.type == "money"><#assign needsBigDecimal = true></#if>
</#if>
</#list>
</#if>
</#if>
</#list>
</#if>
<#if enrichedActions?has_content>
<#list enrichedActions as action>
<#if action.type == "CallUseCase" && action.useCaseClassName??>
import ${project.packageName}.${module.slug}.application.usecases.${action.useCaseSlug}.${action.useCaseClassName};
import ${project.packageName}.${module.slug}.application.usecases.${action.useCaseSlug}.${action.commandClassName};
</#if>
</#list>
</#if>
<#if hasCallUseCase>
import com.fasterxml.jackson.databind.ObjectMapper;
</#if>
<#if subscription.idempotencyEnabled?? && subscription.idempotencyEnabled>
import ${project.packageName}.${module.slug}.infra.out.inbox.Inbox;
</#if>
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import lombok.RequiredArgsConstructor;

<#if needsBigDecimal>import java.math.BigDecimal;
</#if><#if needsLocalDate>import java.time.LocalDate;
</#if><#if needsLocalTime>import java.time.LocalTime;
</#if><#if needsLocalDateTime>import java.time.LocalDateTime;
</#if><#if hasCallUseCase>import java.util.Map;
</#if>import java.util.function.Consumer;

@Configuration
@RequiredArgsConstructor
public class ${subscription.name?cap_first}Subscription {

<#if enrichedActions?has_content>
<#list enrichedActions as action>
<#if action.type == "CallUseCase" && action.useCaseClassName??>
    final ${action.useCaseClassName} ${action.useCaseFieldName};
</#if>
</#list>
</#if>
<#if hasCallUseCase>
    final ObjectMapper mapper;
</#if>
<#if subscription.idempotencyEnabled?? && subscription.idempotencyEnabled>
    final Inbox inbox;
</#if>

    @Bean
    public Consumer<Message<String>> ${subscription.name?uncap_first}() {
        return message -> asSystem(() -> {
<#if subscription.idempotencyEnabled?? && subscription.idempotencyEnabled>
            // Idempotent consumer (inbox pattern): at-least-once delivery redelivers the SAME
            // broker message (retries, rebalances, DLQ replays), so the dedup key is the
            // topic+partition+offset — two distinct events may share a payload and BOTH must
            // be processed (e.g. cupo going 4 → 3 → 4). Only redeliveries share coordinates.
            var messageHash = Inbox.dedupKey(message);
            if (inbox.alreadyProcessed("${subscription.name}", messageHash)) {
                return;
            }
</#if>
<#if hasCallUseCase>
            try {
                @SuppressWarnings("unchecked")
                var payload = (Map<String, Object>) mapper.readValue(message.getPayload(), Map.class);
<#list enrichedActions as action>
<#if action.type == "CallUseCase" && action.commandClassName??>
                ${action.useCaseFieldName}.handle(new ${action.commandClassName}(<#if action.commandFields??>
<#list action.commandFields as f>
<#if f.basicType>
<#if f.type == "string" || f.type == "json">
                        (String) payload.get("${f.name}")<#sep>,</#sep>
<#elseif f.type == "integer">
                        payload.get("${f.name}") != null ? ((Number) payload.get("${f.name}")).intValue() : null<#sep>,</#sep>
<#elseif f.type == "number" || f.type == "money">
                        payload.get("${f.name}") != null ? new BigDecimal(payload.get("${f.name}").toString()) : null<#sep>,</#sep>
<#elseif f.type == "bool">
                        (Boolean) payload.get("${f.name}")<#sep>,</#sep>
<#elseif f.type == "date">
                        payload.get("${f.name}") != null ? LocalDate.parse(payload.get("${f.name}").toString()) : null<#sep>,</#sep>
<#elseif f.type == "time">
                        payload.get("${f.name}") != null ? LocalTime.parse(payload.get("${f.name}").toString()) : null<#sep>,</#sep>
<#elseif f.type == "dateTime">
                        payload.get("${f.name}") != null ? LocalDateTime.parse(payload.get("${f.name}").toString()) : null<#sep>,</#sep>
<#else>
                        (String) payload.get("${f.name}")<#sep>,</#sep>
</#if>
<#else>
                        payload.get("${f.name}") != null ? String.valueOf(payload.get("${f.name}")) : null<#sep>,</#sep>
</#if>
</#list>
<#else>
                        (String) payload.get("id")
</#if>));
<#if action.unmatchedFields?? && action.unmatchedFields?has_content>
                // TODO: command has fields with no source in payload: <#list action.unmatchedFields as u>${u}<#sep>, </#sep></#list>
</#if>
<#if action.modelMappingId?? && action.modelMappingId != "">
                // Model mapping configured: ${action.modelMappingId} (apply custom rules here)
</#if>
<#elseif action.type == "StartSaga">
                // TODO: start saga for action "${action.name}"
<#elseif action.type == "UpdateProjection">
                // TODO: update projection for action "${action.name}"
<#else>
                // TODO: custom action "${action.name}"
</#if>
</#list>
            } catch (Exception e) {
                throw new RuntimeException("Error in ${subscription.name?cap_first}Subscription", e);
            }
<#else>
            var payload = message.getPayload();
            // TODO: no CallUseCase actions configured
</#if>
<#if subscription.idempotencyEnabled?? && subscription.idempotencyEnabled>
            inbox.markProcessed("${subscription.name}", messageHash);
</#if>
        });
    }

    /**
     * Nobody is signed in here: the work acts as the system — user «${project.systemUser!"sistema"}», role
     * SYSTEM (or SISTEMA: both name it). A use case lets it in by listing that role among its roles
     * (explicit permissions), and its history records «${project.systemUser!"sistema"}».
     */
    static void asSystem(Runnable work) {
        var context = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.authenticated(
                "${project.systemUser!"sistema"}", null, java.util.List.of(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SYSTEM"),
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SISTEMA"))));
        org.springframework.security.core.context.SecurityContextHolder.setContext(context);
        try {
            work.run();
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }
}
