import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cptCodes = [
  {
    code: "99202",
    description: "Office/outpatient visit new (15-29 mins)",
    category: "Evaluation and Management",
    price: 100.0,
  },
  {
    code: "99203",
    description: "Office/outpatient visit new (30-44 mins)",
    category: "Evaluation and Management",
    price: 150.0,
  },
  {
    code: "99204",
    description: "Office/outpatient visit new (45-59 mins)",
    category: "Evaluation and Management",
    price: 200.0,
  },
  {
    code: "99205",
    description: "Office/outpatient visit new (60-74 mins)",
    category: "Evaluation and Management",
    price: 250.0,
  },
  {
    code: "99212",
    description: "Office/outpatient visit est (10-19 mins)",
    category: "Evaluation and Management",
    price: 75.0,
  },
  {
    code: "99213",
    description: "Office/outpatient visit est (20-29 mins)",
    category: "Evaluation and Management",
    price: 100.0,
  },
  {
    code: "99214",
    description: "Office/outpatient visit est (30-39 mins)",
    category: "Evaluation and Management",
    price: 150.0,
  },
  {
    code: "99215",
    description: "Office/outpatient visit est (40-54 mins)",
    category: "Evaluation and Management",
    price: 200.0,
  },
  {
    code: "93000",
    description: "Electrocardiogram, routine ECG",
    category: "Medicine",
    price: 50.0,
  },
  {
    code: "90658",
    description: "Influenza virus vaccine",
    category: "Medicine",
    price: 25.0,
  },
  {
    code: "36415",
    description: "Collection of venous blood",
    category: "Surgery",
    price: 15.0,
  },
  {
    code: "81000",
    description: "Urinalysis, by dip stick or tablet",
    category: "Pathology and Laboratory",
    price: 10.0,
  },
  {
    code: "85025",
    description: "Blood count; complete (CBC)",
    category: "Pathology and Laboratory",
    price: 20.0,
  },
  {
    code: "71045",
    description: "Radiologic examination, chest; single view",
    category: "Radiology",
    price: 40.0,
  },
];

async function main() {
  console.log("Start seeding CPT codes...");

  for (const cpt of cptCodes) {
    const { price, ...data } = cpt;

    await prisma.cptCode.upsert({
      where: { code: cpt.code },
      update: {},
      create: {
        code: cpt.code,
        description: cpt.description,
        category: cpt.category,
      },
    });
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
