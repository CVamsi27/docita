const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const METRIC_TYPES = [
  'CPU_USAGE',
  'MEMORY_USAGE',
  'HEAP_USED',
  'HEAP_TOTAL',
  'ACTIVE_CONNECTIONS',
  'DB_QUERY_TIME',
  'UPTIME',
  'REQUEST_COUNT',
  'ERROR_RATE',
  'AVG_RESPONSE_TIME',
];

function generateMetrics(days) {
  const metrics = [];
  const now = new Date();

  for (let d = days; d > 0; d--) {
    const metricDate = new Date(now);
    metricDate.setDate(metricDate.getDate() - d);

    for (let h = 0; h < 24; h++) {
      const timestamp = new Date(metricDate);
      timestamp.setHours(h, 0, 0, 0);

      for (const metricType of METRIC_TYPES) {
        let value = 0;

        switch (metricType) {
          case 'CPU_USAGE':
            value = Math.random() * 80 + 10;
            break;
          case 'MEMORY_USAGE':
            value = Math.random() * 70 + 20;
            break;
          case 'HEAP_USED':
            value = Math.random() * 500 + 100;
            break;
          case 'HEAP_TOTAL':
            value = 2048;
            break;
          case 'ACTIVE_CONNECTIONS':
            value = Math.floor(Math.random() * 100 + 10);
            break;
          case 'DB_QUERY_TIME':
            value = Math.random() * 500 + 50;
            break;
          case 'UPTIME':
            value = Math.random() * 100;
            break;
          case 'REQUEST_COUNT':
            value = Math.floor(Math.random() * 1000 + 100);
            break;
          case 'ERROR_RATE':
            value = Math.random() * 5;
            break;
          case 'AVG_RESPONSE_TIME':
            value = Math.random() * 200 + 50;
            break;
        }

        metrics.push({
          metricType,
          value: parseFloat(value.toFixed(2)),
          timestamp,
          metadata: {
            instance: 'prod-api-01',
            environment: 'production',
          },
        });
      }
    }
  }

  return metrics;
}

async function backfillSystemMetrics() {
  console.log('Starting system metrics backfill...');

  try {
    const metricsToInsert = generateMetrics(30);

    const result = await prisma.systemMetric.createMany({
      data: metricsToInsert,
      skipDuplicates: true,
    });

    console.log(`Backfill Complete: ${result.count} total system metrics`);
  } catch (error) {
    console.error('Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillSystemMetrics();
