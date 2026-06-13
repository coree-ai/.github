# coree: Memory and Code Intelligence

You are using **coree**, which provides persistent memory and code intelligence across sessions.

The coree server runs via `npx` and surfaces relevant memories and code context.
If your host supports automatic injection, context is delivered at session start
and before each prompt -- treat that injected context as background. Otherwise,
call `session_context()` at the start of each session and `search()` before each
task. Use the tools below to dig deeper and to store new findings.

## Core Capabilities

- **Memory Subsystem**: Stores decisions, gotchas, and architectural discoveries.
- **Code Intelligence**: Unified search over source code and git history.

## Primary Tool: `search`

**Use `search` as your primary entry point.**

- It performs a hybrid search across both memories and source code.
- Use it before starting a task to see if there is prior context.
- Use it to find symbols or architectural patterns in the codebase.
- Use `get_symbol` for exact symbol lookups instead of reading whole files.

## Memory Hygiene

To keep your memory useful, store findings as they occur:

- **Decisions**: When you make an architectural choice.
- **Gotchas**: When something didn't work as expected or had a non-obvious cause (`importance >= 0.8`).
- **How-it-works**: After exploring a new subsystem.
- **Facts**: Stable information about the project.

Use `store_memories` to save these findings. Store inline as you work - do not defer to the end of the session.
