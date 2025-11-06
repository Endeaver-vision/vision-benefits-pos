-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'BUILDING',
    "patientInfo" JSONB NOT NULL,
    "insuranceInfo" JSONB NOT NULL,
    "examServices" JSONB NOT NULL,
    "eyeglasses" JSONB NOT NULL,
    "contacts" JSONB NOT NULL,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "insuranceDiscount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "patientResponsibility" REAL NOT NULL,
    "isSecondPair" BOOLEAN NOT NULL DEFAULT false,
    "secondPairOf" TEXT,
    "secondPairDiscount" REAL NOT NULL DEFAULT 0,
    "secondPairType" TEXT,
    "examSignatureCompleted" BOOLEAN NOT NULL DEFAULT false,
    "materialsSignatureCompleted" BOOLEAN NOT NULL DEFAULT false,
    "examSignedAt" DATETIME,
    "materialsSignedAt" DATETIME,
    "expirationDate" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotes_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "second_pairs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalQuoteId" TEXT NOT NULL,
    "secondPairQuoteId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountPercent" REAL NOT NULL,
    "discountAmount" REAL NOT NULL,
    "originalTotal" REAL NOT NULL,
    "finalTotal" REAL NOT NULL,
    "originalPurchaseDate" DATETIME NOT NULL,
    "secondPairPurchaseDate" DATETIME NOT NULL,
    "daysAfterOriginal" INTEGER NOT NULL,
    "managerOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overrideBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "second_pairs_originalQuoteId_fkey" FOREIGN KEY ("originalQuoteId") REFERENCES "quotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "second_pairs_secondPairQuoteId_fkey" FOREIGN KEY ("secondPairQuoteId") REFERENCES "quotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "second_pairs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "second_pairs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "second_pairs_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "second_pairs_secondPairQuoteId_key" ON "second_pairs"("secondPairQuoteId");
