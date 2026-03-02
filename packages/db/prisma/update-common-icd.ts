import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const commonIcdCodes = [

  "J06.9", 
  "J02.9", 
  "J03.90", 
  "J00", 
  "J20.9", 
  "J18.9", 
  "J45.909", 
  "J44.0", 
  "J44.1", 

  "I10", 
  "I25.10", 
  "I48.91", 
  "I50.9", 

  "E11.9", 
  "E11.65", 
  "E10.9", 

  "F32.9", 
  "F41.1", 
  "F43.10", 

  "M25.511", 
  "M25.512", 
  "M54.5", 
  "M79.1", 
  "M25.50", 
  "M19.90", 

  "A41.9", 
  "N39.0", 
  "J02.9", 
  "B34.9", 

  "K21.9", 
  "K59.00", 
  "R11.10", 
  "K52.9", 

  "E78.5", 
  "E66.9", 
  "E03.9", 

  "Z00.00", 
  "Z23", 
  "Z12.11", 
  "Z13.6", 

  "R50.9", 
  "R05", 
  "R51", 
  "R10.9", 
  "R53.83", 
];

async function main() {

  let updatedCount = 0;

  for (const code of commonIcdCodes) {
    try {
      await prisma.icdCode.updateMany({
        where: { code },
        data: { isCommon: true },
      });
      updatedCount++;

    } catch (error) {

    }
  }

}

main()
  .catch((e) => {

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
