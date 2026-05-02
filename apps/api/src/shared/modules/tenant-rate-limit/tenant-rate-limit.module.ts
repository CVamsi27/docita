import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { ClinicApiQuotasController } from '@/shared/modules/tenant-rate-limit/clinic-api-quotas.controller';
import { TenantRateLimitGuard } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.guard';
import { TenantRateLimitRepository } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.repository';
import { TenantRateLimitService } from '@/shared/modules/tenant-rate-limit/tenant-rate-limit.service';

@Global()
@Module({
  imports: [PrismaModule, AppConfigModule],
  controllers: [ClinicApiQuotasController],
  providers: [
    TenantRateLimitRepository,
    TenantRateLimitService,
    TenantRateLimitGuard,
  ],
  exports: [TenantRateLimitService, TenantRateLimitGuard],
})
export class TenantRateLimitModule {}
