import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const commonIcdCodes = [
  {
    code: "I10",
    description: "Essential (primary) hypertension",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I11.9",
    description: "Hypertensive heart disease without heart failure",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I20.9",
    description: "Angina pectoris, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I21.9",
    description: "Acute myocardial infarction, unspecified",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I25.10",
    description:
      "Atherosclerotic heart disease of native coronary artery without angina pectoris",
    category: "Diseases of the circulatory system",
  },
  {
    code: "I50.9",
    description: "Heart failure, unspecified",
    category: "Diseases of the circulatory system",
  },

  {
    code: "E11.9",
    description: "Type 2 diabetes mellitus without complications",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E11.21",
    description: "Type 2 diabetes mellitus with diabetic nephropathy",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E11.40",
    description:
      "Type 2 diabetes mellitus with diabetic neuropathy, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E03.9",
    description: "Hypothyroidism, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },
  {
    code: "E78.5",
    description: "Hyperlipidemia, unspecified",
    category: "Endocrine, nutritional and metabolic diseases",
  },

  {
    code: "J00",
    description: "Acute nasopharyngitis [common cold]",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J01.90",
    description: "Acute sinusitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J02.9",
    description: "Acute pharyngitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J06.9",
    description: "Acute upper respiratory infection, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J20.9",
    description: "Acute bronchitis, unspecified",
    category: "Diseases of the respiratory system",
  },
  {
    code: "J45.909",
    description: "Unspecified asthma, uncomplicated",
    category: "Diseases of the respiratory system",
  },

  {
    code: "K21.9",
    description: "Gastro-esophageal reflux disease without esophagitis",
    category: "Diseases of the digestive system",
  },
  {
    code: "K29.70",
    description: "Gastritis, unspecified, without bleeding",
    category: "Diseases of the digestive system",
  },
  {
    code: "K58.0",
    description: "Irritable bowel syndrome with diarrhea",
    category: "Diseases of the digestive system",
  },
  {
    code: "K59.00",
    description: "Constipation, unspecified",
    category: "Diseases of the digestive system",
  },

  {
    code: "M54.5",
    description: "Low back pain",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M25.50",
    description: "Pain in unspecified joint",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },
  {
    code: "M17.9",
    description: "Osteoarthritis of knee, unspecified",
    category: "Diseases of the musculoskeletal system and connective tissue",
  },

  {
    code: "R50.9",
    description: "Fever, unspecified",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R05",
    description: "Cough",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R51",
    description: "Headache",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R10.9",
    description: "Unspecified abdominal pain",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },
  {
    code: "R53.83",
    description: "Other fatigue",
    category: "Symptoms, signs and abnormal clinical and laboratory findings",
  },

  {
    code: "A09",
    description: "Infectious gastroenteritis and colitis, unspecified",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "B34.9",
    description: "Viral infection, unspecified",
    category: "Certain infectious and parasitic diseases",
  },
  {
    code: "A41.9",
    description: "Sepsis, unspecified organism",
    category: "Certain infectious and parasitic diseases",
  },
];

async function main() {
  console.log("Start seeding ICD-10 codes...");

  for (const icd of commonIcdCodes) {
    const code = await prisma.icdCode.upsert({
      where: { code: icd.code },
      update: {},
      create: icd,
    });
    console.log(`Created/Updated ICD code: ${code.code}`);
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
