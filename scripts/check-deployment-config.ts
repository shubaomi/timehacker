import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

function requireText(content: string, value: string, label: string): void {
  if (!content.includes(value)) {
    throw new Error(`Missing ${label}: ${value}`);
  }
}

function requirePattern(content: string, pattern: RegExp, label: string): void {
  if (!pattern.test(content)) {
    throw new Error(`Missing or invalid ${label}.`);
  }
}

async function main(): Promise<void> {
  const [deploy, nginx, nextConfig, packageJsonText] = await Promise.all([
    readFile(path.join(root, "deploy.sh"), "utf8"),
    readFile(path.join(root, "docs", "nginx-timehacker.conf"), "utf8"),
    readFile(path.join(root, "next.config.ts"), "utf8"),
    readFile(path.join(root, "package.json"), "utf8"),
  ]);
  const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };
  const unitTestScript = packageJson.scripts?.test ?? "";

  for (const excludedDirectory of ["tests/integration/**", "tests/e2e/**"]) {
    requireText(
      unitTestScript,
      `--exclude "${excludedDirectory}"`,
      `shell-safe Vitest exclusion for ${excludedDirectory}`,
    );
  }

  for (const [value, label] of [
    ["/data/claude_project/timehacker", "source directory"],
    ["/data/prod/timehacker", "production directory"],
    ["APP_NAME=\"timehacker\"", "PM2 app name"],
    ["PORT=\"${PORT:-3008}\"", "PM2 port"],
    ["pnpm install --frozen-lockfile", "locked install"],
    ["pnpm db:sync-catalog", "idempotent database catalog synchronization"],
    ["pnpm db:check", "strict database catalog gate"],
    ["NODE_ENV=test pnpm test:integration:safe", "write-free integration gate"],
    ["curl --fail --silent --show-error", "readiness check"],
    ["pm2 save", "PM2 persistence"],
  ] as const) {
    requireText(deploy, value, label);
  }

  requirePattern(deploy, /^NODE_ENV=test pnpm test$/m, "test-only React environment");

  for (const [pattern, label] of [
    [/^\s*pnpm db:migrate\s*$/m, "database migration"],
    [/^\s*pnpm db:seed\s*$/m, "database seed"],
    [/^\s*pnpm test:integration\s*$/m, "write-based database integration"],
  ] as const) {
    if (pattern.test(deploy)) throw new Error(`Deployment must not run ${label} against the shared database.`);
  }

  requirePattern(
    nginx,
    /upstream\s+timehacker_app\s*\{[\s\S]*server\s+127\.0\.0\.1:3008;/,
    "localhost upstream on port 3008",
  );
  requirePattern(
    nginx,
    /listen\s+80;[\s\S]*server_name\s+timehacker\.hihongrun\.com;[\s\S]*return\s+301\s+https:\/\/\$host\$request_uri;/,
    "HTTP to HTTPS redirect",
  );
  requirePattern(
    nginx,
    /listen\s+443\s+ssl\s+http2;[\s\S]*server_name\s+timehacker\.hihongrun\.com;[\s\S]*proxy_pass\s+http:\/\/timehacker_app;/,
    "HTTPS reverse proxy",
  );

  for (const header of [
    "proxy_set_header Host $host;",
    "proxy_set_header X-Real-IP $remote_addr;",
    "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "proxy_set_header X-Forwarded-Proto $scheme;",
  ]) {
    requireText(nginx, header, "forwarded proxy header");
  }

  requireText(nextConfig, 'output: "standalone"', "Next.js standalone output");

  const combined = `${deploy}\n${nginx}`;
  if (/postgresql:\/\//i.test(combined)) {
    throw new Error("Deployment files must not contain a database URL or password.");
  }

  console.log("Deployment and Nginx configuration checks passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
