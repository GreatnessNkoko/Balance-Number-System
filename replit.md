# Balance Number System

A simple public flow for claiming one unique number from a shared pool of 14, with a protected administrator dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — managed by Replit
- Required secret: `SESSION_SECRET` — signs participant and admin session cookies
- Required secret: `ADMIN_PASSWORD` — administrator password; username is `admin`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/balance-system/src/App.tsx` — public registration, selection, result, and admin routes
- `artifacts/balance-system/src/index.css` — shared visual theme and responsive styles
- `artifacts/api-server/src/routes/balance.ts` — participant registration, availability, selection, and session lookup
- `artifacts/api-server/src/routes/admin.ts` — admin authentication and assignment dashboard
- `artifacts/api-server/src/lib/session.ts` — signed HTTP-only session cookies
- `lib/db/src/schema/participants.ts` — PostgreSQL participant table and uniqueness constraints
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and Zod schemas

## Architecture decisions

- Participant names are trimmed, whitespace-collapsed, Unicode-normalized, and compared through a unique normalized value so legitimate accented, hyphenated, and apostrophe names remain valid.
- The selected number is unique at the database level and selection runs in a PostgreSQL transaction with a row lock on the participant; concurrent collisions fail safely.
- Public and admin sessions use signed, HTTP-only, SameSite cookies backed by `SESSION_SECRET`; database state remains authoritative for ownership and repeat-selection protection.
- The admin surface is intentionally read-only: it exposes only the 14 number assignments and summary counts.

## Product

- Participants enter a name once, see a randomized availability grid, and permanently claim one number.
- Selected numbers are disabled for everyone else; refreshes, back-button navigation, repeat requests, and simultaneous requests cannot create duplicate ownership.
- Administrators sign in at `/admin` and see total, selected, remaining, name-to-number assignments, status, and selection time.

## User preferences

The public experience should stay simple, mobile-friendly, professional, and free of unnecessary features.

## Gotchas

- Keep `ADMIN_PASSWORD` and `SESSION_SECRET` in Replit Secrets; never move either into frontend code, README examples, or committed environment files.
- If the API contract changes, run codegen before using the generated hooks or Zod schemas.
- Use `pnpm --filter @workspace/db run push` for development schema changes; production schema changes are applied through Replit publishing.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
