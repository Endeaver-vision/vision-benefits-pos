-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" DATETIME,
    "insuranceCarrier" TEXT,
    "memberId" TEXT,
    "groupNumber" TEXT,
    "eligibilityDate" DATETIME,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "insuranceCarrier" TEXT,
    "insuranceDiscount" REAL NOT NULL DEFAULT 0,
    "patientPortion" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "insuranceTier" TEXT,
    "insuranceDiscount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transaction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
