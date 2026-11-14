package ${project.packageName}.${module.slug}.infra.in.scheduler;

import ${project.packageName}.${module.slug}.application.usecases.${useCase.slug}.${useCase.className}Command;
import ${project.packageName}.${module.slug}.application.usecases.${useCase.slug}.${useCase.className}UseCase;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

/**
 * Scheduled trigger «${trigger.name}»: runs ${useCase.className} on its cron (overridable with
 * ${trigger.name?upper_case?replace("[^A-Z0-9]","_",'r')}_CRON). A scheduled run carries no input.
 */
@Component
@RequiredArgsConstructor
public class ${triggerClass} {

    final ${useCase.className}UseCase useCase;

    @Scheduled(cron = "${r"${"}${trigger.name?upper_case?replace("[^A-Z0-9]","_",'r')}_CRON:${trigger.cronExpression!'0 0 0 * * *'}${"}"}"<#if trigger.timezone?? && trigger.timezone?has_content>, zone = "${trigger.timezone}"</#if>)
    public void execute() {
        asSystem(() -> useCase.handle(new ${useCase.className}Command(<#if useCase.commandArity gt 0><#list 1..useCase.commandArity as i>null<#sep>, </#sep></#list></#if>)));
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
