import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageType, ClinicTier, Prisma } from '@workspace/db';
import { DEFAULT_CURRENCY } from '@workspace/utils';
import { TIER_LIMITS } from '@workspace/types';

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private prisma: PrismaService) {}

  private parseTierRates(value: unknown): Record<string, number> {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.fromEntries(
            Object.entries(parsed).map(([key, entry]) => [
              key,
              typeof entry === 'number' ? entry : 0,
            ]),
          );
        }
      } catch {
        return {};
      }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          typeof entry === 'number' ? entry : 0,
        ]),
      );
    }

    return {};
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
        includedPatients: true,
        includedAppointments: true,
        includedStorageGB: true,
        includedUsers: true,
      },
    });

    const [
      activePatients,
      appointments,
      prescriptions,
      invoices,
      whatsappMessages,
      aiCredits,
      users,
      addOns,
    ] = await Promise.all([
      this.prisma.patient.count({
        where: {
          clinicId,
          OR: [
            { createdAt: { gte: periodStart } },
            { updatedAt: { gte: periodStart } },
            {
              appointments: {
                some: {
                  startTime: { gte: periodStart, lte: periodEnd },
                },
              },
            },
          ],
        },
      }),
      this.prisma.appointment.count({
        where: {
          clinicId,
          startTime: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'PRESCRIPTION',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'INVOICE',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'WHATSAPP_MESSAGES',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
      this.prisma.usageEvent.aggregate({
        where: {
          clinicId,
          type: 'AI_CREDITS',
          timestamp: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantity: true },
      }),
      this.prisma.user.count({
        where: { clinicId },
      }),
      this.prisma.clinicAddOn.findMany({
        where: { clinicId, status: 'ACTIVE' },
        include: { addOn: true },
      }),
    ]);

    const whatsappAddOn = addOns.find((a) => a.addOnType === 'WHATSAPP');
    const intelligenceAddOn = addOns.find(
      (a) => a.addOnType === 'INTELLIGENCE',
    );
    const tierKey = (subscription?.plan as keyof typeof TIER_LIMITS) || 'STARTER';
    const tierLimits = TIER_LIMITS[tierKey];

    const getQuota = (
      addOn:
        | Prisma.ClinicAddOnGetPayload<{ include: { addOn: true } }>
        | undefined,
      plan: string,
    ) => {
      if (!addOn?.addOn?.includedQuotaByTier) return 0;
      const quotaMap =
        (addOn.addOn.includedQuotaByTier as Record<string, number>) || {};
      return quotaMap[plan] || 0;
    };

    const whatsappQuota = getQuota(whatsappAddOn, subscription?.plan || 'CORE');
    const aiQuota = getQuota(intelligenceAddOn, subscription?.plan || 'CORE');
    const includedPatients = subscription?.includedPatients ?? 50;
    const includedAppointments = subscription?.includedAppointments ?? tierLimits.appointments ?? 0;
    const includedUsers = subscription?.includedUsers ?? 1;
    const includedPrescriptions = tierLimits.prescriptions ?? 0;
    const includedInvoices = tierLimits.invoices ?? 0;

    return {
      period: {
        start: periodStart,
        end: periodEnd,
      },
      usage: {
        activePatients: {
          current: activePatients,
          included: includedPatients,
          overage: Math.max(0, activePatients - includedPatients),
        },
        appointments: {
          current: appointments,
          included: includedAppointments,
          overage: Math.max(0, appointments - includedAppointments),
        },
        users: {
          current: users,
          included: includedUsers,
          overage: Math.max(0, users - includedUsers),
        },
        prescriptions: {
          current: prescriptions._sum.quantity || 0,
          included: includedPrescriptions,
          overage: Math.max(0, (prescriptions._sum.quantity || 0) - includedPrescriptions),
        },
        invoices: {
          current: invoices._sum.quantity || 0,
          included: includedInvoices,
          overage: Math.max(0, (invoices._sum.quantity || 0) - includedInvoices),
        },
        whatsappMessages: {
          current: whatsappMessages._sum.quantity || 0,
          included: whatsappQuota,
          overage: Math.max(
            0,
            (whatsappMessages._sum.quantity || 0) - whatsappQuota,
          ),
          addOnActive: !!whatsappAddOn,
        },
        aiCredits: {
          current: aiCredits._sum.quantity || 0,
          included: aiQuota,
          overage: Math.max(0, (aiCredits._sum.quantity || 0) - aiQuota),
          addOnActive: !!intelligenceAddOn,
        },
      },
      tier: (subscription?.plan as ClinicTier) || ClinicTier.STARTER,
    };
  }

  async calculateOverageCharges(clinicId: string) {
    const usage = await this.getCurrentUsage(clinicId);

    const tier = usage.tier;

    const [tierPricing, addOns] = await Promise.all([
      this.prisma.tierPricing.findUnique({ where: { tier } }),
      this.prisma.clinicAddOn.findMany({
        where: { clinicId, status: 'ACTIVE' },
        include: { addOn: true },
      }),
    ]);

    let totalOverageCharges = 0;
    const breakdown: Record<
      string,
      { quantity: number; rate: number; charge: number }
    > = {};

    if (tierPricing) {
      if (usage.usage.activePatients.overage > 0) {
        const charge =
          (usage.usage.activePatients.overage *
            tierPricing.overagePatientCents) /
          100;
        breakdown.activePatients = {
          quantity: usage.usage.activePatients.overage,
          rate: tierPricing.overagePatientCents / 100,
          charge,
        };
        totalOverageCharges += charge;
      }

      if (usage.usage.appointments.overage > 0) {
        const charge =
          (usage.usage.appointments.overage *
            tierPricing.overageAppointmentCents) /
          100;
        breakdown.appointments = {
          quantity: usage.usage.appointments.overage,
          rate: tierPricing.overageAppointmentCents / 100,
          charge,
        };
        totalOverageCharges += charge;
      }

      if (usage.usage.users.overage > 0) {
        const charge =
          (usage.usage.users.overage * tierPricing.overageUserCents) / 100;
        breakdown.users = {
          quantity: usage.usage.users.overage,
          rate: tierPricing.overageUserCents / 100,
          charge,
        };
        totalOverageCharges += charge;
      }
    }

    const whatsappAddOn = addOns.find((a) => a.addOnType === 'WHATSAPP');
    if (whatsappAddOn && usage.usage.whatsappMessages.overage > 0) {
      const whatsappRates = this.parseTierRates(
        whatsappAddOn.addOn.overageRateByTier,
      );
      const overageRate = (whatsappRates[tier] || 0) / 100;
      const charge = usage.usage.whatsappMessages.overage * overageRate;
      breakdown.whatsappMessages = {
        quantity: usage.usage.whatsappMessages.overage,
        rate: overageRate,
        charge,
      };
      totalOverageCharges += charge;
    }

    const intelligenceAddOn = addOns.find(
      (a) => a.addOnType === 'INTELLIGENCE',
    );
    if (intelligenceAddOn && usage.usage.aiCredits.overage > 0) {
      const intelligenceRates = this.parseTierRates(
        intelligenceAddOn.addOn.overageRateByTier,
      );
      const overageRate = (intelligenceRates[tier] || 0) / 100;
      const charge = usage.usage.aiCredits.overage * overageRate;
      breakdown.aiCredits = {
        quantity: usage.usage.aiCredits.overage,
        rate: overageRate,
        charge,
      };
      totalOverageCharges += charge;
    }

    return {
      period: usage.period,
      totalOverageCharges,
      breakdown,
      currency: DEFAULT_CURRENCY,
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
      type: 'WHATSAPP_MESSAGES',
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
}
