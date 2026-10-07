-- P02 — public booking requests hold their slot.
--
-- A public appointment request is only a candidate: the clinic's approval is
-- the final booking, and that approval path is already claimed atomically.
-- What was missing is that the candidate itself had no identity, so a retried
-- or double-tapped submission filed a second PENDING request for the same
-- doctor and slot with nothing to detect it.
--
-- `pendingSlotKey` is that identity while the request is PENDING, and it is
-- cleared when the request is reviewed, so a rejected slot frees up for the
-- next request. The unique index is the guarantee: a retry cannot create a
-- duplicate, even when two submissions race past the service-level check.
--
-- Every existing row starts NULL. NULL never conflicts in a Postgres unique
-- index, so no historical request is reclassified and the constraint cannot
-- fail on legacy data; historical PENDING duplicates stay for the clinic to
-- resolve rather than being silently rewritten.

-- AlterTable
ALTER TABLE "AppointmentRequest" ADD COLUMN     "pendingSlotKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentRequest_pendingSlotKey_key" ON "AppointmentRequest"("pendingSlotKey");
