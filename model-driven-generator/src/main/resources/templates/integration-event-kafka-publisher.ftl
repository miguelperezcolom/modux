package ${project.packageName}.${module.slug}.infra.out.integration;

import ${project.packageName}.${module.slug}.application.out.integration.${className};
import ${project.packageName}.${module.slug}.application.out.integration.${className}Publisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.stream.function.StreamOperations;
import org.springframework.stereotype.Component;

/** Publishes ${className} to its topic (Kafka, via Spring Cloud Stream's dynamic destinations). */
@Component
@RequiredArgsConstructor
public class ${className}KafkaPublisher implements ${className}Publisher {

    static final String TOPIC = "${integrationEvent.topicName!""}";

    final StreamOperations streamBridge;
    final ObjectMapper objectMapper;

    @Override
    public void publish(${className} event) {
        try {
            streamBridge.send(TOPIC, objectMapper.writeValueAsString(event));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize ${className}", e);
        }
    }
}
