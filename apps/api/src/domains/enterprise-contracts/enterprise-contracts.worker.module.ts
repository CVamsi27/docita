import { PrismaService } from '@/prisma/prisma.service';
import { ENTERPRISE_CONTRACT_PERSISTENCE_PORT } from './application/ports/enterprise-contract-persistence.port';
import { Module } from '@nestjs/common';
import { PrismaWorkerModule } from '@/prisma/prisma.worker.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { EnterpriseContractsService } from './application/services/enterprise-contracts.service';
import { EnterpriseContractTrueUpScheduler } from './infrastructure/schedulers/enterprise-contract-trueup.scheduler';

/**
 * Worker-process providers for enterprise contracts. Used by worker.module.ts
 * so the true-up cron and on-demand prepay invoice generation run alongside
 * the other billing schedulers without pulling in HTTP controllers.
 */
@Module({
  imports: [PrismaWorkerModule, EmailModule],
  providers: [
    {
      provide: ENTERPRISE_CONTRACT_PERSISTENCE_PORT,
      useExisting: PrismaService,
    },
    EnterpriseContractsService,
    EnterpriseContractTrueUpScheduler,
  ],
  exports: [EnterpriseContractsService],
})
export class EnterpriseContractsWorkerModule {}
