package ${project.packageName}.infra.out.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MimeTypeUtils;

/**
 * Delivers what {@link Outbox} stored, oldest first. Rows are locked with SKIP LOCKED, so several
 * instances of the service relay in parallel without sending a row twice; a row is deleted only
 * once the broker accepted it, so a crash in between resends it (consumers dedupe by inbox).
 */
@Component
@Profile("!local")
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final JdbcTemplate jdbc;
    private final StreamBridge broker;
    private final int batchSize;

    public OutboxRelay(JdbcTemplate jdbc, StreamBridge broker,
                       @Value("${r"${modux.outbox.batch-size:100}"}") int batchSize) {
        this.jdbc = jdbc;
        this.broker = broker;
        this.batchSize = batchSize;
    }

    record Pending(long id, String destination, String payload) {}

    @Scheduled(fixedDelayString = "${r"${modux.outbox.relay-delay-ms:500}"}")
    @Transactional
    public void relay() {
        var batch = jdbc.query("select id, destination, payload from " + Outbox.TABLE
                        + " order by id limit " + batchSize + " for update skip locked",
                (rs, i) -> new Pending(rs.getLong("id"), rs.getString("destination"), rs.getString("payload")));
        for (var event : batch) {
            var message = MessageBuilder.withPayload(event.payload())
                    .setHeader("contentType", MimeTypeUtils.APPLICATION_JSON_VALUE)
                    .build();
            if (!broker.send(event.destination(), message)) {
                // stop here: the rest waits, so per-destination order is kept
                log.warn("Outbox: {} rejected event {}, will retry", event.destination(), event.id());
                return;
            }
            jdbc.update("delete from " + Outbox.TABLE + " where id = ?", event.id());
        }
    }
}
