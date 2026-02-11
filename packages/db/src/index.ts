import { PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  let connectionString = `${process.env.DATABASE_URL}`;

  // Fix for "SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'"
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const sslMode = url.searchParams.get("sslmode");
      if (
        sslMode === "require" ||
        sslMode === "prefer" ||
        sslMode === "verify-ca"
      ) {
        url.searchParams.set("sslmode", "verify-full");
        connectionString = url.toString();
      }
    } catch (error) {
      // If URL parsing fails, we fallback to the original string.
      // This might happen if the connection string involves placeholders or isn't a valid URL format.
      console.warn(
        "Failed to parse DATABASE_URL for SSL mode adjustment",
        error,
      );
    }
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export * from "@prisma/client";

export {
  AppointmentStatus,
  InvoiceStatus,
  QueueTokenStatus,
  PaymentSessionStatus,
  WhatsappLogStatus,
  SubscriptionStatus,
} from "@prisma/client";
