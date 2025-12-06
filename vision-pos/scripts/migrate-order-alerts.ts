import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating order alerts tables...')

  // Create enums
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "OrderAlertType" AS ENUM ('STAGE_OVERDUE', 'EXPECTED_COMPLETION_PASSED', 'VENDOR_DELAY', 'QUALITY_ISSUE', 'CUSTOM');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'URGENT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // Create order_stage_configs table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_stage_configs" (
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
  `)

  // Create order_alerts table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_alerts" (
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
  `)

  // Create indexes
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "order_stage_configs_stage_key" ON "order_stage_configs"("stage");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_alerts_orderId_idx" ON "order_alerts"("orderId");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_alerts_stage_idx" ON "order_alerts"("stage");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_alerts_severity_idx" ON "order_alerts"("severity");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_alerts_resolved_idx" ON "order_alerts"("resolved");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "order_alerts_createdAt_idx" ON "order_alerts"("createdAt");`)

  // Add foreign key
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "order_alerts" 
      ADD CONSTRAINT "order_alerts_orderId_fkey" 
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // Insert default configurations
  await prisma.$executeRawUnsafe(`
    INSERT INTO "order_stage_configs" ("id", "stage", "expectedDurationHours", "warningThresholdHours", "criticalThresholdHours", "notifyRoles", "updatedAt")
    VALUES
      ('stage_submitted', 'SUBMITTED', 1, 2, 4, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_confirmed', 'CONFIRMED', 2, 4, 8, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_shipped_vendor', 'SHIPPED_TO_VENDOR', 24, 36, 48, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_vendor_processing', 'VENDOR_PROCESSING', 96, 120, 144, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_vendor_shipped', 'VENDOR_SHIPPED', 48, 72, 96, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_received', 'RECEIVED', 2, 4, 8, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_quality_check', 'QUALITY_CHECK', 4, 8, 12, ARRAY['ADMIN', 'MANAGER'], NOW()),
      ('stage_patient_notified', 'PATIENT_NOTIFIED', 24, 48, 72, ARRAY['ADMIN', 'MANAGER'], NOW())
    ON CONFLICT (stage) DO NOTHING;
  `)

  console.log('✅ Migration completed successfully!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
