const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateSnapshots(clinicId, days) {
  const snapshots = [];
  const now = new Date();

  for (let i = days; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    snapshots.push({
      clinicId,
      period,
      snapshotDate: date,
      totalRevenue: Math.floor(Math.random() * 50000),
      invoiceCount: Math.floor(Math.random() * 50),
      avgInvoiceAmount: Math.floor(Math.random() * 2000),
      totalAppointments: Math.floor(Math.random() * 100),
      completedAppts: Math.floor(Math.random() * 80),
      cancelledAppts: Math.floor(Math.random() * 20),
      appointmentFillRate: parseFloat((Math.random() * 100).toFixed(2)),
      newPatients: Math.floor(Math.random() * 30),
      activePatients: Math.floor(Math.random() * 200),
      appointmentRate: parseFloat((Math.random() * 100).toFixed(2)),
      topConditions: JSON.stringify(['Diabetes', 'Hypertension', 'Fever']),
    });
  }

  return snapshots;
}

async function backfillAnalyticsSnapshots() {
  console.log('Starting analytics snapshots backfill...');

  try {
    const clinics = await prisma.clinic.findMany();

    if (clinics.length === 0) {
      console.log('No clinics found. Skipping backfill.');
      return;
    }

    let totalInserted = 0;

    for (const clinic of clinics) {
      const snapshotsToInsert = generateSnapshots(clinic.id, 90);

      const result = await prisma.analyticsSnapshot.createMany({
        data: snapshotsToInsert,
        skipDuplicates: true,
      });

      totalInserted += result.count;
      console.log(`Clinic ${clinic.id}: Inserted ${result.count} snapshots`);
    }

    console.log(
      `Backfill Complete: ${totalInserted} total analytics snapshots`,
    );
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillAnalyticsSnapshots();
