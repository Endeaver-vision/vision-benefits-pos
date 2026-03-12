-- CreateTable: price_list_versions
CREATE TABLE "price_list_versions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "authorization_id" TEXT,
    "insurance_carrier" TEXT NOT NULL,
    "plan_name" TEXT,
    "version" INTEGER NOT NULL,
    "version_label" TEXT NOT NULL,
    "lens_matrix_data" JSONB,
    "extracted_data" JSONB,
    "price_list_data" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "price_list_versions_pkey" PRIMARY KEY ("id")
);

-- Add version_id column to patient_price_lists
ALTER TABLE "patient_price_lists" ADD COLUMN "version_id" TEXT;

-- CreateIndex: unique constraint for versions
CREATE UNIQUE INDEX "price_list_versions_customer_carrier_version_key" ON "price_list_versions"("customer_id", "insurance_carrier", "version");

-- CreateIndex: customer + active index
CREATE INDEX "idx_version_customer_active" ON "price_list_versions"("customer_id", "active");

-- CreateIndex: carrier index
CREATE INDEX "idx_version_carrier" ON "price_list_versions"("insurance_carrier");

-- CreateIndex: version_id index on patient_price_lists
CREATE INDEX "idx_price_version" ON "patient_price_lists"("version_id");

-- CreateIndex: new unique constraint on patient_price_lists (version + product)
-- Note: This replaces the old (customer_id, product_id, insurance_carrier) constraint
-- We keep the old constraint for now since existing data may not have version_id set
CREATE UNIQUE INDEX "patient_price_lists_version_product_key" ON "patient_price_lists"("version_id", "product_id") WHERE "version_id" IS NOT NULL;

-- AddForeignKey: price_list_versions -> customers
ALTER TABLE "price_list_versions" ADD CONSTRAINT "price_list_versions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: price_list_versions -> insurance_authorizations
ALTER TABLE "price_list_versions" ADD CONSTRAINT "price_list_versions_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "insurance_authorizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: patient_price_lists -> price_list_versions
ALTER TABLE "patient_price_lists" ADD CONSTRAINT "patient_price_lists_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "price_list_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
