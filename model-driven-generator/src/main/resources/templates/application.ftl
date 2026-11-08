<#assign className = service.name?replace(" ", "_")?replace("-", "_")?split("_")?map(w -> w?cap_first)?join("") + "Application">
package ${project.packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

// io.mateu is scanned so Mateu's web layer (MateuController: the UI shell at "/"
// and the /mateu/v3/sync API) gets registered — Mateu ships no Spring auto-configuration.
@SpringBootApplication(scanBasePackages = {"${project.packageName}", "io.mateu"})
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }

    // Used by generated gateway adapters for synchronous outbound HTTP calls.
    @Bean
    RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // The generated persistence and messaging adapters inject Jackson 2's ObjectMapper, which
    // Spring Boot 4 no longer auto-configures (it configures Jackson 3, tools.jackson): without
    // this the service does not start. Declared only when nothing else provides one.
    @Bean
    @ConditionalOnMissingBean(com.fasterxml.jackson.databind.ObjectMapper.class)
    com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
        return com.fasterxml.jackson.databind.json.JsonMapper.builder().findAndAddModules().build();
    }

}
