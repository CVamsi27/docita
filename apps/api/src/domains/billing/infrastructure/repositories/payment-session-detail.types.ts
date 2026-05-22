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
    },
  },
  clinic: {
    select: {
      phone: true,
    },
  },
} satisfies Prisma.PaymentSessionInclude;

export type PaymentSessionDetailRow = Prisma.PaymentSessionGetPayload<{
  include: typeof PAYMENT_SESSION_DETAIL_INCLUDE;
}>;
