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
  const [deploy, nginx, nextConfig] = await Promise.all([
    readFile(path.join(root, "deploy.sh"), "utf8"),
    readFile(path.join(root, "docs", "nginx-timehacker.conf"), "utf8"),
    readFile(path.join(root, "next.config.ts"), "utf8"),
  ]);

  for (const [value, label] of [
    ["/data/claude_project/timehacker", "source directory"],
    ["/data/prod/timehacker", "production directory"],
    ["APP_NAME=\"timehacker\"", "PM2 app name"],
    ["PORT=\"${PORT:-3008}\"", "PM2 port"],
    ["pnpm install --frozen-lockfile", "locked install"],
    ["pnpm db:migrate", "database migration"],
    ["pnpm db:seed", "database seed"],
    ["pnpm test:integration", "database integration gate"],
    ["curl --fail --silent --show-error", "readiness check"],
    ["pm2 save", "PM2 persistence"],
  ] as const) {
    requireText(deploy, value, label);
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
