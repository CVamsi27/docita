import type { Prisma } from "@prisma/client";

export type PrismaTransaction = Prisma.TransactionClient;

export type PrismaWhereInput = Record<string, unknown>;

export interface PrismaQueryOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
  where?: PrismaWhereInput;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}
