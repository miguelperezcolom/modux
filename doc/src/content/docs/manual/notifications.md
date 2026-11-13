---
title: Notifications
description: When an event happens, tell these roles through these channels
---

A **Notification** is declared by intent: WHEN an event happens, TELL these roles
through these channels. The model declares the what; delivery plumbing (provider,
retries) is a generation-time decision — the project's `emailProvider` already
names the transport.

| Field | Description |
|---|---|
| **Owner bounded context** | The context that owns (and sends) it |
| **Event** | The domain/application event that fires it |
| **Channels** | `EMAIL`, `SMS`, `PUSH`, `WEBHOOK` |
| **Recipients** | Roles (their contact derives from the subject's profile), plus an optional expression (`resource.cliente.email`) |
| **Template** | Subject and body with `{placeholders}` over the event payload — [i18n](/manual/i18n/)-ready |

## What gets generated

With an email provider in the deployment (`emailProvider: SMTP`), every module gets a `MailSender`
port and its SMTP adapter (`spring.mail.*`, `MAIL_HOST`…; locally the compose starts **Mailpit**, whose
inbox is at `http://localhost:8025`). Each `EMAIL` notification becomes a consumer of its event that
sends the subject and body with every `{field}` replaced by the event's value (escaped in the HTML
body), to the event's field named by the recipient expression and to the people of each role
(`NOTIFY_<ROLE>`: their emails, comma-separated). A failed send is retried by redelivering the event.

The custom zone can inject `MailSender` too, for mail whose recipients are decided by logic (a
digest, the subscribers of a topic).

## On the context map

Palette: **Notificación** (Dominio group, pink), dropped on its bounded context —
a chip at the detail level. Wire it by drawing:

- **event → notification**: that event fires it («dispara»; Supr unpoints);
- **notification → actor**: that role gets notified (edge labeled with the channel;
  Supr removes the recipient).

Deleting the chip removes the notification; undo rebuilds it with its event and
recipients.
