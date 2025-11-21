-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'SALES_ASSOCIATE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'BILLING', 'SHIPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "InsurancePlanType" AS ENUM ('VISION', 'MEDICAL', 'BOTH');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SELF', 'SPOUSE', 'CHILD', 'DEPENDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'MAIL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CustomerRelationshipType" AS ENUM ('SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'GUARDIAN', 'DEPENDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('EXAM', 'FITTING', 'PICKUP', 'ADJUSTMENT', 'CONSULTATION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "PrescriptionType" AS ENUM ('DISTANCE', 'READING', 'BIFOCAL', 'PROGRESSIVE', 'COMPUTER');

-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('PREFERENCE', 'MEDICAL', 'BUSINESS', 'BEHAVIOR', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('SALE', 'RETURN', 'RESTOCK', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGED', 'EXPIRED', 'LOST');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SALES_ASSOCIATE',
    "locationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_carriers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_carriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "categoryId" TEXT NOT NULL,
    "manufacturer" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "tierVsp" TEXT,
    "tierEyemed" TEXT,
    "tierSpectera" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_locations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "priceOverride" DOUBLE PRECISION,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "insuranceCarrier" TEXT,
    "memberId" TEXT,
    "groupNumber" TEXT,
    "eligibilityDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "customerNumber" TEXT,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVisit" TIMESTAMP(3),
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerLifetimeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchaseDate" TIMESTAMP(3),
    "isHighValueCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isFrequentCustomer" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "street" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_insurance" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "planName" TEXT,
    "planType" "InsurancePlanType" NOT NULL,
    "memberId" TEXT NOT NULL,
    "groupNumber" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "copayAmount" DOUBLE PRECISION,
    "deductible" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscriberName" TEXT,
    "relationshipToSubscriber" "RelationshipType",
    "coverageDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "preferredContactMethod" "ContactMethod" NOT NULL DEFAULT 'EMAIL',
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "promotionalEmails" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "preferredBrands" JSONB NOT NULL DEFAULT '[]',
    "budgetRange" JSONB,
    "largeFont" BOOLEAN NOT NULL DEFAULT false,
    "audioAssistance" BOOLEAN NOT NULL DEFAULT false,
    "wheelchairAccessible" BOOLEAN NOT NULL DEFAULT false,
    "preferredProviders" JSONB NOT NULL DEFAULT '[]',
    "preferredAppointmentTimes" JSONB NOT NULL DEFAULT '[]',
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eyewear_preferences" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "frameStyles" JSONB NOT NULL DEFAULT '[]',
    "frameMaterials" JSONB NOT NULL DEFAULT '[]',
    "frameColors" JSONB NOT NULL DEFAULT '[]',
    "lensTypes" JSONB NOT NULL DEFAULT '[]',
    "lensCoatings" JSONB NOT NULL DEFAULT '[]',
    "contactLensBrands" JSONB NOT NULL DEFAULT '[]',
    "contactLensTypes" JSONB NOT NULL DEFAULT '[]',
    "framesBudget" DOUBLE PRECISION,
    "contactsBudget" DOUBLE PRECISION,
    "safetyRequirements" BOOLEAN NOT NULL DEFAULT false,
    "computerGlasses" BOOLEAN NOT NULL DEFAULT false,
    "sportsEyewear" BOOLEAN NOT NULL DEFAULT false,
    "fashionPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "comfortPriority" "Priority" NOT NULL DEFAULT 'HIGH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eyewear_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "emailAppointments" BOOLEAN NOT NULL DEFAULT true,
    "emailPromotions" BOOLEAN NOT NULL DEFAULT false,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailNewsletters" BOOLEAN NOT NULL DEFAULT false,
    "smsAppointments" BOOLEAN NOT NULL DEFAULT true,
    "smsPickupReady" BOOLEAN NOT NULL DEFAULT true,
    "smsPromotions" BOOLEAN NOT NULL DEFAULT false,
    "phoneAppointments" BOOLEAN NOT NULL DEFAULT false,
    "phoneFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "phoneEmergencyContact" BOOLEAN NOT NULL DEFAULT true,
    "mailingStatements" BOOLEAN NOT NULL DEFAULT true,
    "mailingPromotions" BOOLEAN NOT NULL DEFAULT false,
    "mailingCatalogs" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_relationships" (
    "id" TEXT NOT NULL,
    "primaryCustomerId" TEXT NOT NULL,
    "relatedCustomerId" TEXT NOT NULL,
    "relationshipType" "CustomerRelationshipType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_purchase_history" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "prescriptionUsed" TEXT,
    "providerId" TEXT,
    "itemsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_purchase_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_visits" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "providerId" TEXT,
    "providerName" TEXT,
    "duration" INTEGER,
    "notes" TEXT,
    "outcome" TEXT,
    "nextAppointmentRecommended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eye_prescriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "prescriptionDate" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT,
    "providerName" TEXT,
    "rightEyeJson" TEXT NOT NULL DEFAULT '{}',
    "leftEyeJson" TEXT NOT NULL DEFAULT '{}',
    "pupillaryDistance" DOUBLE PRECISION,
    "bifocalHeight" DOUBLE PRECISION,
    "prescriptionType" "PrescriptionType" NOT NULL,
    "notes" TEXT,
    "expirationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eye_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "category" "TagCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_assignments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "insuranceCarrier" TEXT,
    "insuranceDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "patientPortion" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "insuranceTier" TEXT,
    "insuranceDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 5,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 20,
    "maxStock" INTEGER,
    "costPrice" DOUBLE PRECISION,
    "lastCostPrice" DOUBLE PRECISION,
    "lastRestocked" TIMESTAMP(3),
    "lastSold" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "unitCost" DOUBLE PRECISION,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "website" TEXT,
    "taxId" TEXT,
    "paymentTerms" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "supplierPrice" DOUBLE PRECISION,
    "leadTimeDays" INTEGER,
    "minimumOrder" INTEGER NOT NULL DEFAULT 1,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_carriers_name_key" ON "insurance_carriers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_carriers_code_key" ON "insurance_carriers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_locations_productId_locationId_key" ON "product_locations"("productId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerNumber_key" ON "customers"("customerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferences_customerId_key" ON "customer_preferences"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "eyewear_preferences_customerId_key" ON "eyewear_preferences"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "communication_preferences_customerId_key" ON "communication_preferences"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_relationships_primaryCustomerId_relatedCustomerId_key" ON "customer_relationships"("primaryCustomerId", "relatedCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_name_key" ON "customer_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tag_assignments_customerId_tagId_key" ON "customer_tag_assignments"("customerId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_locationId_key" ON "inventory"("productId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_productId_supplierId_key" ON "product_suppliers"("productId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_locations" ADD CONSTRAINT "product_locations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_locations" ADD CONSTRAINT "product_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_insurance" ADD CONSTRAINT "customer_insurance_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eyewear_preferences" ADD CONSTRAINT "eyewear_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_relationships" ADD CONSTRAINT "customer_relationships_primaryCustomerId_fkey" FOREIGN KEY ("primaryCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_relationships" ADD CONSTRAINT "customer_relationships_relatedCustomerId_fkey" FOREIGN KEY ("relatedCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_purchase_history" ADD CONSTRAINT "customer_purchase_history_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_prescriptions" ADD CONSTRAINT "eye_prescriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "customer_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

