CREATE TYPE "AbdmCareContextSource" AS ENUM ('OP_CONSULTATION', 'PRESCRIPTION', 'DIAGNOSTIC_REPORT', 'DISCHARGE_SUMMARY', 'HEALTH_DOCUMENT', 'INVOICE');
CREATE TYPE "AbdmCareContextStatus" AS ENUM ('READY', 'LINK_REQUESTED', 'LINKED', 'SHARE_REQUESTED', 'SHARED', 'FAILED');
CREATE TYPE "AbdmTransactionType" AS ENUM ('M1_ABHA_VERIFY', 'M2_GENERATE_CONTEXT', 'M2_LINK_CONTEXT', 'M2_DISCOVER_CALLBACK', 'M2_LINK_CALLBACK', 'M2_DATA_REQUEST', 'M2_DATA_PUSH', 'M2_NOTIFY', 'M3_CONSENT_REQUEST', 'M3_CONSENT_CALLBACK', 'M3_DATA_FETCH');
CREATE TYPE "AbdmTransactionDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');
CREATE TYPE "AbdmTransactionStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'SUCCEEDED', 'FAILED', 'RETRYABLE');
CREATE TYPE "AbdmConsentRequestStatus" AS ENUM ('DRAFT', 'REQUESTED', 'GRANTED', 'DENIED', 'EXPIRED', 'REVOKED', 'FAILED');

CREATE TABLE "AbdmCareContext" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "sourceType" "AbdmCareContextSource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "referenceNumber" TEXT NOT NULL,
  "display" TEXT NOT NULL,
  "hiType" TEXT NOT NULL,
  "status" "AbdmCareContextStatus" NOT NULL DEFAULT 'READY',
  "fhirBundle" JSONB,
  "linkedAt" TIMESTAMPTZ(3),
  "lastSharedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AbdmCareContext_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AbdmTransaction" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT,
  "careContextId" TEXT,
  "type" "AbdmTransactionType" NOT NULL,
  "direction" "AbdmTransactionDirection" NOT NULL,
  "status" "AbdmTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "requestId" TEXT,
  "transactionId" TEXT,
  "correlationId" TEXT,
  "payload" JSONB,
  "error" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AbdmTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AbdmConsentRequest" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "abhaAddress" TEXT NOT NULL,
  "purposeCode" TEXT NOT NULL,
  "purposeText" TEXT NOT NULL,
  "status" "AbdmConsentRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "requestId" TEXT,
  "consentId" TEXT,
  "artefactId" TEXT,
  "requestedAt" TIMESTAMPTZ(3),
  "grantedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3),
  "rawArtifact" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AbdmConsentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AbdmExternalRecord" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "consentRequestId" TEXT,
  "sourceHipId" TEXT,
  "careContextReference" TEXT,
  "careContextId" TEXT,
  "hiType" TEXT NOT NULL,
  "fhirBundle" JSONB,
  "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AbdmExternalRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AbdmCareContext_clinic_source_key" ON "AbdmCareContext"("clinicId", "sourceType", "sourceId");
CREATE UNIQUE INDEX "AbdmCareContext_clinic_ref_key" ON "AbdmCareContext"("clinicId", "referenceNumber");
CREATE INDEX "AbdmCareContext_clinicId_patientId_idx" ON "AbdmCareContext"("clinicId", "patientId");
CREATE INDEX "AbdmCareContext_clinicId_status_idx" ON "AbdmCareContext"("clinicId", "status");
CREATE INDEX "AbdmCareContext_patientId_createdAt_idx" ON "AbdmCareContext"("patientId", "createdAt");
CREATE INDEX "AbdmTransaction_clinicId_status_createdAt_idx" ON "AbdmTransaction"("clinicId", "status", "createdAt");
CREATE INDEX "AbdmTransaction_clinicId_type_createdAt_idx" ON "AbdmTransaction"("clinicId", "type", "createdAt");
CREATE INDEX "AbdmTransaction_requestId_idx" ON "AbdmTransaction"("requestId");
CREATE INDEX "AbdmTransaction_transactionId_idx" ON "AbdmTransaction"("transactionId");
CREATE INDEX "AbdmTransaction_nextRetryAt_idx" ON "AbdmTransaction"("nextRetryAt");
CREATE INDEX "AbdmConsentRequest_clinicId_patientId_idx" ON "AbdmConsentRequest"("clinicId", "patientId");
CREATE INDEX "AbdmConsentRequest_clinicId_status_createdAt_idx" ON "AbdmConsentRequest"("clinicId", "status", "createdAt");
CREATE INDEX "AbdmConsentRequest_requestId_idx" ON "AbdmConsentRequest"("requestId");
CREATE INDEX "AbdmConsentRequest_consentId_idx" ON "AbdmConsentRequest"("consentId");
CREATE INDEX "AbdmExternalRecord_clinicId_patientId_receivedAt_idx" ON "AbdmExternalRecord"("clinicId", "patientId", "receivedAt");
CREATE INDEX "AbdmExternalRecord_consentRequestId_idx" ON "AbdmExternalRecord"("consentRequestId");
CREATE INDEX "AbdmExternalRecord_careContextReference_idx" ON "AbdmExternalRecord"("careContextReference");

ALTER TABLE "AbdmCareContext" ADD CONSTRAINT "AbdmCareContext_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmCareContext" ADD CONSTRAINT "AbdmCareContext_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmTransaction" ADD CONSTRAINT "AbdmTransaction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmTransaction" ADD CONSTRAINT "AbdmTransaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AbdmTransaction" ADD CONSTRAINT "AbdmTransaction_careContextId_fkey" FOREIGN KEY ("careContextId") REFERENCES "AbdmCareContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AbdmConsentRequest" ADD CONSTRAINT "AbdmConsentRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmConsentRequest" ADD CONSTRAINT "AbdmConsentRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmExternalRecord" ADD CONSTRAINT "AbdmExternalRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmExternalRecord" ADD CONSTRAINT "AbdmExternalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbdmExternalRecord" ADD CONSTRAINT "AbdmExternalRecord_consentRequestId_fkey" FOREIGN KEY ("consentRequestId") REFERENCES "AbdmConsentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AbdmExternalRecord" ADD CONSTRAINT "AbdmExternalRecord_careContextId_fkey" FOREIGN KEY ("careContextId") REFERENCES "AbdmCareContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;
