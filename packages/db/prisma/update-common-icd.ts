import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Most commonly used ICD-10 codes in primary care
const commonIcdCodes = [
  // Respiratory
  "J06.9", // Acute upper respiratory infection, unspecified
  "J02.9", // Acute pharyngitis, unspecified
  "J03.90", // Acute tonsillitis, unspecified
  "J00", // Acute nasopharyngitis (common cold)
  "J20.9", // Acute bronchitis, unspecified
  "J18.9", // Pneumonia, unspecified organism
  "J45.909", // Unspecified asthma, uncomplicated
  "J44.0", // COPD with acute lower respiratory infection
  "J44.1", // COPD with acute exacerbation

  // Cardiovascular
  "I10", // Essential (primary) hypertension
  "I25.10", // Atherosclerotic heart disease without angina
  "I48.91", // Atrial fibrillation, unspecified
  "I50.9", // Heart failure, unspecified

  // Diabetes
  "E11.9", // Type 2 diabetes without complications
  "E11.65", // Type 2 diabetes with hyperglycemia
  "E10.9", // Type 1 diabetes without complications

  // Mental Health
  "F32.9", // Major depressive disorder, single episode, unspecified
  "F41.1", // Generalized anxiety disorder
  "F43.10", // Post-traumatic stress disorder, unspecified

  // Musculoskeletal
  "M25.511", // Pain in right shoulder
  "M25.512", // Pain in left shoulder
  "M54.5", // Low back pain
  "M79.1", // Myalgia
  "M25.50", // Pain in unspecified joint
  "M19.90", // Unspecified osteoarthritis, unspecified site

  // Infections
  "A41.9", // Sepsis, unspecified
  "N39.0", // Urinary tract infection, site not specified
  "J02.9", // Acute pharyngitis
  "B34.9", // Viral infection, unspecified

  // Gastrointestinal
  "K21.9", // Gastro-esophageal reflux disease without esophagitis
  "K59.00", // Constipation, unspecified
  "R11.10", // Vomiting, unspecified
  "K52.9", // Noninfective gastroenteritis

  // Endocrine
  "E78.5", // Hyperlipidemia, unspecified
  "E66.9", // Obesity, unspecified
  "E03.9", // Hypothyroidism, unspecified

  // Preventive/Screening
  "Z00.00", // Encounter for general adult medical examination without abnormal findings
  "Z23", // Encounter for immunization
  "Z12.11", // Encounter for screening for malignant neoplasm of colon
  "Z13.6", // Encounter for screening for cardiovascular disorders

  // Common symptoms
  "R50.9", // Fever, unspecified
  "R05", // Cough
  "R51", // Headache
  "R10.9", // Unspecified abdominal pain
  "R53.83", // Other fatigue
];

async function main() {
  console.log("🏥 Updating common ICD codes...");

  let updatedCount = 0;

  for (const code of commonIcdCodes) {
    try {
      await prisma.icdCode.updateMany({
        where: { code },
        data: { isCommon: true },
      });
      updatedCount++;
      console.log(`✓ Marked ${code} as common`);
    } catch (error) {
      console.log(`✗ Code ${code} not found in database`);
    }
  }

  console.log(`\n✅ Updated ${updatedCount} ICD codes as common`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
