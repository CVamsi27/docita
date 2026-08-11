// jscpd:ignore-start
import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  ENTERPRISE_CONTRACT_PERSISTENCE_PORT,
  type EnterpriseContractPersistencePort,
} from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import { EnterpriseContractStatus } from '@workspace/db';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Handles enterprise-contract true-up evaluation and alerting.
 *
 * Extracted from EnterpriseContractInvoiceCommandService (SRP):
 * - Invoice generation is a synchronous, transactional write path
 *   (annual prepay, setup fee, adjustment).
 * - True-up is a monthly, alert-shaped, read-mostly cron path that
 *   uses email + AppConfig + clock but does not create invoices.
 *
 * The two paths share only the persistence port and the
 * EnterpriseContract row. Splitting them keeps each file under the
 * 400-line service budget and makes the alert-only path independently
 * testable.
 */
@Injectable()
export class EnterpriseContractTrueUpCommandService {
  private readonly logger = new Logger(
    EnterpriseContractTrueUpCommandService.name,
  );

  constructor(
    @Inject(ENTERPRISE_CONTRACT_PERSISTENCE_PORT)
    private readonly persistence: EnterpriseContractPersistencePort,
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async evaluateAndAlertTrueUp(
    contractId: string,
  ): Promise<{ alerted: boolean; observedPercent: number }> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.persistence.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract || contract.status !== EnterpriseContractStatus.ACTIVE)
        return { alerted: false, observedPercent: 0 };

      const now = this.clock.now();
      const yearStart =
        contract.startDate > new Date(now.getFullYear(), 0, 1)
          ? contract.startDate
          : new Date(now.getFullYear(), 0, 1);
      const monthsElapsed = Math.max(
        1,
        (now.getFullYear() - yearStart.getFullYear()) * 12 +
          (now.getMonth() - yearStart.getMonth()) +
          1,
      );

      const members = await this.persistence.enterpriseContractMember.findMany({
        where: { contractId, removedAt: null },
        // No `take`: bounded by (contractId, removedAt: null). The
        // member set feeds the YTD overage aggregation by clinicId, so
        // every active member must be present.
      });
      const ytdOverageAgg = await this.persistence.usageRecord.aggregate({
        where: {
          clinicId: { in: members.map((m) => m.clinicId) },
          periodStart: { gte: yearStart, lte: now },
        },
        _sum: { overageChargeCents: true },
      });

      const ytdOverageCents = ytdOverageAgg._sum.overageChargeCents ?? 0;
      const ytdPlatformCents = contract.platformFeeCents * monthsElapsed;
      const observedPercent =
        ytdPlatformCents > 0
          ? Math.round(
              ((ytdOverageCents + ytdPlatformCents) * 100) / ytdPlatformCents,
            )
          : 0;

      if (observedPercent < contract.trueUpThresholdPercent)
        return { alerted: false, observedPercent };

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const alreadyAlerted =
        await this.persistence.enterpriseTrueUpAlert.findFirst({
          where: { contractId, alertedAt: { gte: monthStart } },
        });
      if (alreadyAlerted) return { alerted: false, observedPercent };

      const recipients = this.configService.getInternalAllowedEmails();
      await this.persistence.enterpriseTrueUpAlert.create({
        data: {
          contractId,
          thresholdPercent: contract.trueUpThresholdPercent,
          observedPercent,
          ytdOverageCents,
          ytdPlatformCents,
          recipients,
        },
      });
      await this.persistence.enterpriseContract.update({
        where: { id: contractId },
        data: { lastTrueUpAlertAt: now },
      });

      if (recipients.length > 0) {
        const subject = `[Docita] True-up alert: ${contract.contractNumber} at ${observedPercent}% of commit`;
        const body = `Contract ${contract.contractNumber} (primary clinic ${contract.primaryClinicId}) has reached ${observedPercent}% of its annual commitment (threshold: ${contract.trueUpThresholdPercent}%).\n\nYTD platform fees: ${(ytdPlatformCents / 100).toFixed(2)} ${contract.currency}\nYTD overages: ${(ytdOverageCents / 100).toFixed(2)} ${contract.currency}\nMonths elapsed in term: ${monthsElapsed}\n\nAction: open the Docita Internal app → Enterprise Contracts → ${contract.contractNumber} and schedule a renegotiation conversation with the customer's account manager.`;
        try {
          const results = await Promise.all(
            recipients.map((email) =>
              this.emailService.send({ to: email, subject, text: body }),
            ),
          );
          const failed = results.filter((result) => !result.success);
          if (failed.length > 0) {
            this.logger.warn(
              `True-up alert email send failed for ${contract.contractNumber}`,
              {
                failedCount: failed.length,
                errors: failed.map((result) => result.error ?? 'unknown'),
              },
            );
          }
        } catch (err) {
          this.logger.warn(
            `True-up alert email send failed for ${contract.contractNumber}`,
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      }

      this.logger.log(
        `True-up alert raised for ${contract.contractNumber}: ${observedPercent}% (threshold ${contract.trueUpThresholdPercent}%)`,
      );
      return { alerted: true, observedPercent };
    });
  }
}
