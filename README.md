# Pulse — API

[![CI](https://github.com/ouvarov/nestSocialNetwork/actions/workflows/ci.yml/badge.svg)](https://github.com/ouvarov/nestSocialNetwork/actions/workflows/ci.yml)

NestJS API for **Pulse**, a small social network: profiles, posts with images, likes and real-time chat.

The web client lives in a separate repo: [ouvarov/viteSocialNetwork-](https://github.com/ouvarov/viteSocialNetwork-) (React, Vite, TanStack Query).

> Work in progress. Next: a live demo.

## Stack

- NestJS 12, TypeScript 6 (strict)
- PostgreSQL with Drizzle ORM and SQL migrations
- Redis (optional): cache and rate-limit storage; falls back to memory without `REDIS_URL`
- JWT access token + rotating refresh token in an httpOnly cookie
- Socket.IO for chat
- Image storage on the local disk or Supabase Storage
- Env validated with zod at startup; Swagger at `/docs`, committed `openapi.json`

## Getting started

Requires Node.js 24.9+ and PostgreSQL. Nest 12 packages are ESM-only; the app stays CommonJS and loads them through `require(esm)`, and Jest runs with `--experimental-vm-modules` for the same reason.

```bash
npm ci
cp .env.example .env   # set DATABASE_URL and the two secrets (openssl rand -hex 32)
npm run db:migrate
npm run db:seed        # optional demo data
npm run start:dev
```

The API runs on http://localhost:5000, Swagger UI on http://localhost:5000/docs.

### Docker

```bash
cp .env.example .env   # set the two secrets
docker compose up --build
```

Starts Postgres, Redis, runs migrations and serves the API on port 5000. `docker compose --profile seed up seed` adds demo data.

## API contract

`openapi.json` is generated from the controllers and committed. The web client generates its types from the copy on `main`, so a changed endpoint shows up there as a type error.

```bash
npm run openapi:generate   # rewrite openapi.json
npm run openapi:check      # fail if it is out of date
```

Socket.IO events are not part of the spec; the client types them in `src/api/socket-events.ts`.

## Health

| Endpoint                | Answers                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `GET /api/health/live`  | the process is up                                           |
| `GET /api/health/ready` | Postgres and Redis respond; 503 with the failing one if not |

## Tests

- **Unit** (`src/**/*.spec.ts`): services, token rotation, cursors, error mapping and env validation, with the database mocked.
- **E2E** (`test/*.e2e-spec.ts`): the whole app on a random port against a real Postgres, through Supertest and a Socket.IO client. They cover auth and refresh-token reuse, posts and likes, uploads, chats and their membership rules, live messages, rate limits, CORS and health.

```bash
npm test
npm run test:e2e   # needs DATABASE_URL and a migrated database
```

E2E tests create their own users with unique emails and never clean the database, so they are safe to run against a dev database. They use in-memory cache and rate limits regardless of `REDIS_URL`, and remove the images they upload.

## CI

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

| Job     | What it checks                                                       |
| ------- | -------------------------------------------------------------------- |
| Quality | type-check, ESLint, Prettier, `openapi.json` is up to date           |
| Unit    | Jest                                                                 |
| E2E     | migrations and the e2e suite on a Postgres service container         |
| Docker  | the image builds, migrations run and `/api/health/ready` answers 200 |

The web repo's CI also checks out this repo's `main` and runs its Playwright suite against it.

## Scripts

| Script                     | What it does                         |
| -------------------------- | ------------------------------------ |
| `npm run start:dev`        | Dev server with watch                |
| `npm run build`            | Compile to `dist/`                   |
| `npm run check`            | Type-check, ESLint and Prettier      |
| `npm test`                 | Unit tests                           |
| `npm run test:e2e`         | E2E tests against `DATABASE_URL`     |
| `npm run db:generate`      | Generate a migration from the schema |
| `npm run db:migrate`       | Apply migrations                     |
| `npm run db:seed`          | Demo data                            |
| `npm run openapi:generate` | Regenerate `openapi.json`            |
