# rdk_build

Drop this file into your project and hand it to your coding agent /
harness. It tells the agent to pull an opinionated, build-ready spec from
RDK and build it — instead of making all the architecture decisions from
scratch.

## Usage

Give your harness this file plus what you want built:

```
run rdk_build.md trello clone
```

The word(s) after the filename are your query. The agent uses them to
retrieve the matching spec from RDK, then builds from it.

---

## Instructions for the agent

You are building an application. A complete, opinionated spec already
exists in RDK (stack, architecture, and all hard decisions are already
made). Retrieve it and build from it — do NOT re-decide things the spec
has already decided.

### Step 1 — Retrieve the spec from RDK

The user's query is the text they passed after `rdk_build.md` (e.g.
"trello clone"). Query RDK for it:

```bash
rdk query "<the user's query>" --json
```

Requirements:
- `RDK_API_KEY` must be set in your environment. If the command errors
  with a missing-credentials message, stop and tell the user to set
  `RDK_API_KEY` (from dashboard.retrodeck.ai → settings → API key).
- Do NOT run `rdk init`. You do not need to set up a node — you only need
  to query. `rdk query` works with just the API key.
- Parse the `--json` output. The top result(s) contain the spec.

If you are configured as an MCP client with RDK connected, call the
`rdk_query` tool instead of the shell command — same effect.

### Step 2 — Read the spec fully before writing any code

The retrieved spec contains the stack, architecture, data model, and
build tasks, with the opinionated decisions already resolved. Read all of
it first.

Do NOT ask the user to choose a framework, database, auth approach, or
architecture — the spec has already chosen. If the spec decided it, follow
it. Only ask the user if the spec is genuinely silent on something
build-blocking.

### Step 3 — Build from the spec

- Follow the spec's stack and architecture exactly.
- Work through its build tasks in order.
- When the spec made a decision, implement that decision rather than
  substituting your own preference.
- If the query returned multiple specs, use the highest-scoring match; if
  it's ambiguous which spec matches the user's intent, ask the user which
  one before building.

### Step 4 — Report

When done (or at a stopping point), tell the user:
- Which spec you retrieved and built from
- What you built
- Anything the spec left open that you had to decide, and what you chose

---

## Notes

- This flow is meant to test build speed and decision-load WITH an
  opinionated spec on hand. The point is that the agent should make far
  fewer decisions than building the same app from a bare prompt.
- If `rdk query` returns nothing for the user's query, tell the user — the
  spec for that app may not be indexed yet. Do not invent a spec and
  proceed as if it came from RDK.
