const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'VIEW',
  'EXPORT',
  'IMPORT',
  'ARCHIVE',
];
const ENTITY_TYPES = [
  'PATIENT',
  'INVOICE',
  'PRESCRIPTION',
  'CONSULTATION',
  'LAB_TEST',
];

function generateAuditLogs(clinicId, userId, count) {
  const logs = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);

    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const entityType =
      ENTITY_TYPES[Math.floor(Math.random() * ENTITY_TYPES.length)];

    logs.push({
      clinicId,
      userId,
      action,
      entityType,
      entityId: `${entityType.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`,
      newValue: {
        status: ['active', 'inactive', 'pending'][
          Math.floor(Math.random() * 3)
        ],
      },
      timestamp,
    });
  }

  return logs;
}

async function backfillAuditLogs() {
  console.log('Starting audit logs backfill...');

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
      const logsToInsert = generateAuditLogs(clinic.id, userId, 50);

      const result = await prisma.auditLog.createMany({
        data: logsToInsert,
        skipDuplicates: true,
      });

      totalInserted += result.count;
      console.log(`Clinic ${clinic.id}: Inserted ${result.count} audit logs`);
    }

    console.log(`Backfill Complete: ${totalInserted} total audit logs`);
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillAuditLogs();
