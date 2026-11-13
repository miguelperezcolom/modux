package ${project.packageName}.${module.name?lower_case?replace("[^a-z0-9]","",'r')}.infra.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Append-only event log for the event-sourced ${aggregate.name} aggregate. */
@Entity
@Table(name = "${aggregate.name?lower_case}_event")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ${aggregate.name}EventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "${aggregate.name?lower_case}_event_seq_gen")
    @SequenceGenerator(
            name = "${aggregate.name?lower_case}_event_seq_gen",
            sequenceName = "${aggregate.name?lower_case}_event_sequence",
            allocationSize = 1
    )
    Long id;

    @Column(name = "aggregate_id")
    String aggregateId;

    @Column(name = "sequence_number")
    Long sequenceNumber;

    @Column(name = "event_type")
    String eventType;

    /** The event (or the saved state), as JSON: no length limit (a document's blocks are long). */
    @Column(name = "payload", columnDefinition = "text")
    String payload;

    @Column(name = "occurred_at")
    LocalDateTime occurredAt;

    /** Who did it: the signed-in user (or the calling service) when it was recorded. */
    @Column(name = "recorded_by")
    String recordedBy;
}
