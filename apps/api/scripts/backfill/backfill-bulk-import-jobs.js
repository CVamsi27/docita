const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateImportJobs(clinicId, userId, count) {
  const jobs = [];
  const now = new Date();
  const importTypes = ['PATIENTS', 'INVOICES', 'PRESCRIPTIONS', 'APPOINTMENTS'];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const jobDate = new Date(now);
    jobDate.setDate(jobDate.getDate() - daysAgo);

    const totalRows = Math.floor(Math.random() * 500) + 100;
    const successRows = Math.floor(totalRows * (Math.random() * 0.3 + 0.7));
    const failedRows = totalRows - successRows;

    jobs.push({
      clinicId,
      userId,
      importType: importTypes[Math.floor(Math.random() * importTypes.length)],
      fileName: `import_${Date.now()}_${i}.xlsx`,
      fileSize: Math.floor(Math.random() * 5000000),
      totalRows,
      processedRows: totalRows,
      successRows,
      failedRows,
      skippedRows: 0,
      duration: Math.floor(Math.random() * 300),
      status: failedRows === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      errors: failedRows > 0 ? { errorCount: failedRows } : {},
      errorSummary:
        failedRows > 0 ? `${failedRows} rows failed validation` : null,
      createdAt: jobDate,
    });
  }

  return jobs;
}

async function backfillBulkImportJobs() {
  console.log('Starting bulk import jobs backfill...');

  try {
    const clinics = await prisma.clinic.findMany({
      include: { users: { take: 1 } },
    });

    if (clinics.length === 0) {
      console.log('No clinics found. Skipping backfill.');
      return;
    }

    let totalInserted = 0;

    for (const clinic of clinics) {
      if (clinic.users.length === 0) continue;

      const userId = clinic.users[0].id;
      const jobsToInsert = generateImportJobs(clinic.id, userId, 20);

      const result = await prisma.bulkImportJob.createMany({
        data: jobsToInsert,
        skipDuplicates: true,
      });

      totalInserted += result.count;
      console.log(`Clinic ${clinic.id}: Inserted ${result.count} import jobs`);
    }

    console.log(`Backfill Complete: ${totalInserted} total bulk import jobs`);
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillBulkImportJobs();
