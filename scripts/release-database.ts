/** Release-only backup and catalog rollback. Never restores player tables. */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const [operation, directory] = process.argv.slice(2);
if (!directory || !path.isAbsolute(directory) || !["backup", "restore-catalog"].includes(operation)) throw new Error("Use backup|restore-catalog with an absolute release directory");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString });
await client.connect();
try {
  const snapshot = path.join(directory, "catalog.json");
  if (operation === "backup") {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const rows = (await client.query('SELECT * FROM "CheatMethod" ORDER BY slug')).rows;
    await writeFile(snapshot, JSON.stringify(rows), { mode: 0o600, flag: "wx" });
    const url = new URL(connectionString);
    const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), ...(url.searchParams.has("sslmode") ? { PGSSLMODE: url.searchParams.get("sslmode")! } : {}) };
    const dump = path.join(directory, "database.dump");
    for (const [command, args] of [["pg_dump", ["--format=custom", "--no-owner", "--file", dump]], ["pg_restore", ["--list", dump]]] as const) {
      const result = spawnSync(command, [...args], { env, encoding: "utf8" });
      if (result.status !== 0) throw new Error(`${command} failed; backup is not verified`);
    }
    console.log(`Verified database archive and ${rows.length} catalog rows in ${directory}`);
  } else {
    const rows = JSON.parse(await readFile(snapshot, "utf8")) as Array<Record<string, unknown>>;
    if (rows.length !== 100 || new Set(rows.map(row=>row.slug)).size !== 100) throw new Error("Invalid catalog backup");
    await client.query("BEGIN");
    try {
      const columns = ["name", "nameZh", "description", "descriptionZh", "hint", "hintZh", "difficulty", "category", "triggerConfig", "effectConfig", "enabled", "updatedAt"];
      for (const row of rows) {
        const values = columns.map(key => key.endsWith("Config") ? JSON.stringify(row[key]) : row[key]);
        const result = await client.query(`UPDATE "CheatMethod" SET ${columns.map((key,i)=>`"${key}"=$${i+1}`).join(",")} WHERE id=$13 AND slug=$14`, [...values,row.id,row.slug]);
        if (result.rowCount !== 1) throw new Error("Catalog identity mismatch; rollback cancelled");
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    console.log("Restored catalog only; player progress and scores untouched.");
  }
} finally { await client.end(); }
