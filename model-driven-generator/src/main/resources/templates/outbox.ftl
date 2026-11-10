<#assign table = (service.outboxTableName?? && service.outboxTableName?has_content)?then(service.outboxTableName, "modux_outbox")>
package ${project.packageName}.infra.out.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cloud.stream.function.StreamOperations;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MimeType;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * Transactional outbox. Every event the generated code sends goes through StreamOperations;
 * this replaces it so the event is written to the {@code ${table}} table in the SAME transaction
 * as the state change instead of reaching the broker directly. If the transaction rolls back the
 * event is gone with it; if it commits, {@link OutboxRelay} delivers it, even after a restart.
 * Delivery is at-least-once: consumers dedupe through their inbox.
 */
@Component
@Primary
@Profile("!local")
public class Outbox implements StreamOperations {

    static final String TABLE = "${table}";

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public Outbox(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    /** Joins the caller's transaction; a caller without one gets its own, as a plain send would. */
    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public boolean send(String destination, Object data) {
        jdbc.update("insert into " + TABLE + " (id, destination, payload, created_at)"
                        + " values (nextval('" + TABLE + "_sequence'), ?, ?, ?)",
                destination, serialize(data), Timestamp.from(Instant.now()));
        return true;
    }

    @Override
    public boolean send(String destination, Object data, MimeType outputContentType) {
        return send(destination, data);
    }

    @Override
    public boolean send(String destination, String binderName, Object data) {
        return send(destination, data);
    }

    @Override
    public boolean send(String destination, String binderName, Object data, MimeType outputContentType) {
        return send(destination, data);
    }

    private String serialize(Object data) {
        if (data instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize the event for " + data.getClass().getSimpleName(), e);
        }
    }
}
