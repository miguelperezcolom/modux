<#assign className = service.name?replace(" ", "_")?replace("-", "_")?split("_")?map(w -> w?cap_first)?join("") + "Application">
package ${project.packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.web.client.RestTemplate;

// io.mateu is scanned so Mateu's web layer (MateuController: the UI shell at "/"
// and the /mateu/v3/sync API) gets registered — Mateu ships no Spring auto-configuration.
// Scheduled triggers (infra/in/scheduler) only fire with scheduling enabled.
@org.springframework.scheduling.annotation.EnableScheduling
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

    // Local profile (no infrastructure): events go to the log instead of the broker. The Kafka binder
    // cannot bind without a broker, so every write blocked on it and then failed. The generated code
    // publishes through StreamOperations, which this replaces only under the local profile.
    @Bean
    @Primary
    @Profile("local")
    org.springframework.cloud.stream.function.StreamOperations localEvents() {
        var log = org.slf4j.LoggerFactory.getLogger("modux.events");
        return new org.springframework.cloud.stream.function.StreamOperations() {
            @Override public boolean send(String to, Object data) { log.info("evento → {}: {}", to, data); return true; }
            @Override public boolean send(String to, Object data, org.springframework.util.MimeType type) { return send(to, data); }
            @Override public boolean send(String to, String binder, Object data) { return send(to, data); }
            @Override public boolean send(String to, String binder, Object data, org.springframework.util.MimeType type) { return send(to, data); }
        };
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
