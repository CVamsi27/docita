import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { createUtcPoolConfig } from "../src/utc-pool-config";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function getConnectionString(): string {
  const value = process.env.DATABASE_URL;
  if (!value)
    throw new Error("DATABASE_URL is required for DB guardrail scripts.");
  return value;
}

const pool = new Pool(createUtcPoolConfig(getConnectionString()));
const adapter = new PrismaPg(pool, { disposeExternalPool: true });

const prisma = new PrismaClient({ adapter });

export default prisma;
