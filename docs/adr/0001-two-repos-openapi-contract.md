# ADR-0001: Two repositories with an OpenAPI contract

- Status: accepted
- Date: 2026-10-20

## Context

Pulse has a NestJS API and a React client. They started as two repositories. Before polishing them, I considered merging them into a monorepo with shared zod schemas.

Two facts pushed the other way:

- **Reviewers look at one side.** A frontend reviewer opens the web repo and a backend reviewer opens the API repo. Each should make sense alone.
- **The real bugs were contract drift.** The client and the API disagreed on snake_case and camelCase field names, so every link in the chat list went to `/chat/undefined`. A shared package would fix this only if both sides import it. A generated contract fixes it without coupling the build tooling.

## Decision

- Keep two repositories. Each README links to the other.
- The API is the source of truth.
  - Swagger decorators on controllers and DTOs describe every endpoint.
  - `npm run openapi:generate` writes `openapi.json`, and the file is committed.
  - CI fails if the committed spec is out of date (`openapi:check`).
- The web repo pulls `openapi.json` from the API `main` branch and generates types with `openapi-typescript`. Every request goes through a typed `openapi-fetch` client. Feature types are aliases of the generated schemas, so a renamed field breaks `tsc` rather than the UI.
  - The web CI's `api:check` fails when the API `main` has changed the contract and the web repo hasn't regenerated.
  - The web E2E job runs Playwright against the API `main`.
- Socket.IO events are not part of OpenAPI. They are typed by hand in the web repo (`src/api/socket-events.ts`) and covered by the e2e tests on both sides.

## Consequences

- Each repository builds, tests and deploys on its own.
- A change that touches both sides takes two PRs: the API first, then the web after regenerating the types. The checks above catch the order being wrong.
- The contract is checked at the next CI run, not at compile time across both repos.
- Socket events can still drift. The e2e suites are the safety net there.
