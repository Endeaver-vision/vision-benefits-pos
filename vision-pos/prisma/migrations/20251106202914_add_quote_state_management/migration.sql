-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "signatureType" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "invalidatedAt" DATETIME,
    "invalidatedBy" TEXT,
    "invalidationReason" TEXT,
    "nameVerified" BOOLEAN NOT NULL DEFAULT false,
    "nameVerifiedAt" DATETIME,
    "nameVerifiedBy" TEXT,
    "signatureWidth" INTEGER,
    "signatureHeight" INTEGER,
    "signatureHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "signatures_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "ccEmails" TEXT,
    "bccEmails" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME NOT NULL,
    "bounceReason" TEXT,
    "openedAt" DATETIME,
    "clickedAt" DATETIME,
    CONSTRAINT "email_logs_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "previousStatus" TEXT,
    "statusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChangedBy" TEXT,
    "statusReason" TEXT,
    "buildingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "presentationCompleted" BOOLEAN NOT NULL DEFAULT false,
    "signaturesCompleted" BOOLEAN NOT NULL DEFAULT false,
    "paymentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "fulfillmentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "buildingCompletedAt" DATETIME,
    "draftCreatedAt" DATETIME,
    "presentedAt" DATETIME,
    "signedAt" DATETIME,
    "cancelledAt" DATETIME,
    "expiredAt" DATETIME,
    "autoExpireAfterDays" INTEGER NOT NULL DEFAULT 30,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireNotificationSent" BOOLEAN NOT NULL DEFAULT false,
    "expireNotificationSentAt" DATETIME,
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
INSERT INTO "new_quotes" ("completedAt", "contacts", "createdAt", "customerId", "description", "discount", "examServices", "examSignatureCompleted", "examSignedAt", "expirationDate", "eyeglasses", "id", "insuranceDiscount", "insuranceInfo", "isPatientOwnedFrame", "isSecondPair", "locationId", "materialsSignatureCompleted", "materialsSignedAt", "patientInfo", "patientResponsibility", "pofConditionAssessment", "pofFixedFee", "pofFrameDescription", "pofInspectedAt", "pofInspectedBy", "pofInspectionCompleted", "pofInspectionNotes", "pofWaiverSigned", "pofWaiverSignedAt", "quoteNumber", "secondPairDiscount", "secondPairOf", "secondPairType", "status", "subtotal", "tax", "total", "updatedAt", "userId") SELECT "completedAt", "contacts", "createdAt", "customerId", "description", "discount", "examServices", "examSignatureCompleted", "examSignedAt", "expirationDate", "eyeglasses", "id", "insuranceDiscount", "insuranceInfo", "isPatientOwnedFrame", "isSecondPair", "locationId", "materialsSignatureCompleted", "materialsSignedAt", "patientInfo", "patientResponsibility", "pofConditionAssessment", "pofFixedFee", "pofFrameDescription", "pofInspectedAt", "pofInspectedBy", "pofInspectionCompleted", "pofInspectionNotes", "pofWaiverSigned", "pofWaiverSignedAt", "quoteNumber", "secondPairDiscount", "secondPairOf", "secondPairType", "status", "subtotal", "tax", "total", "updatedAt", "userId" FROM "quotes";
DROP TABLE "quotes";
ALTER TABLE "new_quotes" RENAME TO "quotes";
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "signatures_quoteId_idx" ON "signatures"("quoteId");

-- CreateIndex
CREATE INDEX "signatures_signatureType_idx" ON "signatures"("signatureType");

-- CreateIndex
CREATE INDEX "signatures_timestamp_idx" ON "signatures"("timestamp");

-- CreateIndex
CREATE INDEX "signatures_signerName_idx" ON "signatures"("signerName");

-- CreateIndex
CREATE INDEX "email_logs_quoteId_idx" ON "email_logs"("quoteId");

-- CreateIndex
CREATE INDEX "email_logs_recipientEmail_idx" ON "email_logs"("recipientEmail");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");
