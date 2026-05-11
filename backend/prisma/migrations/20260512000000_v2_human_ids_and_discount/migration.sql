-- Human-readable IDs for bookings and folios so receptionists can quote
-- them on phone/WhatsApp and pair a folio with its booking at a glance.
-- Format: B-YYMMDD-NNN (booking) / F-YYMMDD-NNN (matching folio).
-- Older rows stay NULL; UI falls back to the short UUID for those.
ALTER TABLE "Booking" ADD COLUMN "humanId" TEXT;
ALTER TABLE "Folio"   ADD COLUMN "humanId" TEXT;
CREATE UNIQUE INDEX "Booking_humanId_key" ON "Booking"("humanId") WHERE "humanId" IS NOT NULL;
CREATE UNIQUE INDEX "Folio_humanId_key"   ON "Folio"("humanId")   WHERE "humanId" IS NOT NULL;

-- Quotation: per-quote discount in pula. Subtracted from net before VAT.
ALTER TABLE "Quotation" ADD COLUMN "discount" REAL NOT NULL DEFAULT 0;
