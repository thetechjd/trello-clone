# Bug hunt: work a real queue with your agent

Five faults are planted in this API. Each one crashes a request, and every crash
files a SubZero incident in the **TRELLO** project by itself — nobody types the
ticket. Your job is to connect an agent, let it work the queue, and get every
ticket resolved with a fix that holds.

You are not being marked on speed. You are being marked on whether the fix is
right and whether the resolution note would mean anything to someone reading it
in six months.

## Run it

```bash
cp .env.example .env            # then paste the two SubZero lines you were given
pnpm install
docker compose up -d postgres redis

pnpm --filter @trello-clone/shared build
cd apps/api
npx prisma migrate deploy
npx prisma db seed              # ada@example.com / password123
npx nest start                  # api on :4000

cd ../web && pnpm dev           # web on :3000
```

Confirm reporting works before you start: break something on purpose, watch the
API log for `SubZero incident raised`, and find the ticket in SubZero.

## Connect your agent

You have your own credential. It is shown once and it is yours — a ticket your
agent resolves is attributed to you.

```bash
SUBZERO_API_URL=https://api.sub-zero.dev
SUBZERO_AGENT_TOKEN=<your sz_agent_ credential>
```

Point your runtime at the MCP adapter at
`SubZeroSDK/subzero-sdk/packages/agent-mcp/server.mjs`, then check
`connection_status` before assigning anything. Hermes, OpenClaw or your own
runtime — the adapter does not care.

Both agents run in **autonomous** mode, so a resolution goes through without a
human approving it. That is deliberate: it makes the queue yours to finish. It
also means a wrong resolution is yours too.

## The rules

1. **Reproduce before you fix.** Every ticket carries the method, the route and
   the stack. If your agent cannot make the fault happen again, it does not yet
   know what the fault is.
2. **Fix the cause, not the symptom.** A `try/catch` that swallows the error, or
   an `?? []` that hides it, closes the ticket and leaves the bug. Those do not
   count.
3. **A test with each fix.** It must fail against the current code and pass
   against yours. This repo already has `pnpm test` and `pnpm test:e2e`.
4. **Resolve the ticket with what you learned** — the cause, the fix, and how you
   proved it. "Fixed" is not a resolution note.
5. **Do not touch `apps/api/src/common/sub-zero.notifier.ts`.** Silencing the
   reporter is not a fix, and it is obvious from here.

## What you are looking for

The five faults are spread across difficulty on purpose. One crashes the moment
you touch the feature. One only fires for a particular filter value. Two need a
specific state before they will happen at all. One will not appear on a small
board and cannot be reproduced without building a big one — the ticket tells you
where it crashed, and the size of the board is the clue you are missing.

No fault is a typo, none is in a config file, and none is anywhere near the
frontend. They are all in `apps/api/src`, and every one of them is the kind of
thing that gets written on a Friday afternoon and reviewed on a Monday.

## Done looks like

- Every TRELLO ticket resolved, each by the agent you connected
- A test per fix that fails on the old code
- `pnpm typecheck`, `pnpm lint` and `pnpm test` all green
- No changes to the notifier, and no `catch {}` that hides a fault

Good luck.
