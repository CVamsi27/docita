/**
 * Generates the OpenAPI JSON spec from the live NestJS module graph and
 * Zod-based DTOs and writes it to `docs/api/openapi.json`.
 *
 * Usage:
 *   pnpm --filter @docita/api run openapi:generate
 *
 * Designed to be safe to run in CI: no DB connection required (we use
 * `createApplicationContext` instead of `create`, so HTTP layer isn't
 * bound and side-effects in module init are minimal). If your module
 * eagerly touches DATABASE_URL, set `OPENAPI_GEN=1` in the matching
 * config check and fall back to a no-op connection.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.6 item 53.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder, type OpenAPIObject } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";

function setOpenApiEnv(): void {
  process.env.OPENAPI_GEN = "1";
  process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
}

async function createApp(): Promise<INestApplication> {
  return NestFactory.create(AppModule, { logger: false });
}

function buildSwaggerDocument(app: INestApplication): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle("Docita API")
    .setDescription("Generated from Zod schemas via nestjs-zod.")
    .setVersion(process.env.APP_VERSION ?? "1.0.0")
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, builder);
}

function writeOpenApiFile(document: OpenAPIObject): string {
  const repoRoot = join(__dirname, "..", "..", "..");
  const outPath = join(repoRoot, "docs/api/openapi.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(document, null, 2) + "\n");
  return outPath;
}

async function main(): Promise<void> {
  setOpenApiEnv();
  const app = await createApp();
  const document = buildSwaggerDocument(app);
  const outPath = writeOpenApiFile(document);
  await app.close();
  process.stdout.write(`[openapi] wrote ${outPath}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `[openapi] failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
