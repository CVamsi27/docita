import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { EventsModule } from '@/common/events/events.module';
import { CommonServicesModule } from '@/shared/modules/services/common-services.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DocumentsModule } from '@/domains/documents/documents.module';
import { BillingModule } from '@/domains/billing/billing.module';
import { PrescriptionsModule } from '@/domains/prescriptions/prescriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    AppConfigModule,
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        pinoHttp: {
          level: configService.isProduction() ? 'info' : 'debug',
          transport: !configService.isProduction()
            ? { target: 'pino-pretty' }
            : undefined,
          autoLogging: false,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    EventsModule,
    CommonServicesModule,
    PrismaModule,
    DocumentsModule,
    BillingModule,
    PrescriptionsModule,
  ],
})
export class WorkerModule {}
