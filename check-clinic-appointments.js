
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const clinicId = 'cmkdmkwmq0001ruuif1dz0qy4';
    const appointments = await prisma.appointment.findMany({
        where: { clinicId },
        include: {
            patient: true,
            doctor: true,
        }
    });

    console.log(`Appointments for clinic ${clinicId}:`);
    console.log(JSON.stringify(appointments, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
