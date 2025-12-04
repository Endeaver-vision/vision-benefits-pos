import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addPriceListTables() {
  try {
    console.log('Adding price list tables to database...\n');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "insurance_plan_benefits" (
        "id" TEXT PRIMARY KEY,
        "carrierId" TEXT NOT NULL,
        "carrierCode" TEXT NOT NULL,
        "planName" TEXT NOT NULL,
        "categoryId" TEXT NOT NULL,
        "categoryCode" TEXT NOT NULL,
        "tier" TEXT NOT NULL,
        "tierLabel" TEXT,
        "allowance" DOUBLE PRECISION,
        "copay" DOUBLE PRECISION,
        "discountPercent" DOUBLE PRECISION,
        "frequency" INTEGER,
        "notes" TEXT,
        "active" BOOLEAN DEFAULT true,
        "effectiveDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "expirationDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Created insurance_plan_benefits table');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "product_insurance_pricing" (
        "id" TEXT PRIMARY KEY,
        "productId" TEXT NOT NULL,
        "planBenefitId" TEXT NOT NULL,
        "retailPrice" DOUBLE PRECISION NOT NULL,
        "allowance" DOUBLE PRECISION,
        "patientCopay" DOUBLE PRECISION NOT NULL,
        "insurancePays" DOUBLE PRECISION NOT NULL,
        "overridePrice" DOUBLE PRECISION,
        "overrideReason" TEXT,
        "overrideBy" TEXT,
        "overrideDate" TIMESTAMP(3),
        "active" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Created product_insurance_pricing table');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "customer_price_lists" (
        "id" TEXT PRIMARY KEY,
        "customerId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "pricingId" TEXT,
        "finalPrice" DOUBLE PRECISION NOT NULL,
        "retailPrice" DOUBLE PRECISION NOT NULL,
        "savings" DOUBLE PRECISION NOT NULL,
        "insuranceCarrier" TEXT,
        "planName" TEXT,
        "tier" TEXT,
        "validFrom" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "validUntil" TIMESTAMP(3),
        "customPrice" DOUBLE PRECISION,
        "priceOverrideReason" TEXT,
        "priceOverrideBy" TEXT,
        "priceOverrideDate" TIMESTAMP(3),
        "active" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Created customer_price_lists table');
    
    // Add indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "insurance_plan_benefits_unique" 
      ON "insurance_plan_benefits"("carrierCode", "planName", "categoryCode", "tier");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "product_insurance_pricing_unique" 
      ON "product_insurance_pricing"("productId", "planBenefitId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "customer_price_lists_unique" 
      ON "customer_price_lists"("customerId", "productId");
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "customer_price_lists_customer_idx" 
      ON "customer_price_lists"("customerId", "active");
    `);
    
    console.log('✅ Created all indexes\n');
    console.log('🎉 Price list tables added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addPriceListTables();
