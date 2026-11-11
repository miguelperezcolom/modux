---
title: AI-Assisted Code Completion
description: Use Claude AI to generate proposals for the custom code that Modux cannot derive from the spec alone
---

The generator writes the structure of a system. The business rules are hooks in the custom zone: each one states what the model intends and fails until someone implements it. `mvn modux:ai-complete` implements them with your local AI command line.

```bash
mvn modux:generate
mvn modux:ai-complete
```

For each service with pending hooks, the goal:

1. Sends the command line those hooks and the generated contracts they may use (domain, outbound ports, the read side — read models and their queries —, commands, results and the use case itself, so a hook never repeats what the use case does after it).
2. Writes the answer, only inside `{service}-custom/src/main/java`.
3. Compiles the service. If it does not compile, it sends the errors back, up to three attempts.
4. If it never compiles, restores the hooks as they were and fails.

A hook is pending while it still says so, so hooks already implemented are never touched and running the goal twice is harmless. The exception is a hook the **model changed under it**: when the service no longer compiles because a hook was written for an older contract (a call added before it now hands it the answer, say), the goal sends that hook too, marked as outdated with the compiler's errors, and asks for it to be adapted keeping its logic. Review the result before committing it: it compiles, but only you can tell whether it does what the business needs.

## Writing intents that work

The result is only as good as the model. State the rule and the outcome on the step's `intent`, and name where each value comes from. A field the model never explains, such as "who opened it", stays empty.

## Configuration

| Property | Default | |
|---|---|---|
| `modux.ai.command` | `claude -p --output-format text` | Reads the prompt on stdin and answers on stdout |
| `modux.ai.build` | `mvn -q compile -DskipTests` | How to check the result |
| `modux.ai.timeoutMinutes` | `15` | For each call |
| `modux.outputPath` | The model's `outputPath` | |
