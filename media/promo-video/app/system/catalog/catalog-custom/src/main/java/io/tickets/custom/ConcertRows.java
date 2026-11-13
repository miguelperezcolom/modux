package io.tickets.custom;

import io.tickets.catalog.domain.aggregates.concert.Concert;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Turns Concert aggregates into the JSON array of m-concert-row items that the read use cases
 * return. The fields mirror ConcertRow.
 */
final class ConcertRows {

  static final Comparator<Concert> BY_DATE =
      Comparator.comparing(Concert::getDate, Comparator.nullsLast(Comparator.naturalOrder()));

  private ConcertRows() {}

  static String toJson(List<Concert> concerts) {
    StringBuilder json = new StringBuilder("[");
    boolean first = true;
    for (Concert concert : concerts) {
      if (!first) {
        json.append(',');
      }
      first = false;
      json.append('{');
      field(json, "id", concert.getId() == null || concert.getId().value() == null
          ? null
          : quote(String.valueOf(concert.getId().value())));
      json.append(',');
      field(json, "artist", quote(concert.getArtist()));
      json.append(',');
      field(json, "venue", quote(concert.getVenue()));
      json.append(',');
      field(json, "date", quote(date(concert.getDate())));
      json.append(',');
      field(json, "capacity", concert.getCapacity() == null ? null : String.valueOf(concert.getCapacity()));
      json.append(',');
      field(json, "price", number(concert.getPrice()));
      json.append(',');
      field(json, "status", quote(concert.getStatus() == null ? null : concert.getStatus().name()));
      json.append(',');
      field(json, "zones", quote(concert.getZones()));
      json.append(',');
      field(json, "description", quote(concert.getDescription()));
      json.append('}');
    }
    return json.append(']').toString();
  }

  private static void field(StringBuilder json, String name, String rawValue) {
    json.append('"').append(name).append("\":").append(rawValue == null ? "null" : rawValue);
  }

  private static String date(LocalDate date) {
    return date == null ? null : date.toString();
  }

  private static String number(BigDecimal value) {
    return value == null ? null : value.toPlainString();
  }

  private static String quote(String value) {
    if (value == null) {
      return null;
    }
    StringBuilder out = new StringBuilder("\"");
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '\t' -> out.append("\\t");
        case '\b' -> out.append("\\b");
        case '\f' -> out.append("\\f");
        default -> {
          if (c < 0x20) {
            out.append(String.format("\\u%04x", (int) c));
          } else {
            out.append(c);
          }
        }
      }
    }
    return out.append('"').toString();
  }
}