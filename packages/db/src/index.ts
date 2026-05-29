import { PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";

/** Force PostgreSQL session timezone to UTC for predictable timestamptz reads/writes. */
export function withUtcSessionTimezone(config: PoolConfig): PoolConfig {
  const existing = config.options?.trim();
  const utcOption = "-c TimeZone=UTC";
  return {
    ...config,
    options: existing ? `${existing} ${utcOption}` : utcOption,
  };
}

export function createUtcPoolConfig(connectionString: string): PoolConfig;
export function createUtcPoolConfig(config: PoolConfig): PoolConfig;
export function createUtcPoolConfig(
  configOrConnectionString: string | PoolConfig,
): PoolConfig {
  if (typeof configOrConnectionString === "string") {
    return withUtcSessionTimezone({
      connectionString: configOrConnectionString,
    });
  }
  return withUtcSessionTimezone(configOrConnectionString);
}

const prismaClientSingleton = () => {
  const connectionString = `${process.env.DATABASE_URL}`;

  const pool = new Pool(createUtcPoolConfig(connectionString));
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
