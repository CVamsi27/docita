/**
 * `@/*` resolves to `apps/api/src/*` (see tsconfig). Instrumentation and
 * `WorkerModule` are defined there so scheduler and domain wiring stay in one place.
 */
import "@/instrument";

import * as Sentry from "@sentry/nestjs";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { StartupValidationService } from "@/shared/modules/services/startup-validation.service";
import { validateEnv } from "@/shared/modules/config/app-config";
import { buildAppConfigService } from "@/shared/modules/config/app-config.builder";
import { WorkerModule } from "@/worker.module";

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 15_000;

async function bootstrap() {
  try {
    // Ensure config logic treats this process as a worker entrypoint.
    // This prevents enforcing API-only secrets (e.g. JWT_SECRET) when the worker
    // is not serving HTTP auth.
    process.env.WORKER_ENTRYPOINT ??= "worker";
    validateEnv();
    const appConfigService = buildAppConfigService();
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
  const shutdown = (signal: string) => {
    app
      .get(Logger)
      .log(`Received ${signal}, starting graceful shutdown...`, "Worker");
    const timeout = setTimeout(() => {
      process.stderr.write("Graceful shutdown timed out — forcing exit\n");
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
    timeout.unref();
    app
      .close()
      .then(async () => {
        await Sentry.close(5_000);
        process.exit(0);
      })
      .catch((err: Error) => {
        process.stderr.write(`Shutdown error: ${err.message}\n`);
        process.exit(1);
      });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason: unknown) => {
    app
      .get(Logger)
      .error(
        `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
        reason instanceof Error ? reason.stack : undefined,
        "Worker",
      );
  });
  process.on("uncaughtException", (error: Error) => {
    app
      .get(Logger)
      .error(`Uncaught exception: ${error.message}`, error.stack, "Worker");
  });
}

bootstrap().catch((err: Error) => {
  process.stderr.write(
    `Worker bootstrap failed: ${err?.message}\n${err?.stack}\n`,
  );
  process.exit(1);
});
