-- CreateTable
CREATE TABLE "Quotation" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "quoteNumber"   TEXT NOT NULL,
    "date"          DATETIME NOT NULL,
    "clientName"    TEXT NOT NULL,
    "clientTel"     TEXT,
    "clientEmail"   TEXT,
    "clientAddress" TEXT,
    "lineItems"     TEXT NOT NULL DEFAULT '[]',
    "notes"         TEXT,
    "bankDetails"   TEXT,
    "subtotal"      REAL NOT NULL DEFAULT 0,
    "vatPct"        REAL NOT NULL DEFAULT 12,
    "vatAmount"     REAL NOT NULL DEFAULT 0,
    "total"         REAL NOT NULL DEFAULT 0,
    "createdById"   TEXT,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quoteNumber_key" ON "Quotation"("quoteNumber");
