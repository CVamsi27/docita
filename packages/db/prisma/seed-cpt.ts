import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cptCodes = [
    // Evaluation and Management
    { code: '99202', description: 'Office/outpatient visit new (15-29 mins)', category: 'Evaluation and Management', price: 100.00 },
    { code: '99203', description: 'Office/outpatient visit new (30-44 mins)', category: 'Evaluation and Management', price: 150.00 },
    { code: '99204', description: 'Office/outpatient visit new (45-59 mins)', category: 'Evaluation and Management', price: 200.00 },
    { code: '99205', description: 'Office/outpatient visit new (60-74 mins)', category: 'Evaluation and Management', price: 250.00 },
    { code: '99212', description: 'Office/outpatient visit est (10-19 mins)', category: 'Evaluation and Management', price: 75.00 },
    { code: '99213', description: 'Office/outpatient visit est (20-29 mins)', category: 'Evaluation and Management', price: 100.00 },
    { code: '99214', description: 'Office/outpatient visit est (30-39 mins)', category: 'Evaluation and Management', price: 150.00 },
    { code: '99215', description: 'Office/outpatient visit est (40-54 mins)', category: 'Evaluation and Management', price: 200.00 },

    // Common Procedures
    { code: '93000', description: 'Electrocardiogram, routine ECG', category: 'Medicine', price: 50.00 },
    { code: '90658', description: 'Influenza virus vaccine', category: 'Medicine', price: 25.00 },
    { code: '36415', description: 'Collection of venous blood', category: 'Surgery', price: 15.00 },
    { code: '81000', description: 'Urinalysis, by dip stick or tablet', category: 'Pathology and Laboratory', price: 10.00 },
    { code: '85025', description: 'Blood count; complete (CBC)', category: 'Pathology and Laboratory', price: 20.00 },
    { code: '71045', description: 'Radiologic examination, chest; single view', category: 'Radiology', price: 40.00 },
]

async function main() {
    console.log('Start seeding CPT codes...')

    for (const cpt of cptCodes) {
        const { price, ...data } = cpt
        // Note: CptCode model might not have price field yet based on previous schema check.
        // I will check if I need to add price to CptCode model or if I should just ignore it for now.
        // Looking at schema.prisma again...

        await prisma.cptCode.upsert({
            where: { code: cpt.code },
            update: {},
            create: {
                code: cpt.code,
                description: cpt.description,
                category: cpt.category,
            },
        })
    }

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
