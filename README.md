# Time Hacker

Time Hacker is a bilingual, mobile-first timing game: stop the clock at exactly `10.00` seconds, or notice a tiny anomaly and discover one of 100 secrets that bend game time.

## What V2 includes

- Anonymous player identity persisted in local storage and PostgreSQL
- English and Simplified Chinese UI with a persistent language switch and localized secrets collection
- With Secrets mode containing 100 server-verified cheats, 20 per difficulty tier
- A 100-level authored campaign with stable database slugs, 22 production controller families, and a unique full-page visual signature for every level
- A common assisted landing rule: normal speed to `9.95`, then `0.01` displayed seconds per real second, with `10.00` held for three seconds
- Three progressive hint levels, including an explicit answer route, plus touch, pointer, and keyboard alternatives
- Pure Mode unlocked after the first successful run
- A strict `±10 ms` success window and a 50-start daily limit (UTC)
- Progression, nickname, collection, three ranking views, sharing, and isolated reset
- Keyboard-operable controls, reduced-motion support, responsive layouts, and accessible status feedback

The visual system is documented in [`docs/design-brief.md`](docs/design-brief.md). It uses a bright, playful stopwatch direction: a pale-sky canvas, deep-navy digits, one coral action, soft abstract shapes, and a deliberately quiet first screen. Language, mode, progress, secrets, ranking, nickname, and reset live in the menu instead of competing with the game.

## Requirements

- Node.js 22+
- pnpm 11+
- PostgreSQL reachable through `DATABASE_URL`

The application uses the existing database and its default `public` schema. It does not create a database or a separate schema.

## Local setup

1. Install dependencies:

   ```powershell
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and provide the database connection:

   ```env
   DATABASE_URL="postgresql://timehacker:replace-me@localhost:5432/timehacker"
   ```

   `.env.local` is ignored and must never be committed. Do not expose the connection string in client-side environment variables.

3. Validate the schema and verify the shared catalog:

   ```powershell
   pnpm prisma:validate
   pnpm db:check
   ```

   Local development and production currently use the same PostgreSQL database. Do not run destructive migration commands or write-based integration tests without an explicit database maintenance window. The soft-launch release uses the checked-in additive `pnpm db:migrate` migration: existing players default to the full 100-level track, while the deployed application explicitly assigns new players to the frozen 12-level sample. V2 rules still join to progress through stable slugs, and `pnpm db:sync-catalog` keeps all 100 canonical records synchronized without replacing IDs or deleting rows.

4. Start the application:

   ```powershell
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Database lifecycle and safety

The migrations create `User`, `CheatMethod`, `UserCheat`, `GameRecord`, and the independent pseudonymous `PlaytestEvent` table. `User.releaseTrack` defaults to `FULL` for backward compatibility. Raw playtest events contain random browser/session/event UUIDs and the frozen event fields only; they have no user foreign key and are removed after 30 days during ingestion, deployment cleanup, and report generation. Game starts are counted—not just completed games—so abandoned refreshes cannot bypass the daily limit. The 50th concurrent start is accepted; a 51st is rejected transactionally.

Useful commands:

```powershell
pnpm prisma:validate   # validate schema/configuration
pnpm db:sync-catalog   # idempotently synchronize all 100 V2 level configurations
pnpm db:check          # strictly compare every catalog field with the code registry
pnpm db:migrate        # explicit write command; use only on an isolated/approved database
pnpm db:seed           # low-level alias; prefer db:sync-catalog for this catalog
```

Reset deletes only the requesting player's game and unlock records. It preserves that player's anonymous ID and nickname and does not touch the cheat catalog or other players.

## Verification

The completion gate is deliberately stronger than “the page opens”:

```powershell
pnpm test              # unit + component tests
pnpm test:integration:safe # service/domain integration without database writes
pnpm build             # production compilation
pnpm test:e2e          # deterministic V2 Chromium/WebKit and responsive browser acceptance
pnpm db:check          # separate read-only shared-database gate
pnpm verify            # safe code/build/browser gate; never writes the database
```

`pnpm test:integration` and `pnpm test:e2e:database` are retained for an explicitly isolated test database. They create and remove test rows and therefore are not part of the default verification or deployment flow.

The suites cover:

- timer math, inclusive `±10 ms` boundary, progression, share text, deterministic selection
- 100 continuous IDs, unique stable slugs, unique visual signatures, 22 explicit controller families, no placeholder, TODO, or generic fallback
- loading/error/empty/locked/result/dialog component states and persistent English/Chinese switching
- authored selection order, V2 discovery/armed state paths, server-side effect verification, and Pure/Secrets judgment isolation
- all 100 scenes rendered, all 22 mechanism families naturally armed, and full critical paths for levels 001–012
- representative visual evidence for 001, 003, 012, 040, 069, and 100 on desktop and 360px mobile
- serious/critical axe findings, browser console errors, horizontal overflow, 200% zoom, and screenshots at `360×800`, `390×844`, `768×1024`, and `1440×900`

The default integration and browser tests mock persistence and perform no database writes. Browser evidence is written to `artifacts/screenshots/` and is intentionally not committed.

## Production deployment on Linux

The checked-in deployment targets this topology:

- source checkout: `/data/claude_project/timehacker`
- standalone runtime: `/data/prod/timehacker/standalone`
- PM2 process: `timehacker` on `127.0.0.1:3008`
- public URL: `https://timehacker.hihongrun.com`

Keep the production-only connection string in `/data/prod/timehacker/.env.production`:

```env
DATABASE_URL="postgresql://timehacker:replace-me@localhost:5432/timehacker"
PORT=3008
HOSTNAME=127.0.0.1
NODE_ENV=production
```

The real credential must never be added to the source checkout or Git. Deploy from the server checkout with:

```bash
cd /data/claude_project/timehacker
bash deploy.sh
```

The script installs locked dependencies, validates the deployment contract, runs static/unit checks, builds, runs the write-free integration suite, fully prepares the staging runtime, applies checked-in forward-only migrations, removes raw playtest events older than 30 days, idempotently synchronizes all 100 V2 level records, and verifies the database before swapping the runtime and starting it with PM2. It waits for local readiness and restores the previous application runtime if readiness fails. Database migrations are not rolled back automatically; the soft-launch migration is additive so the previous application safely ignores its new table and column. The script does not edit or reload Nginx.

Soft-launch operations:

```bash
# JSON report for the rolling 30-day anonymous sample and frozen thresholds
pnpm analytics:report

# Explicit retention cleanup (also runs on ingestion and deployment)
pnpm analytics:cleanup
```

Install the independent site configuration and validate it before reload:

```bash
sudo cp docs/nginx-timehacker.conf /etc/nginx/conf.d/timehacker.conf
sudo nginx -t
sudo systemctl reload nginx
curl --fail --show-error --silent https://timehacker.hihongrun.com/ > /dev/null
```

The Nginx file uses the existing wildcard certificate paths from the other `hihongrun.com` services. If this server stores those files elsewhere, change the two certificate paths before `nginx -t`. V1 deliberately has no login, payments, admin console, real-prize claims, or claim of tournament-grade anti-cheat protection.

## Main structure

```text
prisma/                 schema, migration, and seed
src/app/api/            JSON endpoints
src/components/         game interface and panels
src/game/               deterministic domain rules
src/server/             database-backed services
tests/unit/             pure rule tests
tests/component/        DOM/component behavior
tests/integration-safe/ write-free production integration
tests/integration/      explicit isolated-PostgreSQL verification
tests/e2e/              deterministic and isolated-database browser journeys
```
