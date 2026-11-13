package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.out.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Append-only access to the ${aggregate.name} event store. Generated plumbing (sequencing,
 * serialization, ordered load); call {@link #append} from the aggregate's operations to record
 * domain events, and {@link #history} to read the stream back.
 *
 * <p>This is the write side of event sourcing. Rebuilding ${aggregate.name} state by folding its
 * events (replacing the current-state JPA persistence) is the next step — see
 * {@code docs/design/event-sourcing.md}.
 */
@Component
@RequiredArgsConstructor
public class ${aggregate.name}EventAppender {

    private final ${aggregate.name}EventStore store;
    private final ObjectMapper objectMapper;
    private final ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.application.out.CurrentUser currentUser;

    /** Append a domain event for the given aggregate id, assigning the next sequence number. */
    @SneakyThrows
    public void append(String aggregateId, Object event) {
        var history = store.findByAggregateIdOrderBySequenceNumberAsc(aggregateId);
        var nextSequence = history.isEmpty()
                ? 1L
                : history.get(history.size() - 1).getSequenceNumber() + 1;
        var entity = new ${aggregate.name}EventEntity(
                null,
                aggregateId,
                nextSequence,
                event.getClass().getSimpleName(),
                objectMapper.writeValueAsString(event),
                LocalDateTime.now(),
                currentUser.username());
        store.save(entity);
    }

    /** Append a record of the given type (e.g. the state the aggregate was saved in). */
    @SneakyThrows
    public void append(String aggregateId, String eventType, Object payload) {
        var history = store.findByAggregateIdOrderBySequenceNumberAsc(aggregateId);
        var nextSequence = history.isEmpty()
                ? 1L
                : history.get(history.size() - 1).getSequenceNumber() + 1;
        store.save(new ${aggregate.name}EventEntity(
                null,
                aggregateId,
                nextSequence,
                eventType,
                objectMapper.writeValueAsString(payload),
                LocalDateTime.now(),
                currentUser.username()));
    }

    /** The ordered event stream for an aggregate id. */
    public List<${aggregate.name}EventEntity> history(String aggregateId) {
        return store.findByAggregateIdOrderBySequenceNumberAsc(aggregateId);
    }
}
