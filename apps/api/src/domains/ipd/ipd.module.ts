import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { IpdService } from '@/domains/ipd/application/services/ipd.service';
import { IpdController } from '@/domains/ipd/presentation/controllers/ipd.controller';
import { IPD_REPOSITORY_TOKEN } from '@/domains/ipd/core/repositories/ipd.repository.interface';
import { PrismaIpdRepository } from '@/domains/ipd/infrastructure/repositories/prisma-ipd.repository';
import { AuditModule } from '@/shared/modules/audit/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [IpdController],
  providers: [
    IpdService,
    {
      provide: IPD_REPOSITORY_TOKEN,
      useClass: PrismaIpdRepository,
    },
  ],
  exports: [IpdService],
})
export class IpdModule {}
