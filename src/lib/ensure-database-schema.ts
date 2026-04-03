import { execSync } from "node:child_process";
import path from "node:path";

let migrateDeployDone = false;

/**
 * Apply pending Prisma migrations so tables (e.g. User) exist before any query.
 * Runs at most once per server process.
 *
 * Skipped on Vercel (VERCEL=1): run migrations at build time via `npm run build:vercel`
 * so the CLI is not required in the serverless runtime.
 *
 * Set CHILLZONE_SKIP_AUTO_MIGRATE=1 to skip elsewhere.
 */
export function runPrismaMigrateDeploy(): void {
  if (migrateDeployDone) return;
  if (
    process.env.VERCEL === "1" ||
    process.env.CHILLZONE_SKIP_AUTO_MIGRATE === "1"
  ) {
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
