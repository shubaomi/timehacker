// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("production deployment contract", () => {
  it("keeps PM2 and Nginx on the same private port", async () => {
    const [deploy, nginx] = await Promise.all([
      readFile(path.join(root, "deploy.sh"), "utf8"),
      readFile(path.join(root, "docs", "nginx-timehacker.conf"), "utf8"),
    ]);

    expect(deploy).toContain('PORT="${PORT:-3008}"');
    expect(nginx).toMatch(/server\s+127\.0\.0\.1:3008;/);
    expect(nginx).not.toMatch(/server\s+0\.0\.0\.0:/);
  });

  it("requires verification before replacing the production runtime", async () => {
    const deploy = await readFile(path.join(root, "deploy.sh"), "utf8");
    const runtimeSwap = deploy.indexOf('mv "$STAGING_DIR" "$CURRENT_DIR"');

    expect(runtimeSwap).toBeGreaterThan(deploy.indexOf("pnpm test"));
    expect(runtimeSwap).toBeGreaterThan(deploy.indexOf("pnpm build"));
    expect(runtimeSwap).toBeGreaterThan(deploy.indexOf("pnpm db:check"));
    expect(runtimeSwap).toBeGreaterThan(deploy.indexOf("pnpm test:integration:safe"));
    expect(deploy).not.toMatch(/^\s*pnpm db:migrate\s*$/m);
    expect(deploy).not.toMatch(/^\s*pnpm db:seed\s*$/m);
    expect(deploy).not.toMatch(/^\s*pnpm test:integration\s*$/m);
    expect(deploy).toContain("rollback");
  });

  it("keeps credentials out of versioned deployment files", async () => {
    const files = await Promise.all([
      readFile(path.join(root, "deploy.sh"), "utf8"),
      readFile(path.join(root, "docs", "nginx-timehacker.conf"), "utf8"),
    ]);
    const content = files.join("\n");

    expect(content).not.toMatch(/postgresql:\/\//i);
    expect(content).toContain("$PROD_DIR/.env.production");
  });

  it("terminates TLS and preserves proxy identity headers", async () => {
    const nginx = await readFile(
      path.join(root, "docs", "nginx-timehacker.conf"),
      "utf8",
    );

    expect(nginx).toContain("server_name timehacker.hihongrun.com;");
    expect(nginx).toContain("return 301 https://$host$request_uri;");
    expect(nginx).toContain("proxy_set_header X-Real-IP $remote_addr;");
    expect(nginx).toContain(
      "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    );
    expect(nginx).toContain("proxy_set_header X-Forwarded-Proto $scheme;");
  });
});
