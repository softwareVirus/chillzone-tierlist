-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "tenantId" TEXT NOT NULL,
    "lastTierlistDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "picture" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TierlistDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    CONSTRAINT "TierlistDay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tierlistDayId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    CONSTRAINT "Placement_tierlistDayId_fkey" FOREIGN KEY ("tierlistDayId") REFERENCES "TierlistDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Placement_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Participant_tenantId_idx" ON "Participant"("tenantId");

-- CreateIndex
CREATE INDEX "TierlistDay_tenantId_idx" ON "TierlistDay"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TierlistDay_tenantId_date_key" ON "TierlistDay"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Placement_participantId_idx" ON "Placement"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_tierlistDayId_participantId_key" ON "Placement"("tierlistDayId", "participantId");
