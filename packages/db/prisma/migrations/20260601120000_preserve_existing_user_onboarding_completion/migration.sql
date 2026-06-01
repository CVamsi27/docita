-- Existing clinic users must never be sent through full onboarding again.
-- A clinic association is the durable workspace boundary. New post-signup
-- requirements belong in targeted prompts, not by resetting onboardingStep.
UPDATE "User"
SET
  "onboardingStep" = 'COMPLETED',
  "onboardingCompletedAt" = COALESCE("onboardingCompletedAt", CURRENT_TIMESTAMP)
WHERE "clinicId" IS NOT NULL
  AND (
    "onboardingStep" IS DISTINCT FROM 'COMPLETED'
    OR "onboardingCompletedAt" IS NULL
  );

CREATE OR REPLACE FUNCTION enforce_user_clinic_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."clinicId" IS NOT NULL THEN
    NEW."onboardingStep" := 'COMPLETED';
    NEW."onboardingCompletedAt" := COALESCE(
      NEW."onboardingCompletedAt",
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_clinic_onboarding_completion_trigger"
BEFORE INSERT OR UPDATE OF "clinicId", "onboardingStep", "onboardingCompletedAt"
ON "User"
FOR EACH ROW
EXECUTE FUNCTION enforce_user_clinic_onboarding_completion();
