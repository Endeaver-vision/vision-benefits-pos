-- AlterTable
ALTER TABLE "locations" ADD COLUMN "email" TEXT;
ALTER TABLE "locations" ADD COLUMN "logo" TEXT;
ALTER TABLE "locations" ADD COLUMN "taxRate" REAL;
ALTER TABLE "locations" ADD COLUMN "website" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "passwordResetExpires" DATETIME;
ALTER TABLE "users" ADD COLUMN "passwordResetToken" TEXT;

-- CreateTable
CREATE TABLE "user_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "locationId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_activity_logs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_activity_logs_userId_idx" ON "user_activity_logs"("userId");

-- CreateIndex
CREATE INDEX "user_activity_logs_action_idx" ON "user_activity_logs"("action");

-- CreateIndex
CREATE INDEX "user_activity_logs_createdAt_idx" ON "user_activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "user_activity_logs_locationId_idx" ON "user_activity_logs"("locationId");
