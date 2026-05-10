-- A BookingGroup holds shared metadata for a set of bookings made together
-- (wedding party, family reunion, conference, etc.). Each individual room
-- still gets its own Booking row so check-ins, room status, and folios stay
-- per-room; the group is just a link/grouping concept.
CREATE TABLE "BookingGroup" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "name"        TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "source"      TEXT NOT NULL,
    "notes"       TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL
);

-- Link each booking back to its group (nullable — most bookings have no group).
ALTER TABLE "Booking" ADD COLUMN "groupId" TEXT;
