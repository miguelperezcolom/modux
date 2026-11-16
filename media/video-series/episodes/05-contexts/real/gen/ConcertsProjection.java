package io.tickets.sales.infra.in.projection;

import io.tickets.sales.infra.out.persistence.ConcertViewReadModelEntity;
import io.tickets.sales.infra.out.persistence.ConcertViewReadModelEntityRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.function.Consumer;

@Configuration
@RequiredArgsConstructor
public class ConcertsProjection {

  final ConcertViewReadModelEntityRepository repository;
  final ObjectMapper mapper;

  @Bean
  public Consumer<Message<String>> concertsProjectionOnConcertEstado() {
    return message -> {
      try {
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) mapper.readValue(message.getPayload(), Map.class);
        var id = payload.get("id") != null ? String.valueOf(payload.get("id")) : null;
        var entity =
            id != null
                ? repository.findById(id).orElseGet(ConcertViewReadModelEntity::new)
                : new ConcertViewReadModelEntity();
        entity.setId(id);
        entity.setArtist((String) payload.get("artist"));
        entity.setVenue((String) payload.get("venue"));
        entity.setDate(
            payload.get("date") != null ? LocalDate.parse(payload.get("date").toString()) : null);
        entity.setCapacity(
            payload.get("capacity") != null ? ((Number) payload.get("capacity")).intValue() : null);
        entity.setPrice(
            payload.get("price") != null ? new BigDecimal(payload.get("price").toString()) : null);
        entity.setStatus((String) payload.get("status"));
        entity.setZones((String) payload.get("zones"));
        entity.setDescription((String) payload.get("description"));
        repository.save(entity);
      } catch (Exception e) {
        throw new RuntimeException("Error in ConcertsProjection.onConcertEstado", e);
      }
    };
  }

  @Bean
  public Consumer<Message<String>> concertsProjectionOnConcertBorrado() {
    return message -> {
      try {
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) mapper.readValue(message.getPayload(), Map.class);
        var id = payload.get("id") != null ? String.valueOf(payload.get("id")) : null;
        if (id != null) repository.deleteById(id);
      } catch (Exception e) {
        throw new RuntimeException("Error in ConcertsProjection.onConcertBorrado", e);
      }
    };
  }
}
