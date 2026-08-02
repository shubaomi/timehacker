import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const metadata = await pool.query<{
    database: string;
    schema: string;
    username: string;
  }>(
    "select current_database() as database, current_schema() as schema, current_user as username",
  );
  const tables = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  );
  const counts = await pool.query<{
    users: string;
    games: string;
    cheats: string;
    unlocks: string;
  }>(
    `select
      (select count(*) from "User") as users,
      (select count(*) from "GameRecord") as games,
      (select count(*) from "CheatMethod") as cheats,
      (select count(*) from "UserCheat") as unlocks`,
  );
  const migrations = await pool.query<{ migration_name: string }>(
    'select migration_name from "_prisma_migrations" where finished_at is not null order by finished_at',
  );

  console.log(
    JSON.stringify(
      {
        metadata: metadata.rows[0],
        tables: tables.rows.map(({ tablename }) => tablename),
        counts: counts.rows[0],
        migrations: migrations.rows.map(({ migration_name }) => migration_name),
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
