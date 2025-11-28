import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(__dirname, "../data/cpt_codes.csv");
  console.log(`Reading CPT codes from ${csvPath}...`);

  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found!");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const lines = fileContent.split("\n");

  const dataLines = lines.slice(1).filter((line) => line.trim() !== "");

  console.log(`Found ${dataLines.length} CPT codes to process.`);

  for (const line of dataLines) {
    const parts = line.split(",");
    if (parts.length < 4) continue;

    const code = parts[0].trim();
    const priceStr = parts[parts.length - 1].trim();
    const category = parts[parts.length - 2].trim();
    const description = parts
      .slice(1, parts.length - 2)
      .join(",")
      .trim();
    const price = parseFloat(priceStr);

    if (!code || isNaN(price)) {
      console.warn(`Skipping invalid line: ${line}`);
      continue;
    }

    await prisma.cptCode.upsert({
      where: { code },
      update: {
        description,
        category,
        price,
      },
      create: {
        code,
        description,
        category,
        price,
      },
    });
  }

  console.log("CPT codes seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
