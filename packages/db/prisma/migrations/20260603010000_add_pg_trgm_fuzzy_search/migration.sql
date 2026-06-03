-- Add pg_trgm extension for fuzzy/typo-tolerant search.
--
-- The existing full-text search uses English-only plainto_tsquery which
-- cannot handle typos, partial matches, or prefix searches. This migration
-- enables trigram-based similarity matching so "Jhon" still matches "John"
-- and searches in Indian-language names are more forgiving.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Patient: name + MRN + phone trigram indexes for fuzzy ILIKE fallback
CREATE INDEX IF NOT EXISTS "Patient_firstName_trgm_idx"
  ON "Patient" USING gin ("firstName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Patient_lastName_trgm_idx"
  ON "Patient" USING gin ("lastName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Patient_phoneNumber_trgm_idx"
  ON "Patient" USING gin ("phoneNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Patient_mrn_trgm_idx"
  ON "Patient" USING gin ("mrn" gin_trgm_ops);

-- Combined name index for searches spanning first + last name
CREATE INDEX IF NOT EXISTS "Patient_fullName_trgm_idx"
  ON "Patient" USING gin (
    coalesce("firstName", '') || ' ' || coalesce("lastName", '') gin_trgm_ops
  );

-- Appointment: notes + chiefComplaint trigram indexes
CREATE INDEX IF NOT EXISTS "Appointment_notes_trgm_idx"
  ON "Appointment" USING gin ("notes" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Appointment_chiefComplaint_trgm_idx"
  ON "Appointment" USING gin ("chiefComplaint" gin_trgm_ops);
