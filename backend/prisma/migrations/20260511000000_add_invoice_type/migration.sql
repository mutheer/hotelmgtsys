-- AlterTable: Add document type to Invoice (INVOICE or RECEIPT)
ALTER TABLE "Invoice" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'INVOICE';

-- Snapshot the financial state at issue time so the document stays stable
-- even if the underlying folio is edited afterwards.
ALTER TABLE "Invoice" ADD COLUMN "subtotal"     REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "discount"     REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "vat"          REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "totalAmount"  REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "paidAmount"   REAL NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "balanceDue"   REAL NOT NULL DEFAULT 0;
-- JSON-encoded snapshot of line items at issue time
ALTER TABLE "Invoice" ADD COLUMN "lineItems"    TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Invoice" ADD COLUMN "issuedById"   TEXT;
