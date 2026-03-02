import { defineConfig } from "@prisma/config";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
