-- CreateTable
CREATE TABLE "pof_incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frameDescription" TEXT,
    "frameCondition" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "financialImpact" REAL NOT NULL DEFAULT 0,
    "refundIssued" REAL NOT NULL DEFAULT 0,
    "photosAttached" BOOLEAN NOT NULL DEFAULT false,
    "customerNotified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pof_incidents_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pof_incidents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pof_incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pof_incidents_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quotes" (
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
    "isPatientOwnedFrame" BOOLEAN NOT NULL DEFAULT false,
    "pofInspectionCompleted" BOOLEAN NOT NULL DEFAULT false,
    "pofConditionAssessment" TEXT,
    "pofWaiverSigned" BOOLEAN NOT NULL DEFAULT false,
    "pofFrameDescription" TEXT,
    "pofFixedFee" REAL NOT NULL DEFAULT 0,
    "pofInspectionNotes" TEXT,
    "pofInspectedBy" TEXT,
    "pofInspectedAt" DATETIME,
    "pofWaiverSignedAt" DATETIME,
    "examSignatureCompleted" BOOLEAN NOT NULL DEFAULT false,
    "materialsSignatureCompleted" BOOLEAN NOT NULL DEFAULT false,
    "examSignedAt" DATETIME,
    "materialsSignedAt" DATETIME,
    "expirationDate" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quotes_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_quotes" ("completedAt", "contacts", "createdAt", "customerId", "description", "discount", "examServices", "examSignatureCompleted", "examSignedAt", "expirationDate", "eyeglasses", "id", "insuranceDiscount", "insuranceInfo", "isSecondPair", "locationId", "materialsSignatureCompleted", "materialsSignedAt", "patientInfo", "patientResponsibility", "quoteNumber", "secondPairDiscount", "secondPairOf", "secondPairType", "status", "subtotal", "tax", "total", "updatedAt", "userId") SELECT "completedAt", "contacts", "createdAt", "customerId", "description", "discount", "examServices", "examSignatureCompleted", "examSignedAt", "expirationDate", "eyeglasses", "id", "insuranceDiscount", "insuranceInfo", "isSecondPair", "locationId", "materialsSignatureCompleted", "materialsSignedAt", "patientInfo", "patientResponsibility", "quoteNumber", "secondPairDiscount", "secondPairOf", "secondPairType", "status", "subtotal", "tax", "total", "updatedAt", "userId" FROM "quotes";
DROP TABLE "quotes";
ALTER TABLE "new_quotes" RENAME TO "quotes";
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
