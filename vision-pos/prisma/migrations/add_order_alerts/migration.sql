-- CreateEnum
CREATE TYPE "OrderAlertType" AS ENUM ('STAGE_OVERDUE', 'EXPECTED_COMPLETION_PASSED', 'VENDOR_DELAY', 'QUALITY_ISSUE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT');

-- CreateTable
CREATE TABLE "order_stage_configs" (
    "id" TEXT NOT NULL,
    "stage" "OrderStatus" NOT NULL,
    "expectedDurationHours" INTEGER NOT NULL,
    "warningThresholdHours" INTEGER NOT NULL,
    "criticalThresholdHours" INTEGER NOT NULL,
    "autoNotify" BOOLEAN NOT NULL DEFAULT true,
    "notifyRoles" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_stage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_alerts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "stage" "OrderStatus" NOT NULL,
    "alertType" "OrderAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_stage_configs_stage_key" ON "order_stage_configs"("stage");

-- CreateIndex
CREATE INDEX "order_alerts_orderId_idx" ON "order_alerts"("orderId");

-- CreateIndex
CREATE INDEX "order_alerts_stage_idx" ON "order_alerts"("stage");

-- CreateIndex
CREATE INDEX "order_alerts_severity_idx" ON "order_alerts"("severity");

-- CreateIndex
CREATE INDEX "order_alerts_resolved_idx" ON "order_alerts"("resolved");

-- CreateIndex
CREATE INDEX "order_alerts_createdAt_idx" ON "order_alerts"("createdAt");

-- AddForeignKey
ALTER TABLE "order_alerts" ADD CONSTRAINT "order_alerts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default stage configurations
INSERT INTO "order_stage_configs" ("id", "stage", "expectedDurationHours", "warningThresholdHours", "criticalThresholdHours", "notifyRoles", "updatedAt") VALUES
('stage_submitted', 'SUBMITTED', 1, 2, 4, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_confirmed', 'CONFIRMED', 2, 4, 8, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_shipped_vendor', 'SHIPPED_TO_VENDOR', 24, 36, 48, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_vendor_processing', 'VENDOR_PROCESSING', 96, 120, 144, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_vendor_shipped', 'VENDOR_SHIPPED', 48, 72, 96, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_received', 'RECEIVED', 2, 4, 8, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_quality_check', 'QUALITY_CHECK', 4, 8, 12, ARRAY['ADMIN', 'MANAGER'], NOW()),
('stage_patient_notified', 'PATIENT_NOTIFIED', 24, 48, 72, ARRAY['ADMIN', 'MANAGER'], NOW());
