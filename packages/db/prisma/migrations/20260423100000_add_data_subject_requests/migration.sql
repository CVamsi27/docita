CREATE TYPE "DataSubjectRequestType" AS ENUM (
  'ACCESS',
  'EXPORT',
  'CORRECTION',
  'DELETION',
  'CONSENT_WITHDRAWAL'
);

CREATE TYPE "DataSubjectRequestStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'FULFILLED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "DataSubjectRequest" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT,
  "requestType" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'OPEN',
  "requestedByName" TEXT,
  "requestedByRelation" TEXT,
  "requestChannel" TEXT,
  "requestDetails" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "handledById" TEXT,
  "handledAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_handledById_fkey"
  FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DataSubjectRequest_clinicId_status_idx"
  ON "DataSubjectRequest"("clinicId", "status");

CREATE INDEX "DataSubjectRequest_clinicId_requestType_idx"
  ON "DataSubjectRequest"("clinicId", "requestType");

CREATE INDEX "DataSubjectRequest_patientId_idx"
  ON "DataSubjectRequest"("patientId");

CREATE INDEX "DataSubjectRequest_dueAt_idx"
  ON "DataSubjectRequest"("dueAt");
