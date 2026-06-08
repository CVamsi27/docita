/**
 * `@/*` resolves to `apps/api/src/*` (see tsconfig). Instrumentation and
 * `WorkerModule` are defined there so scheduler and domain wiring stay in one place.
 */
import "@/instrument";

import * as Sentry from "@sentry/nestjs";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppConfigService } from "@/shared/modules/config/app-configuration.service";
import { EnvironmentConfigService } from "@/shared/modules/config/environment-config.service";
import { AppUrlConfigService } from "@/shared/modules/config/app-url-config.service";
import { StorageConfigService } from "@/shared/modules/config/storage-config.service";
import { AuthSecurityConfigService } from "@/shared/modules/config/auth-security-config.service";
import { CommunicationConfigService } from "@/shared/modules/config/communication-config.service";
import { EmailConfigService } from "@/shared/modules/config/email-config.service";
import { SmsConfigService } from "@/shared/modules/config/sms-config.service";
import { WhatsappConfigService } from "@/shared/modules/config/whatsapp-config.service";
import { PaymentConfigService } from "@/shared/modules/config/payment-config.service";
import { RazorpayConfigService } from "@/shared/modules/config/razorpay-config.service";
import { OpsConfigService } from "@/shared/modules/config/ops-config.service";
import { PlatformInfrastructureConfigService } from "@/shared/modules/config/platform-infrastructure-config.service";
import { ExternalIntegrationsConfigService } from "@/shared/modules/config/external-integrations-config.service";
import { StartupValidationService } from "@/shared/modules/services/startup-validation.service";
import { validateEnv } from "@/shared/modules/config/app-config";
import { WorkerModule } from "@/worker.module";

/**
 * Manually composed the same way `apps/api/src/main.ts` builds it — this runs
 * before the Nest DI container exists, so `AppConfigService`'s constructor
 * dependencies (split into focused config services) have to be wired by hand.
 */
function buildAppConfigService(): AppConfigService {
  return new AppConfigService(
    new EnvironmentConfigService(),
    new AppUrlConfigService(new EnvironmentConfigService()),
    new StorageConfigService(),
    new AuthSecurityConfigService(),
    new CommunicationConfigService(
      new EmailConfigService(),
      new SmsConfigService(),
      new WhatsappConfigService(),
    ),
    new PaymentConfigService(
      new RazorpayConfigService(),
      new OpsConfigService(),
    ),
    new PlatformInfrastructureConfigService(),
    new ExternalIntegrationsConfigService(),
  );
}

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
