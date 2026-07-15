# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Access Gatekeeper is a learning-focused project that simulates temporary access control (starting with SSH) for
services on a personal server. A user requests temporary access via an Angular dashboard; the API persists the
request and publishes it to a queue; a worker simulates granting/revoking access and pushes status back to the
frontend in real time via SSE. Phase 1 is local-only: no real firewall changes, no authentication, no internet
exposure. The learning goals are async processing (SQS), DynamoDB single-table design, SSE, DDD/Clean
Architecture with fp-ts, Moon monorepo orchestration, Kubernetes, and Tilt.

## Current State

The repository is at the very start of **Phase 1A**. Only the scaffolding exists:

- `apps/api` and `apps/worker` are unmodified `nest new` scaffolds (default `AppController`/`AppService`, no
  domain code yet).
- `apps/web` (Angular), `infra/` (Kubernetes/LocalStack/Terraform), `Tiltfile`, `docker-compose.yml`, and the
  `packages/*` shared packages do not exist yet.
- Moon (v2) is fully configured and is this repo's task runner — use `moon run`, not ad-hoc `pnpm --filter`.
  Toolchains (node, pnpm) are in `.moon/toolchains.yml`. Task philosophy is **minimal inheritance**:
  `.moon/tasks/javascript.yml` holds only what is universal to every JavaScript project (file groups,
  `implicitInputs`, the `lint` task — ESLint config lives at the workspace root); framework-specific tasks
  (`dev`, `build`, `test*` — all Nest-flavored) live in each app's own `moon.yml`. Keep it this way: the future
  Angular `apps/web` must not inherit Nest tasks. `.prototools` pins proto and moon versions so the bare `moon`
  binary matches the repo.

Keep this section updated as the project evolves — future instances rely on it.

## Commands

Task naming follows `moon run <project>:<task>`, where `<project>` is `api` or `worker`:

```bash
pnpm install                    # install all workspace packages (root)

moon run api:dev                # run API with watch mode
moon run worker:dev             # run worker with watch mode

moon run api:build              # nest build
moon run api:lint               # eslint --fix
moon run api:test               # jest unit tests
moon run api:test-watch         # jest watch mode
moon run api:test-cov           # jest with coverage
moon run api:test-e2e           # jest e2e (test/jest-e2e.json)
```

The same task set applies identically to `worker`. App tasks are defined in `apps/<app>/moon.yml`; only `lint`
and shared file groups are inherited from `.moon/tasks/javascript.yml` (in moon v2 the filename is a label —
the real scoping is the file's `inheritedBy.toolchains` setting).

```bash
# single test file / single test name (run inside apps/api or apps/worker)
pnpm test -- app.controller.spec.ts
pnpm test -- -t "test name"
```

Jest's `rootDir` is `src`, so spec files live next to the code they test (`*.spec.ts`), and e2e tests live in
`test/`.

Tooling constraints:

- ESLint/Prettier config and their dependencies live at the **workspace root** (`eslint.config.mjs`,
  `.prettierrc`); the apps do not have their own copies.
- The root `typescript` must stay on the same major line as the apps (currently 6.x, upgraded 2026-07 together
  with `typescript-eslint` 8.63). TypeScript 6 no longer auto-includes `node_modules/@types` and requires an
  explicit `rootDir` when `outDir` is set (TS5011), so the app tsconfigs declare `types: ["jest", "node"]` and
  `rootDir: "."`, with `tsconfig.build.json` overriding `rootDir: "./src"` to keep the `dist/main.js` layout.
  TypeScript 7 is still blocked: typescript-eslint's peer range is `<6.1.0` and ts-jest's is `<7`. Upgrade root
  and apps together, only when typescript-eslint / ts-jest / Nest support the new major.
- Do not add `incremental: true` to the app tsconfigs. It writes a `.tsbuildinfo` outside `dist/` that survives
  Nest's `deleteOutDir: true`, so a rebuild trusts stale state and emits an empty `dist/` while exiting 0 (moon
  catches it as `missing_outputs`). Moon's input-hash cache already covers skip-if-unchanged, correctly.

## Architecture Rules

These rules guide all new code in `apps/api` and `apps/worker`, even for Phase 1's simplified scope. The heavier
DDD/Clean Architecture style is intentional — learning the modeling is a project goal, not overengineering.

**Layering** — strict one-way dependency flow:

```
Controller -> Use Case / Handler -> Domain Model -> Ports -> Infrastructure Adapters
```

