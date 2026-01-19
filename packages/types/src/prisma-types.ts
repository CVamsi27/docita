import type { Prisma } from "@prisma/client";

/**
 * Prisma Transaction Type
 * Used for database transactions
 */
export type PrismaTransaction = Prisma.TransactionClient;

/**
 * Generic Prisma Where Input
 * For dynamic query building
 */
export type PrismaWhereInput = Record<string, unknown>;

/**
 * Prisma Query Options
 * Common query options for list endpoints
 */
export interface PrismaQueryOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
  where?: PrismaWhereInput;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}
