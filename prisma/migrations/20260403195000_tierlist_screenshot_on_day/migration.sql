-- Per-date tierlist image on TierlistDay; remove global User.tierlistScreenshot.
-- SQLite: add column, copy legacy image onto the user's last-selected day when it matches a row, then drop User column.

ALTER TABLE "TierlistDay" ADD COLUMN "tierlistScreenshot" TEXT;

UPDATE "TierlistDay"
SET "tierlistScreenshot" = (
  SELECT "User"."tierlistScreenshot"
  FROM "User"
  WHERE "User"."tenantId" = "TierlistDay"."tenantId"
    AND "User"."lastTierlistDate" = "TierlistDay"."date"
    AND "User"."tierlistScreenshot" IS NOT NULL
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM "User"
  WHERE "User"."tenantId" = "TierlistDay"."tenantId"
    AND "User"."lastTierlistDate" = "TierlistDay"."date"
    AND "User"."tierlistScreenshot" IS NOT NULL
);

PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "tenantId" TEXT NOT NULL,
    "lastTierlistDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("id", "email", "passwordHash", "name", "tenantId", "lastTierlistDate", "createdAt")
SELECT "id", "email", "passwordHash", "name", "tenantId", "lastTierlistDate", "createdAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
