import { Prisma } from '@workspace/db';

export const PAYMENT_SESSION_DETAIL_INCLUDE = {
  patient: {
    select: {
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
    },
  },
  invoice: {
    select: {
      id: true,
      total: true,
      dueDate: true,
    },
  },
  clinic: {
    select: {
      name: true,
      phone: true,
    },
  },
} satisfies Prisma.PaymentSessionInclude;

export type PaymentSessionDetailRow = Prisma.PaymentSessionGetPayload<{
  include: typeof PAYMENT_SESSION_DETAIL_INCLUDE;
}>;
