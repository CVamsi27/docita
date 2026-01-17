import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
