# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Sessions**: express-session + connect-pg-simple
- **Auth**: bcryptjs password hashing + session cookies

## Project: Bolão Copa 2026

World Cup 2026 betting pool (bolão) application for ~20 users.

### Features
- Email+password authentication with invite-only registration
- Match predictions for all World Cup stages (group through final)
- Betting deadline: 30 minutes before each match
- Scoring: Exact score (10pts), correct outcome+goal diff (7pts), correct outcome (5pts)
- Bonus bets: Champion prediction (15pts), Top Scorer (10pts)
- Real-time leaderboard with tiebreaker rules
- Admin panel: create matches, enter results, manage invites
- Match bets revealed to all users after betting deadline

### Scoring Rules
- Exact score: **10 points**
- Correct outcome + correct goal difference: **7 points**
- Correct outcome only: **5 points**
- Wrong outcome: **0 points**
- Bonus champion prediction: **15 points**
- Bonus top scorer prediction: **10 points**

### Tiebreaker Order
1. Most exact scores
2. Most correct outcomes
3. Most bets submitted

### Seeded Users (Development)
- **Admin**: admin@bolao.com / admin123
- **Participant**: joao@example.com / senha123

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── bolao/              # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # Database seed script
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema (Normalized)

- `groups` — id, name (A-L), description
- `teams` — id, name, flag (emoji), fifa_code (unique), group_id (FK → groups)
- `users` — id, email, password_hash, name, role (admin|participant)
- `invites` — id, email, token, used, expires_at
- `matches` — id, home_team_id (FK → teams, nullable), away_team_id (FK → teams, nullable), home_placeholder, away_placeholder, group_id (FK → groups, nullable), match_date, stage (group|round_of_32|round_of_16|quarterfinal|semifinal|third_place|final), match_number, venue, home_score, away_score, status
- `bets` — id, user_id, match_id, home_score, away_score, points, exact_score, correct_outcome, correct_goal_diff
- `bonus_bets` — id, user_id, champion, top_scorer, champion_points, top_scorer_points, locked
- `sessions` — sid, sess, expire (auto-created by connect-pg-simple)

### Seeded Data
- 12 groups (A-L), 4 teams each = 48 teams total (World Cup 2026 format)
- 12 group stage matches + 7 knockout placeholder matches
- Admin and 4 sample participant accounts

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, session, JSON/urlencoded parsing, routes at `/api`
- Routes: `/api/auth`, `/api/groups`, `/api/teams`, `/api/matches`, `/api/bets`, `/api/rankings`, `/api/admin`, `/api/bonuses`, `/api/invite`
- Auth: `src/lib/auth.ts` — `requireAuth` and `requireAdmin` middleware
- Scoring: `src/lib/scoring.ts` — `calculateBetPoints()` function

### `artifacts/bolao` (`@workspace/bolao`)

React + Vite frontend. Pages: Login, Dashboard, Matches, Leaderboard, Profile, Admin.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `pnpm --filter @workspace/db run push` — push schema changes to DB

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`).

- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks + Zod schemas
