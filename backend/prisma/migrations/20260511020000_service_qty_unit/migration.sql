-- Add structured qty / unitPrice so service-charge lines can be shown as
-- "LEVY  2  10.00  20.00" instead of a single lump-sum amount.
ALTER TABLE "ServiceCharge" ADD COLUMN "quantity"  REAL NOT NULL DEFAULT 1;
ALTER TABLE "ServiceCharge" ADD COLUMN "unitPrice" REAL NOT NULL DEFAULT 0;

-- Backfill existing rows: quantity=1, unitPrice=amount (so display unchanged)
UPDATE "ServiceCharge" SET "unitPrice" = "amount" WHERE "unitPrice" = 0;
