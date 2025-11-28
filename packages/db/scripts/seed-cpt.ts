import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
    const csvPath = path.join(__dirname, '../data/cpt_codes.csv')
    console.log(`Reading CPT codes from ${csvPath}...`)

    if (!fs.existsSync(csvPath)) {
        console.error('CSV file not found!')
        process.exit(1)
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = fileContent.split('\n')

    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim() !== '')

    console.log(`Found ${dataLines.length} CPT codes to process.`)

    for (const line of dataLines) {
        // Handle potential CSV quoting if needed, but for now simple split
        // Assuming format: code,description,category,price
        // Note: This simple split won't handle commas inside quotes.
        // For robust parsing, a library like csv-parse should be used.
        const parts = line.split(',')
        if (parts.length < 4) continue

        const code = parts[0].trim()
        // Join middle parts in case description has commas (simple heuristic)
        // Actually, let's assume standard format for now.
        // If description has commas, this simple split is risky.
        // Let's try to be slightly smarter: 
        // code is first, price is last, category is second to last.
        // description is everything in between.

        const priceStr = parts[parts.length - 1].trim()
        const category = parts[parts.length - 2].trim()
        const description = parts.slice(1, parts.length - 2).join(',').trim()
        const price = parseFloat(priceStr)

        if (!code || isNaN(price)) {
            console.warn(`Skipping invalid line: ${line}`)
            continue
        }

        await prisma.cptCode.upsert({
            where: { code },
            update: {
                description,
                category,
                price
            },
            create: {
                code,
                description,
                category,
                price
            }
        })
    }

    console.log('CPT codes seeding completed.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
