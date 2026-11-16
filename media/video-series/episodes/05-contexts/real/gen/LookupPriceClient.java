package io.tickets.sales.application.out.remote;

/**
 * The LookupPrice use case of the catalog service, as this context calls it: over HTTP, with its
 * own copy of the request and the response — the two share no code.
 */
public interface LookupPriceClient {

  record Request(String concertId) {}

  /** What it answers. */
  record Response(java.math.BigDecimal price, String status, String artist) {}

  Response call(Request request);
}
