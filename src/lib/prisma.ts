import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Resolve `file:./dev.db` against the real app folder. If Next.js runs with
 * `process.cwd()` set to a parent directory (e.g. another package-lock.json
 * above this project), `file:./dev.db` would point at an empty DB while
 * migrations were applied under `./chillzone-tierlist/dev.db`.
 */
function resolveSqliteUrl(raw: string): string {
  if (!raw.startsWith("file:")) {
    return raw;
  }
  let rel = raw.slice("file:".length);
  if (rel.startsWith("./")) {
    rel = rel.slice(2);
  }
  if (path.isAbsolute(rel)) {
    return `file:${rel}`;
  }
  const nested = path.resolve(process.cwd(), "chillzone-tierlist", rel);
  const atCwd = path.resolve(process.cwd(), rel);
  const target = fs.existsSync(nested) ? nested : atCwd;
  if (process.env.NODE_ENV === "development") {
    console.info(`[prisma] SQLite file: ${target}`);
  }
  return `file:${target}`;
}

function createPrismaClient() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const url = resolveSqliteUrl(raw);
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
