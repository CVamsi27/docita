import { MODULE_METADATA } from "@nestjs/common/constants";
import type { DynamicModule } from "@nestjs/common";

describe("worker scheduler configuration", () => {
  const previous = process.env.ENABLE_SCHEDULERS;
  afterEach(() => {
    if (previous === undefined) delete process.env.ENABLE_SCHEDULERS;
    else process.env.ENABLE_SCHEDULERS = previous;
  });

  it.each([false, true])(
    "keeps the scheduler registry available when job activation is %s",
    async (enabled) => {
      process.env.ENABLE_SCHEDULERS = String(enabled);
      await jest.isolateModulesAsync(async () => {
        const { Module } = await import("@nestjs/common");
        const { NestFactory } = await import("@nestjs/core");
        const { ScheduleModule, SchedulerRegistry, Cron } =
          await import("@nestjs/schedule");
        const { WorkerModule } = await import("@/worker.module");

        const imports: unknown = Reflect.getMetadata(
          MODULE_METADATA.IMPORTS,
          WorkerModule,
        );
        if (!Array.isArray(imports))
          throw new Error("Worker module imports are missing");
        const scheduling = imports.filter(
          (entry: unknown): entry is DynamicModule =>
            entry !== null &&
            typeof entry === "object" &&
            "module" in entry &&
            entry.module === ScheduleModule,
        );
        class ScheduledProbe {
          handleTick(): void {}
        }
        const descriptor = Object.getOwnPropertyDescriptor(
          ScheduledProbe.prototype,
          "handleTick",
        );
        if (!descriptor) throw new Error("Scheduled probe method is missing");
        Cron("0 0 * * * *", { name: "worker-scheduler-probe" })(
          ScheduledProbe.prototype,
          "handleTick",
          descriptor,
        );
        class SchedulerFixture {}
        Module({
          imports: [ScheduleModule, ...scheduling],
          providers: [ScheduledProbe],
        })(SchedulerFixture);

        const app = await NestFactory.createApplicationContext(
          SchedulerFixture,
          {
            logger: false,
            abortOnError: false,
          },
        );
        try {
          expect(app.get(SchedulerRegistry).getCronJobs().size).toBe(
            enabled ? 1 : 0,
          );
        } finally {
          await app.close();
        }
      });
    },
  );
});
