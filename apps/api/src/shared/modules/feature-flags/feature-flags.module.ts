import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { FeatureFlagsController } from '@/shared/modules/feature-flags/feature-flags.controller';
import { FeatureFlagsRepository } from '@/shared/modules/feature-flags/feature-flags.repository';
import { FeatureFlagsService } from '@/shared/modules/feature-flags/feature-flags.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsRepository, FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
