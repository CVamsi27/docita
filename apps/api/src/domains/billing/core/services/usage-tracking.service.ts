import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageType, ClinicTier, Prisma } from '@workspace/db';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import {
  PRICING_CURRENCY_CONFIG,
  TIER_LIMITS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  getWhatsAppAddonPricingByCurrency,
  type TierName,
  type SupportedCurrency,
} from '@workspace/types';

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private prisma: PrismaService) {}

  private resolveCurrency(currency?: string): SupportedCurrency {
    const selected = currency?.toUpperCase() as SupportedCurrency | undefined;
    if (
      selected &&
      Object.prototype.hasOwnProperty.call(PRICING_CURRENCY_CONFIG, selected)
    ) {
      return selected;
    }
    return DEFAULT_CURRENCY as SupportedCurrency;
  }

  async recordUsageEvent(params: {
    clinicId: string;
    type: UsageType;
    quantity?: number;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const {
      clinicId,
      type,
      quantity = 1,
      entityType,
      entityId,
      metadata,
    } = params;

    const eventKey = entityId
      ? `${clinicId}:${type}:${entityType}:${entityId}`
      : undefined;

    try {
      await this.prisma.usageEvent.create({
        data: {
          clinicId,
          type,
          quantity,
          entityType,
          entityId,
          eventKey,
          metadata: metadata || Prisma.JsonNull,
        },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        this.logger.debug(`Duplicate usage event ignored: ${eventKey}`);
        return;
      }
      throw error;
    }
  }

  async getCurrentUsage(clinicId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      select: {
        plan: true,
        includedAppointments: true,
        includedUsers: true,
        currency: true,
      },
    });

    const [
      consultations,
      whatsappMessages,
      activeUsers,
      maxUsersEvent,
      maxUsersRecord,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          clinicId,
          status: 'COMPLETED',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'WHATSAPP_MESSAGES',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
      this.prisma.user.count({
        where: { clinicId },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'USERS',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _max: { quantity: true },
      }),
      this.prisma.usageRecord.findFirst({
        where: {
          clinicId,
          type: UsageType.USERS,
          periodStart: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { quantity: 'desc' },
        select: { quantity: true },
      }),
    ]);

    const tierKey =
      (subscription?.plan as keyof typeof TIER_LIMITS) ?? 'STARTER';
    const resolvedCurrency = this.resolveCurrency(subscription?.currency);
    const tierLimits = TIER_LIMITS[tierKey];
    const includedConsultations =
      subscription?.includedAppointments ?? tierLimits.appointments ?? 0;
    const includedUsers = subscription?.includedUsers ?? tierLimits.users ?? 1;
    const tierRates =
      TIER_OVERAGE_RATES_BY_CURRENCY[resolvedCurrency][tierKey as TierName];
    const whatsappPlan =
      tierKey === 'ESSENTIAL' ||
      tierKey === 'PROFESSIONAL' ||
      tierKey === 'ENTERPRISE'
        ? getWhatsAppAddonPricingByCurrency(tierKey, resolvedCurrency)
        : null;
    const includedWhatsapp = whatsappPlan?.includedQuota ?? 0;
    const consultationOverage = Math.max(
      0,
      consultations - includedConsultations,
    );
    const whatsappCurrent = whatsappMessages._sum.quantity ?? 0;
    const whatsappOverage = Math.max(0, whatsappCurrent - includedWhatsapp);
    const peakUsersInCycle = Math.max(
      activeUsers,
      maxUsersEvent._max.quantity ?? 0,
      maxUsersRecord?.quantity ?? 0,
    );
    const usersOverage = Math.max(0, peakUsersInCycle - includedUsers);
    const rates = {
      consultations: tierRates.appointmentRate,
      users: tierRates.userRate,
      whatsappMessages: whatsappPlan?.overageRate ?? 0,
    };
    const breakdown = {
      consultations: {
        quantity: consultationOverage,
        rate: rates.consultations,
        charge: consultationOverage * rates.consultations,
      },
      users: {
        quantity: usersOverage,
        rate: rates.users,
        charge: usersOverage * rates.users,
      },
      whatsappMessages: {
        quantity: whatsappOverage,
        rate: rates.whatsappMessages,
        charge: whatsappOverage * rates.whatsappMessages,
      },
    };
    const total = Object.values(breakdown).reduce(
      (sum, item) => sum + item.charge,
      0,
    );
    const buildWarning = (current: number, included: number) => {
      if (included <= 0)
        return { percentUsed: 0, threshold: null as 80 | 100 | null };
      const percentUsed = (current / included) * 100;
      if (percentUsed >= 100) return { percentUsed, threshold: 100 as const };
      if (percentUsed >= 80) return { percentUsed, threshold: 80 as const };
      return { percentUsed, threshold: null as 80 | 100 | null };
    };
    const meters = {
      consultations: {
        current: consultations,
        included: includedConsultations,
        overage: consultationOverage,
      },
      users: {
        current: peakUsersInCycle,
        included: includedUsers,
        overage: usersOverage,
      },
      whatsappMessages: {
        current: whatsappCurrent,
        included: includedWhatsapp,
        overage: whatsappOverage,
      },
    };

    return {
      period: {
        start: periodStart,
        end: periodEnd,
      },
      usage: {
        consultations,
        users: peakUsersInCycle,
        whatsappMessages: whatsappCurrent,
      },
      included: {
        consultations: includedConsultations,
        users: includedUsers,
        whatsappMessages: includedWhatsapp,
      },
      overages: {
        consultations: consultationOverage,
        users: usersOverage,
        whatsappMessages: whatsappOverage,
      },
      rates,
      breakdown,
      total,
      meters,
      warnings: {
        consultations: buildWarning(consultations, includedConsultations),
        users: buildWarning(peakUsersInCycle, includedUsers),
        whatsappMessages: buildWarning(whatsappCurrent, includedWhatsapp),
      },
      tier: (subscription?.plan as ClinicTier) || ClinicTier.STARTER,
    };
  }

  async calculateOverageCharges(clinicId: string) {
    const usage = await this.getCurrentUsage(clinicId);
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      select: { currency: true },
    });

    return {
      period: usage.period,
      totalOverageCharges: usage.total,
      breakdown: usage.breakdown,
      currency: this.resolveCurrency(subscription?.currency),
    };
  }

  async trackWhatsAppMessage(
    clinicId: string,
    messageId: string,
    type: 'template' | 'session' | 'media' = 'template',
  ) {
    const weights = { template: 1, session: 0.5, media: 1.5 };
    const quantity = Math.ceil(weights[type]);

    await this.recordUsageEvent({
      clinicId,
      type: UsageType.WHATSAPP_MESSAGES,
      quantity,
      entityType: 'WhatsappLog',
      entityId: messageId,
      metadata: { messageType: type },
    });
  }

  async trackAICredits(
    clinicId: string,
    feature: keyof typeof import('@workspace/types').AI_CREDIT_COSTS,
    entityId?: string,
  ) {
    const { AI_CREDIT_COSTS } = await import('@workspace/types');
    const credits = AI_CREDIT_COSTS[feature] || 1;

    await this.recordUsageEvent({
      clinicId,
      type: 'AI_CREDITS',
      quantity: credits,
      entityType: 'AIUsage',
      entityId,
      metadata: { feature },
    });
  }

  async trackPatientActivity(clinicId: string, patientId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'ACTIVE_PATIENTS',
      quantity: 1,
      entityType: 'Patient',
      entityId: patientId,
    });
  }

  async trackAppointment(clinicId: string, appointmentId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'APPOINTMENTS',
      quantity: 1,
      entityType: 'Appointment',
      entityId: appointmentId,
    });
  }

  async trackPrescription(clinicId: string, prescriptionId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'PRESCRIPTION',
      quantity: 1,
      entityType: 'Prescription',
      entityId: prescriptionId,
    });
  }

  async trackInvoice(clinicId: string, invoiceId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'INVOICE',
      quantity: 1,
      entityType: 'Invoice',
      entityId: invoiceId,
    });
  }

  async trackOcrPage(clinicId: string, pageCount: number, documentId?: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'OCR_PAGE',
      quantity: pageCount,
      entityType: 'Document',
      entityId: documentId,
    });
  }

  async trackApiCall(clinicId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'API_CALL',
      quantity: 1,
      entityType: 'ApiRequest',
    });
  }

  @OnEvent('ocr.page.processed')
  async handleOcrPageProcessed(payload: {
    clinicId: string;
    pageCount: number;
  }) {
    await this.trackOcrPage(payload.clinicId, payload.pageCount).catch(
      (err) => {
        this.logger.error('Failed to track OCR page usage', err);
      },
    );
  }

  @OnEvent('whatsapp.message.sent')
  async handleWhatsAppMessageSent(payload: {
    clinicId: string;
    messageId: string;
    messageType?: 'template' | 'session' | 'media';
  }) {
    await this.trackWhatsAppMessage(
      payload.clinicId,
      payload.messageId,
      payload.messageType ?? 'template',
    ).catch((err) => {
      this.logger.error('Failed to track WhatsApp message usage', err);
    });
  }
}
