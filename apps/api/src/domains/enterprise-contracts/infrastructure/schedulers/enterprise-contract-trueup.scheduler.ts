import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { EnterpriseContractStatus } from '@workspace/db';
import { EnterpriseContractsService } from '@/domains/enterprise-contracts/application/services/enterprise-contracts.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

@Injectable()
export class EnterpriseContractTrueUpScheduler {
  private readonly logger = new Logger(EnterpriseContractTrueUpScheduler.name);
  private databaseAccessDisabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly contractsService: EnterpriseContractsService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Daily at 03:15. Cheap pass over active contracts; only emits an alert
   * when a contract crosses its `trueUpThresholdPercent` of YTD platform
   * spend, deduped to one alert per calendar month per contract.
   */
  @Cron(CRON_SCHEDULES.ENTERPRISE_CONTRACT_TRUEUP, {
    disabled: isCronDisabledInThisProcess(),
  })
  async evaluateAll(): Promise<void> {
    if (this.databaseAccessDisabled) return;

    this.logger.debug(
      `True-up evaluation run at ${this.clock.now().toISOString()}`,
    );

    try {
      // RLS-BYPASS: enterprise contract administration spans member clinics by design
      await this.prisma.runUnrestricted(async () => {
        const activeContracts = await this.prisma.enterpriseContract.findMany({
          where: { status: EnterpriseContractStatus.ACTIVE },
          select: { id: true, contractNumber: true },
        });
        this.logger.log(
          `True-up scan: ${activeContracts.length} active contracts`,
        );
        const evaluations = await Promise.allSettled(
          activeContracts.map(async (c) => {
            await this.contractsService.evaluateAndAlertTrueUp(c.id);
            return c.contractNumber;
          }),
        );
        for (const [index, result] of evaluations.entries()) {
          if (result.status === 'rejected') {
            const contract = activeContracts[index];
            this.logger.error(
              `True-up evaluation failed for contract ${contract?.contractNumber ?? contract?.id}`,
              result.reason,
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
