---
title: Roles & Security
description: Role-based access control in Modux
---

Modux generates **Role-Based Access Control (RBAC)** definitions for your application. Roles define what operations each type of user can perform.

## Creating a role

1. Open a bounded context and go to **Roles** (under the Security section)
2. Click **New**
3. Configure and save

## Configuration

| Field | Description |
|---|---|
| **Name** | Role name (e.g. `ADMIN`, `BOOKING_MANAGER`, `READ_ONLY`) |
| **Description** | What this role represents |
| **Permissions** | List of allowed operations for this role |

### Permissions

Permissions reference operations defined on your aggregates:

| Permission format | Example |
|---|---|
| `{aggregate}:create` | `booking:create` |
| `{aggregate}:update` | `booking:update` |
| `{aggregate}:delete` | `booking:delete` |
| `{aggregate}:{operation}` | `booking:confirmBooking` |
| `{aggregate}:read` | `booking:read` |
| `*` | All operations (admin) |

## What gets generated

For a `BOOKING_MANAGER` role:

- Role constant in a `Roles.java` class
- Spring Security method security annotations on the relevant use cases
- Role-to-permission mapping configuration

## One login without an identity provider

With roles and no identity provider, every service and the UI shell get the model's roles as
scaffold users (username = password = the role's name in lower case) and **one login serves the
whole system**: the shell asks for it, and its form login leaves a signed cookie (`MODUX_AUTH`,
HMAC with `MODUX_AUTH_SECRET`) that every service behind the gateway accepts. Agents and `curl`
keep using HTTP Basic. `mvn modux:deploy` creates a random secret per Kubernetes namespace; the
local compose uses a development one. Declare an identity provider for real users.

## With an identity provider

With an [identity provider](/manual/identity/#what-an-idp-generates) connected to the apps, people
sign in there and the same `MODUX_AUTH` cookie carries their **realm roles**: a realm role named
like a model role (`CLIENTE`) is that role (`ROLE_CLIENTE`) for the use cases, the CRUDs and the
menus. Agents and `curl` send the IdP's JWT instead, read the same way. A local Keycloak comes
generated with one user per role.

## Securing operations

Permissions are automatically applied to generated use cases:

```java
@PreAuthorize("hasAuthority('booking:confirmBooking')")
public void execute(ConfirmBookingCommand command) {
    // ...
}
```

You can override or extend these annotations in your custom implementations.

## Next steps

- Review the [Architecture Reference](/reference/architecture/) to understand how security fits into the hexagonal architecture
- Configure IAM integration in your [Project](/manual/projects/) settings
