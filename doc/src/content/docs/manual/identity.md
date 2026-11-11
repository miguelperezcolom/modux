---
title: Identity & Security (IAM/IdP)
description: Who issues the identities the system trusts — and who may do what with which data
---

An enterprise information system needs three security answers, and modux models each one:

| Question | Element | Where |
|---|---|---|
| **Who are you?** (authentication) | **Identity Provider** | This page |
| **What may you do?** (RBAC) | [Roles](/manual/roles/) + `allowedRoles`/`allowedScopes` on use cases | Behaviour |
| **On which data?** (ABAC) | **Access policies** on a bounded context | Below |

## Identity providers

An **IdP** is a first-class element: who issues the identities the rest of the model
trusts. Types: `CORPORATE` (employees), `B2C` (customers), `SOCIAL`, `PARTNER`. An IdP
is **ours** by default, or **federated** when an external system publishes it (a
partner's IdP, a social login) — drawn dashed, with a «publica» edge from its system.

Create it from the palette (**IdP (identidad)**, Estratégico group — key glyph, amber)
and wire the trust by drawing lines:

| Gesture | Meaning |
|---|---|
| **App → IdP** *(UI view)* | The app's users authenticate against this IdP («autentica con») |
| **Bounded context → IdP** *(context map)* | The context validates tokens issued by it («valida tokens de») |
| **ETL flow → IdP** *(context map)* | The pipeline runs as a **service identity** of this IdP — non-human subjects have identities too |
| **IdP → external system** *(context map)* | Federation: that system publishes the IdP |

Supr on any of those edges un-trusts (undoable); Supr on the IdP node deletes it and
clears every trust edge pointing at it. One system usually holds two or three IdPs —
the corporate one for the back-office apps and contexts, a B2C one for the customer
portal, a partner's for federated operations.

## What an IdP generates

An app connected to an IdP with an **issuer** (`https://host/realms/<realm>` for Keycloak) gets
one login for the whole system, at the IdP:

- the shell (and any service opened directly) signs people in with **OIDC login** — a public
  client with PKCE, `shell` for the shell and one per app, named after its path;
- on success it issues the system's own signed cookie, `MODUX_AUTH` (the same one the
  [login without an IdP](/manual/roles/#one-login-without-an-identity-provider) uses), carrying
  the user and the **realm roles** (`realm_access.roles` of the access token) as `ROLE_*`
  authorities — what the use cases' `@PreAuthorize` and the menus check;
- every service accepts that cookie, and also the IdP's **JWT** on its machine border
  (`/mateu/**`, `/mcp`) for agents and `curl` — with the same realm roles;
- leaving (`/logout`) clears the cookie and ends the IdP session.

Nothing is discovered at startup, so a service boots whether or not the IdP answers yet. Two
variables adapt it to where it runs:

| Variable | What it says | Default |
|---|---|---|
| `MODUX_PUBLIC_URL` | Where people enter (the IdP sends them back to `/login/oauth2/code/modux` there) | `http://localhost:8088` for the shell; the Kubernetes manifests set the environment's host |
| `MODUX_IDP_BACKCHANNEL` | Where the service reaches the IdP when it knows it by another name (token, keys, user info) | the issuer |

### A Keycloak on your machine

When the issuer is on `localhost` (`http://localhost:8080/realms/entradas`), the IdP is part of
the local system: generation writes its realm, `keycloak/<realm>-realm.json`, with the model's
roles, **one user per role** (username = password = the role's name in lower case) and the
clients of the shell and the apps. `mvn modux:deploy` (compose) and `up.sh` start Keycloak 26
with that realm imported — admin console at <http://localhost:8080> (`admin`/`admin`). Inside
compose the services reach it as `keycloak:8080` (`MODUX_IDP_BACKCHANNEL`) while the tokens keep
the browser's issuer.

### An IdP of your own

For an external IdP (a managed Keycloak, say), create in its realm the realm roles named like the
model's roles, and **public** clients with standard flow and PKCE (S256): `shell`, redirect URI
`https://<your-host>/*`, post-logout redirect `+`. No client secret travels in the deployment.

## Access policies (row-level authorization)

Beyond role checks, an **access policy** on a bounded context constrains **which rows** a
subject may see or act on — ABAC-lite, declared as a boolean expression over subject
and resource attributes:

```
subject.hotelId == resource.hotelId
```

It applies to an aggregate, a read model or a use case (`appliesToId`), and desugars
at generation time into query filters on read models/query services, guards on use
cases and UI hiding — the row-level security enterprise apps otherwise hand-roll.
Policies are edited in the bounded context's form (**Access policies** section).

## Roadmap

Declared, not yet modelled: **AI agents and scheduled triggers as service accounts**
(same pattern as ETL flows), a **scope catalog** with owners (today `allowedScopes`
are free strings), and **role ↔ IdP group provisioning** (mapping directory groups to
model roles). Lint rules for identity debt (an app with no IdP, a service subject
without identity) follow the same path.
