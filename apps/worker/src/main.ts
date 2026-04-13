/**
 * `@/*` resolves to `apps/api/src/*` (see tsconfig). Instrumentation and
 * `WorkerModule` are defined there so scheduler and domain wiring stay in one place.
 */
import "@/instrument";

import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppConfigService } from "@/shared/modules/config/app-configuration.service";
import { StartupValidationService } from "@/shared/modules/services/startup-validation.service";
import { validateEnv } from "@/shared/modules/config/app-config";
import { WorkerModule } from "@/worker.module";

async function bootstrap() {
  try {
    validateEnv();
    const appConfigService = new AppConfigService();
    new StartupValidationService(appConfigService).validate();
  } catch (error) {
    process.stderr.write(
      `Startup validation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.get(Logger).log("Worker started", "Worker");

  const shutdown = () =>
    void app.close().then(() => {
      process.exit(0);
    });

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err: Error) => {
  process.stderr.write(
    `Worker bootstrap failed: ${err?.message}\n${err?.stack}\n`,
  );
  process.exit(1);
});
