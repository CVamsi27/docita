import { PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = `${process.env.DATABASE_URL}`;

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV === "development") globalThis.prismaGlobal = prisma;

export * from "@prisma/client";

export {
  AppointmentStatus,
  InvoiceStatus,
  QueueTokenStatus,
  PaymentSessionStatus,
  WhatsappLogStatus,
  SubscriptionStatus,
} from "@prisma/client";
