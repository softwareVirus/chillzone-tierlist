-- PostgreSQL baseline (replaces prior SQLite migrations).

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "tenantId" TEXT NOT NULL,
    "lastTierlistDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TierlistDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "tierlistScreenshot" TEXT,
    CONSTRAINT "TierlistDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "tierlistDayId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "Participant_tenantId_idx" ON "Participant"("tenantId");
CREATE INDEX "TierlistDay_tenantId_idx" ON "TierlistDay"("tenantId");
CREATE UNIQUE INDEX "TierlistDay_tenantId_date_key" ON "TierlistDay"("tenantId", "date");
CREATE INDEX "Placement_participantId_idx" ON "Placement"("participantId");
CREATE UNIQUE INDEX "Placement_tierlistDayId_participantId_key" ON "Placement"("tierlistDayId", "participantId");

ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TierlistDay" ADD CONSTRAINT "TierlistDay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_tierlistDayId_fkey" FOREIGN KEY ("tierlistDayId") REFERENCES "TierlistDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
