# Time Hacker

Time Hacker is a bilingual, mobile-first timing game: stop the clock at exactly `10.00` seconds, or notice a tiny anomaly and discover one of 100 secrets that bend game time.

## What V1 includes

- Anonymous player identity persisted in local storage and PostgreSQL
- English and Simplified Chinese UI with a persistent language switch and localized secrets collection
- With Secrets mode containing 100 server-verified cheats, 20 per difficulty tier
- Four assistance families: full dilation, final-zone dilation, tolerance assist, and brake pulse
- Twelve playful interaction families with unique, server-verified 3-to-5-step configurations and progressive hints
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

3. Validate and deploy the checked-in migration, then seed the canonical catalog:

   ```powershell
   pnpm prisma:validate
   pnpm db:migrate
   pnpm db:seed
   ```

   Seeding is idempotent. Re-running it updates the same 100 cheat records instead of duplicating them.

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
pnpm db:migrate       # deploy checked-in migrations
pnpm db:seed          # upsert exactly 100 canonical bilingual cheats
pnpm tsx scripts/inspect-database.ts  # read-only table/catalog inspection
```

Reset deletes only the requesting player's game and unlock records. It preserves that player's anonymous ID and nickname and does not touch the cheat catalog or other players.

## Verification

The completion gate is deliberately stronger than “the page opens”:

```powershell
pnpm test              # unit + component tests
pnpm test:integration  # real PostgreSQL migration/seed/service/constraint tests
pnpm build             # production compilation
pnpm test:e2e          # Chromium journeys, accessibility, responsive screenshots
pnpm verify            # complete gate in the required order
```

The suites cover:

- timer math, inclusive `±10 ms` boundary, progression, share text, deterministic selection
- uniqueness, bilingual content, difficulty/category ranges, experience diversity, UI event reachability, and positive/negative trigger cases for all 100 cheats
- loading/error/empty/locked/result/dialog component states and persistent English/Chinese switching
- real migration presence, idempotent seed, anonymous-player idempotency, server-side cheat/effect verification, and Pure/Secrets judgment isolation
- 49/50/51 concurrent daily-limit behavior, ranking order, reset isolation, foreign keys, and uniqueness
- initial, running, failed, armed, successful, collection, ranking, reset, persistence, Pure Mode, keyboard, daily-limit, reduced-motion, and share-fallback browser journeys
- serious/critical axe findings, browser console errors, horizontal overflow, 200% zoom, and screenshots at `360×800`, `390×844`, `768×1024`, and `1440×900`

Integration and browser tests create uniquely identified players and delete only those exact rows afterward. Existing users and catalog data are not truncated or reset. Browser evidence is written to `artifacts/screenshots/`.

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

The script installs locked dependencies, validates the deployment contract, runs static/unit checks, builds before applying migrations, seeds idempotently, runs the live PostgreSQL integration suite, starts the standalone server with PM2, waits for local readiness, and restores the previous runtime if readiness fails. It does not edit or reload Nginx.

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
tests/integration/      real PostgreSQL verification
tests/e2e/              browser acceptance journeys
```
