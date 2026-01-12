import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageType } from '@workspace/db';

/**
 * Usage Tracking Service
 *
 * Tracks clinic usage for billing purposes:
 * - Active patients per billing period
 * - Appointments created
 * - WhatsApp messages sent
 * - AI credits consumed
 * - Storage used
 */
@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a usage event (real-time tracking)
   */
  async recordUsageEvent(params: {
    clinicId: string;
    type: UsageType;
    quantity?: number;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const {
      clinicId,
      type,
      quantity = 1,
      entityType,
      entityId,
      metadata,
    } = params;

    // Generate event key for deduplication
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
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (error: any) {
      // Ignore duplicate key errors (event already recorded)
      if (error.code === 'P2002') {
        this.logger.debug(`Duplicate usage event ignored: ${eventKey}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Get current period usage for a clinic
   */
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

    // Get subscription to know limits
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

    // Count active patients (any patient with activity this period)
    const activePatients = await this.prisma.patient.count({
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
    });

    // Count appointments this period
    const appointments = await this.prisma.appointment.count({
      where: {
        clinicId,
        startTime: { gte: periodStart, lte: periodEnd },
      },
    });

    // Count WhatsApp messages (from usage events)
    const whatsappMessages = await this.prisma.usageEvent.aggregate({
      where: {
        clinicId,
        type: 'WHATSAPP_MESSAGES',
        timestamp: { gte: periodStart, lte: periodEnd },
      },
      _sum: { quantity: true },
    });

    // Count AI credits used
    const aiCredits = await this.prisma.usageEvent.aggregate({
      where: {
        clinicId,
        type: 'AI_CREDITS',
        timestamp: { gte: periodStart, lte: periodEnd },
      },
      _sum: { quantity: true },
    });

    // Count users
    const users = await this.prisma.user.count({
      where: { clinicId },
    });

    // Get add-on subscriptions
    const addOns = await this.prisma.clinicAddOn.findMany({
      where: { clinicId, status: 'ACTIVE' },
      include: { addOn: true },
    });

    const whatsappAddOn = addOns.find((a) => a.addOnType === 'WHATSAPP');
    const intelligenceAddOn = addOns.find(
      (a) => a.addOnType === 'INTELLIGENCE',
    );

    return {
      period: {
        start: periodStart,
        end: periodEnd,
      },
      usage: {
        activePatients: {
          current: activePatients,
          included: subscription?.includedPatients || 50,
          overage: Math.max(
            0,
            activePatients - (subscription?.includedPatients || 50),
          ),
        },
        appointments: {
          current: appointments,
          included: subscription?.includedAppointments || 100,
          overage: Math.max(
            0,
            appointments - (subscription?.includedAppointments || 100),
          ),
        },
        users: {
          current: users,
          included: subscription?.includedUsers || 1,
          overage: Math.max(0, users - (subscription?.includedUsers || 1)),
        },
        whatsappMessages: {
          current: whatsappMessages._sum.quantity || 0,
          included: whatsappAddOn
            ? JSON.parse(whatsappAddOn.addOn.includedQuotaByTier as string)[
                subscription?.plan || 'CORE'
              ]
            : 0,
          overage: whatsappAddOn
            ? Math.max(
                0,
                (whatsappMessages._sum.quantity || 0) -
                  JSON.parse(whatsappAddOn.addOn.includedQuotaByTier as string)[
                    subscription?.plan || 'CORE'
                  ],
              )
            : 0,
          addOnActive: !!whatsappAddOn,
        },
        aiCredits: {
          current: aiCredits._sum.quantity || 0,
          included: intelligenceAddOn
            ? JSON.parse(intelligenceAddOn.addOn.includedQuotaByTier as string)[
                subscription?.plan || 'CORE'
              ]
            : 0,
          overage: intelligenceAddOn
            ? Math.max(
                0,
                (aiCredits._sum.quantity || 0) -
                  JSON.parse(
                    intelligenceAddOn.addOn.includedQuotaByTier as string,
                  )[subscription?.plan || 'CORE'],
              )
            : 0,
          addOnActive: !!intelligenceAddOn,
        },
      },
      tier: subscription?.plan || 'CAPTURE',
    };
  }

  /**
   * Calculate estimated overage charges for current period
   */
  async calculateOverageCharges(clinicId: string) {
    const usage = await this.getCurrentUsage(clinicId);

    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      select: { plan: true },
    });

    const tier = subscription?.plan || 'CAPTURE';

    // Get tier pricing
    const tierPricing = await this.prisma.tierPricing.findUnique({
      where: { tier },
    });

    // Get add-on pricing
    const addOns = await this.prisma.clinicAddOn.findMany({
      where: { clinicId, status: 'ACTIVE' },
      include: { addOn: true },
    });

    let totalOverageCharges = 0;
    const breakdown: Record<
      string,
      { quantity: number; rate: number; charge: number }
    > = {};

    // Base tier overages
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

    // WhatsApp overage
    const whatsappAddOn = addOns.find((a) => a.addOnType === 'WHATSAPP');
    if (whatsappAddOn && usage.usage.whatsappMessages.overage > 0) {
      const overageRate =
        JSON.parse(whatsappAddOn.addOn.overageRateByTier as string)[tier] / 100;
      const charge = usage.usage.whatsappMessages.overage * overageRate;
      breakdown.whatsappMessages = {
        quantity: usage.usage.whatsappMessages.overage,
        rate: overageRate,
        charge,
      };
      totalOverageCharges += charge;
    }

    // AI credits overage
    const intelligenceAddOn = addOns.find(
      (a) => a.addOnType === 'INTELLIGENCE',
    );
    if (intelligenceAddOn && usage.usage.aiCredits.overage > 0) {
      const overageRate =
        JSON.parse(intelligenceAddOn.addOn.overageRateByTier as string)[tier] /
        100;
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
      currency: 'INR',
    };
  }

  /**
   * Aggregate usage events into usage records at end of billing period
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateUsageRecords() {
    this.logger.log('Starting daily usage aggregation...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Get all clinics with active subscriptions
    const clinics = await this.prisma.clinic.findMany({
      where: {
        subscription: {
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
      },
      select: { id: true },
    });

    for (const clinic of clinics) {
      try {
        // Aggregate WhatsApp messages for yesterday
        const whatsappEvents = await this.prisma.usageEvent.aggregate({
          where: {
            clinicId: clinic.id,
            type: 'WHATSAPP_MESSAGES',
            timestamp: { gte: yesterday, lte: endOfYesterday },
          },
          _sum: { quantity: true },
        });

        if (whatsappEvents._sum.quantity && whatsappEvents._sum.quantity > 0) {
          // Get subscription and add-on info
          const subscription = await this.prisma.subscription.findUnique({
            where: { clinicId: clinic.id },
          });

          const whatsappAddOn = await this.prisma.clinicAddOn.findUnique({
            where: {
              clinicId_addOnType: {
                clinicId: clinic.id,
                addOnType: 'WHATSAPP',
              },
            },
            include: { addOn: true },
          });

          const includedQuota = whatsappAddOn
            ? JSON.parse(whatsappAddOn.addOn.includedQuotaByTier as string)[
                subscription?.plan || 'CORE'
              ]
            : 0;

          await this.prisma.usageRecord.upsert({
            where: {
              clinicId_type_periodStart: {
                clinicId: clinic.id,
                type: 'WHATSAPP_MESSAGES',
                periodStart: yesterday,
              },
            },
            update: {
              quantity: whatsappEvents._sum.quantity,
              overageUnits: Math.max(
                0,
                whatsappEvents._sum.quantity - includedQuota,
              ),
            },
            create: {
              clinicId: clinic.id,
              type: 'WHATSAPP_MESSAGES',
              periodStart: yesterday,
              periodEnd: endOfYesterday,
              quantity: whatsappEvents._sum.quantity,
              includedQuota,
              overageUnits: Math.max(
                0,
                whatsappEvents._sum.quantity - includedQuota,
              ),
            },
          });
        }

        // Aggregate AI credits for yesterday
        const aiEvents = await this.prisma.usageEvent.aggregate({
          where: {
            clinicId: clinic.id,
            type: 'AI_CREDITS',
            timestamp: { gte: yesterday, lte: endOfYesterday },
          },
          _sum: { quantity: true },
        });

        if (aiEvents._sum.quantity && aiEvents._sum.quantity > 0) {
          const subscription = await this.prisma.subscription.findUnique({
            where: { clinicId: clinic.id },
          });

          const intelligenceAddOn = await this.prisma.clinicAddOn.findUnique({
            where: {
              clinicId_addOnType: {
                clinicId: clinic.id,
                addOnType: 'INTELLIGENCE',
              },
            },
            include: { addOn: true },
          });

          const includedQuota = intelligenceAddOn
            ? JSON.parse(intelligenceAddOn.addOn.includedQuotaByTier as string)[
                subscription?.plan || 'CORE'
              ]
            : 0;

          await this.prisma.usageRecord.upsert({
            where: {
              clinicId_type_periodStart: {
                clinicId: clinic.id,
                type: 'AI_CREDITS',
                periodStart: yesterday,
              },
            },
            update: {
              quantity: aiEvents._sum.quantity,
              overageUnits: Math.max(0, aiEvents._sum.quantity - includedQuota),
            },
            create: {
              clinicId: clinic.id,
              type: 'AI_CREDITS',
              periodStart: yesterday,
              periodEnd: endOfYesterday,
              quantity: aiEvents._sum.quantity,
              includedQuota,
              overageUnits: Math.max(0, aiEvents._sum.quantity - includedQuota),
            },
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to aggregate usage for clinic ${clinic.id}:`,
          error,
        );
      }
    }

    this.logger.log('Daily usage aggregation complete');
  }

  /**
   * Track a WhatsApp message
   */
  async trackWhatsAppMessage(
    clinicId: string,
    messageId: string,
    type: 'template' | 'session' | 'media' = 'template',
  ) {
    // Weight based on message type
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

  /**
   * Track AI credit usage
   */
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

  /**
   * Track patient activity (for active patient counting)
   */
  async trackPatientActivity(clinicId: string, patientId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'ACTIVE_PATIENTS',
      quantity: 1,
      entityType: 'Patient',
      entityId: patientId,
    });
  }

  /**
   * Track appointment creation
   */
  async trackAppointment(clinicId: string, appointmentId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'APPOINTMENTS',
      quantity: 1,
      entityType: 'Appointment',
      entityId: appointmentId,
    });
  }
}
