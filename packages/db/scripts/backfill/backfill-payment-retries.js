const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backfillPaymentRetries() {

  try {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: 'UNPAID' },
      take: 100,
    });

    if (unpaidInvoices.length === 0) {

      return;
    }

    let totalInserted = 0;

    for (const invoice of unpaidInvoices) {
      const now = new Date();
      const retrySchedule = [];

      for (let i = 1; i <= 3; i++) {
        const nextRetryDate = new Date(now);
        nextRetryDate.setDate(nextRetryDate.getDate() + i * 2);

        retrySchedule.push({
          invoiceId: invoice.id,
          clinicId: invoice.clinicId,
          paymentGateway: 'RAZORPAY',
          retryCount: i - 1,
          nextRetryDate,
          status: i === 1 ? 'PENDING' : 'SCHEDULED',
          lastAttemptedAt: i > 1 ? new Date(now.getTime() - 86400000) : null,
          failureReason: i > 1 ? 'Insufficient funds' : null,
          amount: invoice.totalAmount,
        });
      }

      const result = await prisma.paymentRetry.createMany({
        data: retrySchedule,
        skipDuplicates: true,
      });

      totalInserted += result.count;
      
    }

  } catch (error) {

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillPaymentRetries();
