import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { EnterpriseContractStatus } from '@workspace/db';
import { EnterpriseContractsService } from '@/domains/enterprise-contracts/application/services/enterprise-contracts.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';

@Injectable()
export class EnterpriseContractTrueUpScheduler {
  private readonly logger = new Logger(EnterpriseContractTrueUpScheduler.name);
  private databaseAccessDisabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: EnterpriseContractsService,
  ) {}

  /**
   * Daily at 03:15. Cheap pass over active contracts; only emits an alert
   * when a contract crosses its `trueUpThresholdPercent` of YTD platform
   * spend, deduped to one alert per calendar month per contract.
   */
  @Cron('15 3 * * *', { disabled: isCronDisabledInThisProcess() })
  async evaluateAll(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    try {
      await this.prisma.runUnrestricted(async () => {
        const activeContracts = await this.prisma.enterpriseContract.findMany({
          where: { status: EnterpriseContractStatus.ACTIVE },
          select: { id: true, contractNumber: true },
        });
        this.logger.log(
          `True-up scan: ${activeContracts.length} active contracts`,
        );
        for (const c of activeContracts) {
          try {
            await this.contractsService.evaluateAndAlertTrueUp(c.id);
          } catch (err) {
            this.logger.error(
              `True-up evaluation failed for contract ${c.contractNumber}`,
              err,
            );
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (
        message.includes('authentication failed against the database server') ||
        message.includes('password authentication failed')
      ) {
        this.databaseAccessDisabled = true;
        this.logger.warn(
          'Disabling true-up scheduler due to database authentication failure.',
        );
        return;
      }
      this.logger.error('True-up cron failed', error);
    }
  }
}
