import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReferralPayoutStatus, ReferralStatus } from '@workspace/db';
import {
  type FacilityLeadView,
  type PartnerMe,
  type PartnerPayoutRow,
  type PartnerReferralRow,
  type ReferrerPayoutDetailsInput,
  type ReferrerPayoutDetailsView,
} from '@workspace/types';
import { mapToView } from './facility-lead.mapper';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { EncryptionService } from '@/shared/common/encryption.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PartnerShowcasePdfService } from '../../application/services/partner-showcase-pdf.service';
import { PartnerTemplateService } from '../../application/services/partner-template.service';

/**
 * Self-service surface for the referral partner. Authenticated by
 * `PartnerAuthGuard`; resolves the referrerId from the guard context
 * and never trusts a body parameter for it.
 */
@Injectable()
export class PartnerPortalService {
  /** 24h signed URL for the partner showcase PDF. */
  private static readonly SHOWCASE_PDF_TTL_SECONDS = 24 * 60 * 60;

  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
    private readonly encryption: EncryptionService,
    private readonly storage: StorageProvider,
    private readonly pdf: PartnerShowcasePdfService,
    private readonly template: PartnerTemplateService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * Compose the /partner/me payload. Counts + the partner's own
   * share / login / signup URLs. The `code` is set at create time
   * (referral-partner-self-service migration); a null here means
   * the row predates the schema upgrade — `welcomeService` exposes
   * a re-backfill endpoint to fix that.
   */
  async getMe(referrerId: string): Promise<PartnerMe> {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id: referrerId },
      include: {
        payoutDetail: {
          select: {
            accountHolder: true,
            accountNumberLast4: true,
            ifscPlain: true,
            bankName: true,
            upiId: true,
            panLast4: true,
            verified: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            referrals: true,
          },
        },
      },
    });
    if (!referrer) throw new NotFoundException('Referrer not found');
    if (!referrer.code) {
      throw new BadRequestException(
        'Referrer has no code. Contact the operator to backfill.',
      );
    }

    const partnerPortalUrl = this.appConfig.getPartnerPortalUrl();
    const signupUrl = `${this.appConfig.getAppUrl()}/onboarding?ref=${referrer.code}`;
    const shareMessage = this.template.renderShareMessage({
      partnerName: referrer.name,
      code: referrer.code,
      signupUrl,
    });

    // Earnings: sum the (status-aware) payouts for this partner.
    const [pendingAgg, paidAgg, convertedCount] = await Promise.all([
      this.prisma.referralPayout.aggregate({
        where: { referrerId, status: ReferralPayoutStatus.PENDING },
        _sum: { amountCents: true },
      }),
      this.prisma.referralPayout.aggregate({
        where: { referrerId, status: ReferralPayoutStatus.PAID },
        _sum: { amountCents: true },
      }),
      this.prisma.referral.count({
        where: { referrerId, status: ReferralStatus.CONVERTED },
      }),
    ]);

    // The showcase PDF is generated on demand and uploaded to storage
    // for the URL. A short-lived signed URL means the partner can
    // download but cannot share a permanent link.
    const showcasePdfUrl = await this.getOrCreateShowcasePdfUrl(
      referrer.id,
      referrer.name,
      referrer.type,
      referrer.code,
      partnerPortalUrl,
      signupUrl,
    );

    return {
      id: referrer.id,
      name: referrer.name,
      type: referrer.type,
      rewardKind: referrer.rewardKind,
      code: referrer.code,
      loginUrl: partnerPortalUrl,
      showcasePdfUrl,
      signupUrl,
      shareMessage,
      active: referrer.active,
      payoutDetails: referrer.payoutDetail
        ? this.toPayoutDetailsView(referrer.id, referrer.payoutDetail)
        : null,
      counts: {
        referrals: referrer._count.referrals,
        converted: convertedCount,
        pendingPayoutsCents: pendingAgg._sum.amountCents ?? 0,
        paidPayoutsCents: paidAgg._sum.amountCents ?? 0,
      },
    };
  }

  async listPayouts(
    referrerId: string,
    options: {
      status?: ReferralPayoutStatus;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<{ items: PartnerPayoutRow[]; nextCursor: string | null }> {
    const limit = Math.min(options.limit ?? 50, 200);
    const rows = await this.prisma.referralPayout.findMany({
      where: { referrerId, status: options.status },
      orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    return this.paginateAndMap(
      rows,
      limit,
      (row): PartnerPayoutRow => ({
        id: row.id,
        periodStart: row.periodStart.toISOString(),
        periodEnd: row.periodEnd.toISOString(),
        baseRevenueCents: row.baseRevenueCents,
        ratePercent: row.ratePercent,
        amountCents: row.amountCents,
        status: row.status,
        paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      }),
    );
  }

  /**
   * The partner's own submitted facility leads, newest first, cursor-
   * paginated. Read-only: the partner can see status + what they
   * submitted but never the internal owner/notification surface (the
   * partner-facing `mapToView` projection).
   */
  async listMyLeads(
    referrerId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<{ items: FacilityLeadView[]; nextCursor: string | null }> {
    const limit = Math.min(options.limit ?? 50, 200);
    const rows = await this.prisma.facilityLead.findMany({
      where: { referrerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        referrer: { select: { id: true, name: true } },
      },
    });
    return this.paginateAndMap(rows, limit, (row) => mapToView(row));
  }

  async listReferrals(
    referrerId: string,
    options: { status?: ReferralStatus; limit?: number; cursor?: string } = {},
  ): Promise<{ items: PartnerReferralRow[]; nextCursor: string | null }> {
    const limit = Math.min(options.limit ?? 50, 200);
    const rows = await this.prisma.referral.findMany({
      where: { referrerId, status: options.status },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        referredClinic: { select: { id: true, name: true } },
      },
    });
    return this.paginateAndMap(
      rows,
      limit,
      (row): PartnerReferralRow => ({
        id: row.id,
        referredClinicId: row.referredClinicId,
        referredClinicName: row.referredClinic?.name ?? undefined,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        convertedAt: row.convertedAt ? row.convertedAt.toISOString() : null,
      }),
    );
  }

  /**
   * Upsert the partner's banking info. Encrypts IFSC + account + PAN
   * with `ENCRYPTION_KEY`, stores plaintext last-4 + IFSC for display.
   * `verified` is intentionally left untouched here — operator flips
   * it after a manual review of the partner's docs.
   */
  async upsertPayoutDetails(
    referrerId: string,
    input: ReferrerPayoutDetailsInput,
  ): Promise<ReferrerPayoutDetailsView> {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id: referrerId },
      select: { id: true, name: true },
    });
    if (!referrer) throw new NotFoundException('Referrer not found');

    const accountLast4 = input.accountNumber.slice(-4);
    const panLast4 = input.pan ? input.pan.slice(-4) : undefined;
    const accountNumberEnc = this.encryption.encrypt(input.accountNumber);
    const ifscEnc = this.encryption.encrypt(input.ifsc);
    const panEnc = input.pan ? this.encryption.encrypt(input.pan) : null;

    const data: Prisma.ReferrerPayoutDetailsUncheckedCreateInput = {
      referrerId,
      accountHolder: input.accountHolder,
      accountNumberEnc,
      accountNumberLast4: accountLast4,
      ifscEnc,
      ifscPlain: input.ifsc,
      bankName: input.bankName,
      upiId: input.upiId ?? null,
      panEnc,
      panLast4: panLast4 ?? null,
    };

    const row = await this.prisma.referrerPayoutDetails.upsert({
      where: { referrerId },
      create: data,
      update: {
        accountHolder: data.accountHolder,
        accountNumberEnc: data.accountNumberEnc,
        accountNumberLast4: data.accountNumberLast4,
        ifscEnc: data.ifscEnc,
        ifscPlain: data.ifscPlain,
        bankName: data.bankName,
        upiId: data.upiId,
        panEnc: data.panEnc,
        panLast4: data.panLast4,
        // Reset verification: changing bank details invalidates the
        // previous "verified" stamp. Operator must re-verify.
        verified: false,
        verifiedAt: null,
      },
    });

    return this.toPayoutDetailsView(referrerId, row);
  }

  async renderShowcasePdf(referrerId: string): Promise<Buffer> {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id: referrerId },
      select: { id: true, name: true, type: true, code: true },
    });
    if (!referrer || !referrer.code) {
      throw new NotFoundException('Referrer or code not found');
    }
    const partnerPortalUrl = this.appConfig.getPartnerPortalUrl();
    const signupUrl = `${this.appConfig.getAppUrl()}/onboarding?ref=${referrer.code}`;
    return this.pdf.render({
      partnerName: referrer.name,
      partnerType: referrer.type,
      code: referrer.code,
      partnerPortalUrl,
      signupUrl,
    });
  }

  async getShareMessage(referrerId: string): Promise<{ message: string }> {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id: referrerId },
      select: { name: true, code: true },
    });
    if (!referrer || !referrer.code) {
      throw new NotFoundException('Referrer or code not found');
    }
    const signupUrl = `${this.appConfig.getAppUrl()}/onboarding?ref=${referrer.code}`;
    return {
      message: this.template.renderShareMessage({
        partnerName: referrer.name,
        code: referrer.code,
        signupUrl,
      }),
    };
  }

  private async getOrCreateShowcasePdfUrl(
    referrerId: string,
    partnerName: string,
    partnerType: 'PHARMACY' | 'MARKETING_PERSON' | 'CUSTOM' | 'CLINIC',
    code: string,
    partnerPortalUrl: string,
    signupUrl: string,
  ): Promise<string> {
    const objectKey = `partners/${referrerId}/showcase.pdf`;
    const buffer = await this.pdf.render({
      partnerName,
      partnerType,
      code,
      partnerPortalUrl,
      signupUrl,
    });
    await this.storage.uploadBuffer(buffer, objectKey, 'application/pdf', {
      metadata: { referrerId, kind: 'partner-showcase' },
    });
    return this.storage.generateSignedUrl(
      objectKey,
      PartnerPortalService.SHOWCASE_PDF_TTL_SECONDS,
    );
  }

  private toPayoutDetailsView(
    referrerId: string,
    row: {
      accountHolder: string;
      accountNumberLast4: string;
      ifscPlain: string;
      bankName: string;
      upiId: string | null;
      panLast4: string | null;
      verified: boolean;
      updatedAt: Date;
    },
  ): ReferrerPayoutDetailsView {
    return {
      referrerId,
      accountHolder: row.accountHolder,
      accountNumberLast4: row.accountNumberLast4,
      ifsc: row.ifscPlain,
      bankName: row.bankName,
      upiId: row.upiId ?? undefined,
      panLast4: row.panLast4 ?? undefined,
      verified: row.verified,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Cursor-paginate a list of `findMany` results with the standard
   * `take: limit + 1` pattern. Returns the trimmed page plus an opaque
   * `nextCursor` (last source row id) for the next page, or `null`
   * when the caller has consumed all rows.
   */
  private paginateAndMap<TIn extends { id: string }, TOut>(
    rows: TIn[],
    limit: number,
    map: (row: TIn) => TOut,
  ): { items: TOut[]; nextCursor: string | null } {
    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    const items = trimmed.map(map);
    const lastSource = hasMore ? trimmed[trimmed.length - 1] : null;
    return { items, nextCursor: lastSource ? lastSource.id : null };
  }
}
