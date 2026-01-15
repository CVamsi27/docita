
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clinicId = 'cmkdmkwmq0001ruuif1dz0qy4';
    const doctorId = 'cmkdmkw7q0000ruuik44jp9w9';
    const dateStr = '2026-01-14';

    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    console.log('Range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

    const where = {
        clinicId,
        doctorId,
        startTime: {
            gte: startOfDay,
            lte: endOfDay,
        }
    };

    console.log('Final Where Clause:', JSON.stringify(where, null, 2));

    const count = await prisma.appointment.count({ where });
    console.log('Count:', count);

    const items = await prisma.appointment.findMany({
        where,
        select: {
            id: true,
            startTime: true,
            patient: {
                select: {
                    firstName: true,
                    lastName: true,
                }
            }
        }
    });

    console.log('Items:', JSON.stringify(items, null, 2));

    if (items.length === 0) {
        console.log('Trying without date filter...');
        const allInClinic = await prisma.appointment.findMany({
            where: { clinicId },
            select: { startTime: true }
        });
        console.log('All appointments in clinic:', JSON.stringify(allInClinic, null, 2));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
