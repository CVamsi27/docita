import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { RlsService } from '@/shared/modules/rls/rls.service';

@Global()
@Module({
  imports: [PrismaModule, AppConfigModule],
  providers: [RlsService],
  exports: [RlsService],
})
export class RlsModule {}