- Handlers are application-layer orchestrators: they validate input at the boundary, call domain factories/methods,
  call repository or publisher **ports** (interfaces), and compose flows with fp-ts. They must not contain domain
  rules inline, must not import DynamoDB/SQS clients directly, and must not mix HTTP concerns with domain
  decisions.
- The domain layer must stay pure and framework-free: no NestJS, no AWS SDK, no HTTP DTOs, no DB item shapes.
  Business rules belong in aggregates, value objects, and domain events — not in handlers.
- Infrastructure adapters (DynamoDB, SQS) implement the ports defined by the application layer; they are the only
  place AWS SDK / LocalStack clients are used.

**fp-ts** — `Either` for validation/domain-object creation that can fail; `TaskEither` for async I/O (DynamoDB,
SQS, HTTP calls to the worker/API); `pipe` to compose use-case flows. Errors are modeled explicitly as domain
error types, not thrown exceptions, across application/infrastructure boundaries.

**Feature-first layout** — feature code lives close to its owning module, split by layer:
`apps/api/src/access-requests/{domain,application,infrastructure,presentation}`. Only extract to
`packages/domain|application|infrastructure` when code is genuinely reused across API and worker, and do so
intentionally.

## Domain Model (Phase 1)

- **Access Request lifecycle**: `PENDING -> PROCESSING -> GRANTED -> REVOKED`, with `FAILED` on error.
- **Duration**: optional `durationMinutes` — default 30, min 1, max 120. `expiresAt` is computed by the API.
- **Domain events / SSE event types**: `ACCESS_REQUESTED`, `ACCESS_GRANTED`, `ACCESS_REVOKED`, `ACCESS_FAILED`.
- **Flow**: API receives the request, stores it in DynamoDB (status `PENDING`) plus an `ACCESS_REQUESTED` event
  item, then publishes to SQS. The worker consumes the message, updates status to `PROCESSING`, simulates the
  grant (`GRANTED`), waits for/simulates expiration (`REVOKED`), and after each transition calls
  `POST /internal/events` on the API, which forwards the event to the frontend over SSE. No real firewall or SSH
  changes happen in Phase 1.
- **API endpoints**: `POST /access-requests`, `GET /access-requests`, `GET /access-requests/:id`,
  `GET /access-requests/:id/events`, `GET /events/stream` (SSE), and internal-only `POST /internal/events`
  (worker -> API; must be protected in a later phase). Unauthenticated by design in Phase 1.
- **DynamoDB single-table design**: table `AccessGatekeeperTable`, keys `PK`/`SK`. Request item:
  `PK = ACCESS_REQUEST#<requestId>`, `SK = METADATA`. Event item: `PK = ACCESS_REQUEST#<requestId>`,
  `SK = EVENT#<ISO timestamp>`. Items carry an `entityType` field (`ACCESS_REQUEST` / `ACCESS_EVENT`). Scans are
  acceptable in Phase 1; GSIs come later when access patterns are clearer.
- **SQS**: queue `access-requests-queue` (on LocalStack). The message carries `requestId`, `service`, `sourceIp`,
  `internalPort`, `externalPort`, `durationMinutes`, `expiresAt`; the worker may still re-read the full item from
  DynamoDB.

## Roadmap

Phases, in order — do not implement ahead of the current phase:

1. **1A (current)** — backend flow without Kubernetes: LocalStack via Docker Compose, DynamoDB table + SQS queue,
   API endpoints, worker consumer, simulated grant/revoke, SSE; validated with curl/logs before any frontend.
2. **1B** — Angular dashboard (`apps/web`) consuming the API and SSE stream.
3. **2** — local Kubernetes (kind): Dockerfiles, manifests under `infra/k8s/local/`, port-forwarding is fine.
4. **3** — Tilt workflow for the local cluster.
5. **4** — authentication (login, JWT/session, protect all endpoints, internal API token for worker->API).
6. **5** — fake host agent service (`POST /grant-access`, `POST /revoke-access`, simulated success).
7. **6** — real host agent on the personal server (systemd, UFW/nftables, strong auth, expiration safety).
8. **7** — personal server Kubernetes deployment (k3s candidate; host agent stays outside Kubernetes).
9. **8** — Terraform, only after the architecture is stable.

Do not add authentication, real firewall/SSH logic, or public exposure before Phase 4 — Phase 1 must remain
local-only and unauthenticated by design.
