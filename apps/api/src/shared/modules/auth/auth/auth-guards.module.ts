import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ClinicAuthCacheService } from './clinic-auth-cache.service';
import { TierGuard } from './tier.guard';

/** Guard providers shared by feature modules without importing full AuthModule (avoids auth↔clinics cycles). */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [ClinicAuthCacheService, TierGuard],
  exports: [ClinicAuthCacheService, TierGuard],
})
export class AuthGuardsModule {}
