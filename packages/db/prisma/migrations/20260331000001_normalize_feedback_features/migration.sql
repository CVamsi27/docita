-- Normalize feedback feature arrays into a query-friendly table.
CREATE TYPE "FeedbackFeatureType" AS ENUM ('GOOD', 'BAD', 'IMPROVEMENT');

CREATE TABLE "FeedbackFeature" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "featureType" "FeedbackFeatureType" NOT NULL,
  "feature" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedbackFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedbackFeature_feedbackId_featureType_feature_key"
  ON "FeedbackFeature"("feedbackId", "featureType", "feature");
CREATE INDEX "FeedbackFeature_clinicId_featureType_idx"
  ON "FeedbackFeature"("clinicId", "featureType");
CREATE INDEX "FeedbackFeature_featureType_feature_idx"
  ON "FeedbackFeature"("featureType", "feature");
CREATE INDEX "FeedbackFeature_feedbackId_idx"
  ON "FeedbackFeature"("feedbackId");

ALTER TABLE "FeedbackFeature"
  ADD CONSTRAINT "FeedbackFeature_feedbackId_fkey"
  FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackFeature"
  ADD CONSTRAINT "FeedbackFeature_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FeedbackFeature" ("id", "feedbackId", "clinicId", "featureType", "feature", "createdAt")
SELECT
  CONCAT('ff_', SUBSTRING(MD5(CONCAT(f."id", '|GOOD|', TRIM(feature_item))), 1, 20)) AS id,
  f."id",
  f."clinicId",
  'GOOD'::"FeedbackFeatureType",
  TRIM(feature_item),
  f."createdAt"
FROM "Feedback" f
CROSS JOIN LATERAL UNNEST(COALESCE(f."goodFeatures", ARRAY[]::TEXT[])) AS feature_item
WHERE TRIM(feature_item) <> ''
ON CONFLICT ("feedbackId", "featureType", "feature") DO NOTHING;

INSERT INTO "FeedbackFeature" ("id", "feedbackId", "clinicId", "featureType", "feature", "createdAt")
SELECT
  CONCAT('ff_', SUBSTRING(MD5(CONCAT(f."id", '|BAD|', TRIM(feature_item))), 1, 20)) AS id,
  f."id",
  f."clinicId",
  'BAD'::"FeedbackFeatureType",
  TRIM(feature_item),
  f."createdAt"
FROM "Feedback" f
CROSS JOIN LATERAL UNNEST(COALESCE(f."badFeatures", ARRAY[]::TEXT[])) AS feature_item
WHERE TRIM(feature_item) <> ''
ON CONFLICT ("feedbackId", "featureType", "feature") DO NOTHING;

INSERT INTO "FeedbackFeature" ("id", "feedbackId", "clinicId", "featureType", "feature", "createdAt")
SELECT
  CONCAT('ff_', SUBSTRING(MD5(CONCAT(f."id", '|IMPROVEMENT|', TRIM(feature_item))), 1, 20)) AS id,
  f."id",
  f."clinicId",
  'IMPROVEMENT'::"FeedbackFeatureType",
  TRIM(feature_item),
  f."createdAt"
FROM "Feedback" f
CROSS JOIN LATERAL UNNEST(COALESCE(f."improvementAreas", ARRAY[]::TEXT[])) AS feature_item
WHERE TRIM(feature_item) <> ''
ON CONFLICT ("feedbackId", "featureType", "feature") DO NOTHING;
