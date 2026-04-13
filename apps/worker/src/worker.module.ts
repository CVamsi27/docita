import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";
import { AppConfigModule } from "@/shared/modules/config/config.module";
import { AppConfigService } from "@/shared/modules/config/app-configuration.service";
import { EventsModule } from "@/common/events/events.module";
import { PrismaWorkerModule } from "@/prisma/prisma.worker.module";
import { DocumentsWorkerModule } from "@/domains/documents/documents.worker.module";
import { BillingWorkerModule } from "@/domains/billing/billing.worker.module";
import { PrescriptionsWorkerModule } from "@/domains/prescriptions/prescriptions.worker.module";

const ENABLE_SCHEDULERS = process.env.ENABLE_SCHEDULERS !== "false";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    AppConfigModule,
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        pinoHttp: {
          level: configService.isProduction() ? "info" : "debug",
          transport: !configService.isProduction()
            ? { target: "pino-pretty" }
            : undefined,
          autoLogging: false,
        },
      }),
    }),
    ...(ENABLE_SCHEDULERS ? [ScheduleModule.forRoot()] : []),
    EventsModule,
    PrismaWorkerModule,
    DocumentsWorkerModule,
    BillingWorkerModule,
    PrescriptionsWorkerModule,
  ],
})
export class WorkerModule {}
