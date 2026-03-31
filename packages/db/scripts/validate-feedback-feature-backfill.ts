import prisma from "./prisma-script-client";

type CountRow = { count: bigint };

async function run(): Promise<void> {
  try {
    const [missingRows] = await prisma.$queryRaw<CountRow[]>`
      WITH expected AS (
        SELECT DISTINCT
          f.id AS feedback_id,
          f."clinicId" AS clinic_id,
          'GOOD'::"FeedbackFeatureType" AS feature_type,
          TRIM(feature) AS feature
        FROM "Feedback" f,
             UNNEST(f."goodFeatures") AS feature
        WHERE TRIM(feature) <> ''
        UNION ALL
        SELECT DISTINCT
          f.id AS feedback_id,
          f."clinicId" AS clinic_id,
          'BAD'::"FeedbackFeatureType" AS feature_type,
          TRIM(feature) AS feature
        FROM "Feedback" f,
             UNNEST(f."badFeatures") AS feature
        WHERE TRIM(feature) <> ''
        UNION ALL
        SELECT DISTINCT
          f.id AS feedback_id,
          f."clinicId" AS clinic_id,
          'IMPROVEMENT'::"FeedbackFeatureType" AS feature_type,
          TRIM(feature) AS feature
        FROM "Feedback" f,
             UNNEST(f."improvementAreas") AS feature
        WHERE TRIM(feature) <> ''
      )
      SELECT COUNT(*)::bigint AS count
      FROM expected e
      LEFT JOIN "FeedbackFeature" ff
        ON ff."feedbackId" = e.feedback_id
       AND ff."clinicId" = e.clinic_id
       AND ff."featureType" = e.feature_type
       AND ff."feature" = e.feature
      WHERE ff.id IS NULL;
    `;

    const [extraRows] = await prisma.$queryRaw<CountRow[]>`
      WITH expected AS (
        SELECT DISTINCT
          f.id AS feedback_id,
          f."clinicId" AS clinic_id,
          'GOOD'::"FeedbackFeatureType" AS feature_type,
          TRIM(feature) AS feature
        FROM "Feedback" f,
             UNNEST(f."goodFeatures") AS feature
        WHERE TRIM(feature) <> ''
        UNION ALL
        SELECT DISTINCT
          f.id AS feedback_id,
          f."clinicId" AS clinic_id,
          'BAD'::"FeedbackFeatureType" AS feature_type,
          TRIM(feature) AS feature
        FROM "Feedback" f,
             UNNEST(f."badFeatures") AS feature
        WHERE TRIM(feature) <> ''
        UNION ALL
        SELECT DISTINCT
          f.id AS feedback_id,
          f."clinicId" AS clinic_id,
          'IMPROVEMENT'::"FeedbackFeatureType" AS feature_type,
          TRIM(feature) AS feature
        FROM "Feedback" f,
             UNNEST(f."improvementAreas") AS feature
        WHERE TRIM(feature) <> ''
      )
      SELECT COUNT(*)::bigint AS count
      FROM "FeedbackFeature" ff
      LEFT JOIN expected e
        ON e.feedback_id = ff."feedbackId"
       AND e.clinic_id = ff."clinicId"
       AND e.feature_type = ff."featureType"
       AND e.feature = ff."feature"
      WHERE e.feedback_id IS NULL;
    `;

    const missingCount = Number(missingRows?.count ?? 0n);
    const extraCount = Number(extraRows?.count ?? 0n);

    process.stdout.write(
      `Feedback backfill validation: missing=${missingCount}, extra=${extraCount}\n`,
    );

    if (missingCount > 0 || extraCount > 0) {
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown feedback backfill validation error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
