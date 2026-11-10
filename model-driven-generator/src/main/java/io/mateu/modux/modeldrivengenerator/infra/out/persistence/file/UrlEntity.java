package io.mateu.modux.modeldrivengenerator.infra.out.persistence.file;

import io.mateu.modux.modeldrivengenerator.domain.shared.Identifiable;

/**
 * A URL — the address where something is reachable. It lives on the
 * distribution map: services declare the urls they answer at (a service can
 * have one or more).
 */
@lombok.Builder(toBuilder = true)
public record UrlEntity(
        String id,
        String name,
        String description,
        /** The address itself (e.g. https://api.acme.com). */
        String url,
        /** The environment (DEV, STAGING, PROD) this address belongs to; none = every one. */
        String environment
,
        /** The project this element belongs to (selection scoping; null = legacy, claimed on open). */
        String projectId
) implements Identifiable {
}
