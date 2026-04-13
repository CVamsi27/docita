import "./instrument";

import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
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
