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

   Local development and production currently use the same PostgreSQL database. Do not run migration or write-based integration commands against it. V2 rules live in the code-authored registry and join to existing progress through stable slugs. Catalog changes are applied only with the idempotent `pnpm db:sync-catalog` command; it updates the 100 canonical level records without replacing IDs, deleting rows, or breaking player progress.

4. Start the application:

   ```powershell
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Database lifecycle and safety

The migration creates `User`, `CheatMethod`, `UserCheat`, and `GameRecord`, including foreign keys, unique constraints, and ranking/daily-limit indexes. Game starts are counted—not just completed games—so abandoned refreshes cannot bypass the daily limit. The 50th concurrent start is accepted; a 51st is rejected transactionally.

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

The script installs locked dependencies, validates the deployment contract, runs static/unit checks, builds, runs the write-free integration suite, fully prepares and validates the staging runtime, idempotently synchronizes the 100 V2 level records and verifies every catalog field, then immediately swaps the runtime and starts it with PM2. It waits for local readiness and restores the previous runtime if readiness fails. It does not run schema migrations, delete catalog rows, edit Nginx, or reload Nginx.

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
