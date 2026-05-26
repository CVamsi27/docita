import { PrismaService } from '@/prisma/prisma.service';
import { ENTERPRISE_CONTRACT_PERSISTENCE_PORT } from './application/ports/enterprise-contract-persistence.port';
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { EmailModule } from '@/shared/modules/messaging/email/email.module';
import { EnterpriseContractsService } from './application/services/enterprise-contracts.service';
import { EnterpriseContractsQueryService } from './application/services/enterprise-contracts-query.service';
import { EnterpriseContractsCommandService } from './application/services/enterprise-contracts-command.service';
import { EnterpriseContractInvoiceCommandService } from './application/services/enterprise-contract-invoice-command.service';
import { InternalEnterpriseContractsController } from './presentation/controllers/internal-enterprise-contracts.controller';
import { ClinicEnterpriseContractController } from './presentation/controllers/clinic-enterprise-contract.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [
    InternalEnterpriseContractsController,
    ClinicEnterpriseContractController,
  ],
  providers: [
    EnterpriseContractsService,
    EnterpriseContractsQueryService,
    EnterpriseContractsCommandService,
    EnterpriseContractInvoiceCommandService,
  ],
  exports: [EnterpriseContractsService],
})
export class EnterpriseContractsModule {}
