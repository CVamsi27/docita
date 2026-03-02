// Avoid importing database runtime types into the shared `types` package.
// The `types` package must remain a lightweight, runtime-free source
// of schema and inferred TypeScript types. Use conservative, framework-
// agnostic shapes here so consumers can narrow as needed in their
// implementation boundaries.

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
