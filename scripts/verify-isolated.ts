/** Uses a dedicated database; credentials stay in child environment, not argv. */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
config({path:".env.local",quiet:true});
const url=new URL(process.env.DATABASE_URL!);
url.pathname="/timehacker_r100_verify_20261002";
const env={...process.env,DATABASE_URL:url.toString(),NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN:"1"};
function run(args:string[], reasoning="1") {
  const result=spawnSync(process.platform==="win32"?"pnpm.cmd":"pnpm",args,{env:{...env,NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN:reasoning},stdio:"inherit",shell:process.platform==="win32"});
  if(result.status!==0)process.exit(result.status??1);
}
switch(process.argv[2]) {
  case "prepare": run(["db:migrate"]);run(["db:sync-catalog"],"0"); break;
  case "test": run(["exec","vitest","run","tests/integration/database.test.ts","--maxWorkers=1"],"0");run(["exec","vitest","run","tests/integration/reasoning-database.test.ts","--maxWorkers=1"]);break;
  case "serve": run(["exec","next","dev","--hostname","127.0.0.1","--port","3012"]);break;
  case "rollback-check": {
    const directory=process.argv[3];
    if(!directory)throw new Error("An isolated backup directory is required");
    run(["exec","tsx","scripts/release-database.ts","backup",directory]);
    run(["db:sync-catalog"],"0");
    run(["exec","tsx","scripts/release-database.ts","restore-catalog",directory]);
    run(["db:check"]);
    break;
  }
  default: throw new Error("Choose prepare, test, serve or rollback-check");
}
