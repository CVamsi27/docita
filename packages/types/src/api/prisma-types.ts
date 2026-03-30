export type PrismaTransaction = unknown;

export type PrismaWhereInput = Record<string, unknown>;

export interface PrismaQueryOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
  where?: PrismaWhereInput;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}
