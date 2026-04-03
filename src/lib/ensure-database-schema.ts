import { execSync } from "node:child_process";
import path from "node:path";

let migrateDeployDone = false;

/**
 * Apply pending Prisma migrations so tables (e.g. User) exist before any query.
 * Runs at most once per server process. Set CHILLZONE_SKIP_AUTO_MIGRATE=1 to skip.
 */
export function runPrismaMigrateDeploy(): void {
  if (migrateDeployDone) return;
  if (process.env.CHILLZONE_SKIP_AUTO_MIGRATE === "1") {
    migrateDeployDone = true;
    return;
  }
  const cwd = process.env.CHILLZONE_PROJECT_ROOT
    ? path.resolve(process.env.CHILLZONE_PROJECT_ROOT)
    : process.cwd();
  execSync("npm run db:deploy", {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  migrateDeployDone = true;
}
