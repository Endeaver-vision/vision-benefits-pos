-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 5,
    "reorderQuantity" INTEGER NOT NULL DEFAULT 20,
    "maxStock" INTEGER,
    "costPrice" REAL,
    "lastCostPrice" REAL,
    "lastRestocked" DATETIME,
    "lastSold" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "unitCost" REAL,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_movements_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "supplierPrice" REAL,
    "leadTimeDays" INTEGER,
    "minimumOrder" INTEGER NOT NULL DEFAULT 1,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_suppliers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL DEFAULT 0,
    "shipping" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATETIME,
    "receivedDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL,
    "total" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_locationId_key" ON "inventory"("productId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_productId_supplierId_key" ON "product_suppliers"("productId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");
