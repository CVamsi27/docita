import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { ClinicPricingOffer } from '@/shared/modules/services/feature-flag.service';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { isRecord } from '@workspace/utils';
import { ApplicationEvents } from '@/shared/common/events/application-events';

const PRICING_OFFER_FLAG = 'clinic_pricing_offer';

@Injectable()
export class InternalPricingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  private parseOfferValue(
    value: Prisma.JsonValue | null,
  ): ClinicPricingOffer | null {
    if (!isRecord(value)) {
      return null;
    }

    const raw = value;
    const percentOff =
      typeof raw.percentOff === 'number' && Number.isFinite(raw.percentOff)
        ? raw.percentOff
        : 0;

    if (percentOff <= 0) return null;

    return {
      title: typeof raw.title === 'string' ? raw.title : '',
      description: typeof raw.description === 'string' ? raw.description : '',
      percentOff,
      validUntil:
        typeof raw.validUntil === 'string' ? raw.validUntil : undefined,
      durationMonths:
        typeof raw.durationMonths === 'number' ? raw.durationMonths : undefined,
      notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    };
  }

  async getPricingTiers() {
    return this.prisma.tierPricing.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  async updatePricingTier(tierId: string, data: Record<string, unknown>) {
    const allowed = [
      'monthlyBasePriceCents',
      'includedPatients',
      'includedAppointments',
      'includedStorageGB',
      'includedUsers',
      'overagePatientCents',
      'overageAppointmentCents',
      'overageStorageCents',
      'overageUserCents',
      'overagePrescriptionCents',
      'overageInvoiceCents',
      'overageOcrPageCents',
      'overageApiCallCents',
      'name',
      'description',
      'tagline',
      'isActive',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) update[key] = data[key];
    }
    const updated = await this.prisma.tierPricing.update({
      where: { id: tierId },
      data: update,
    });
    // Bust the in-process tier cache in PricingService so the change is
    // visible to the next request rather than waiting for the 5-min TTL.
    this.events.emit(ApplicationEvents.TIER_PRICING_UPDATED, { tierId });
    return updated;
  }

  async getPricingOffers() {
    const offers = await this.prisma.featureFlag.findMany({
      where: { key: PRICING_OFFER_FLAG, clinicId: { not: null } },
      include: {
        clinic: { select: { id: true, name: true, email: true, tier: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return offers
      .map((offer) => {
        const parsed = this.parseOfferValue(offer.value);
        if (!parsed) return null;

        if (!offer.clinicId) return null;

        return {
          id: offer.id,
          clinicId: offer.clinicId,
          clinic: offer.clinic,
          ...parsed,
          updatedAt: offer.updatedAt,
        };
      })
      .filter((offer): offer is NonNullable<typeof offer> => offer !== null);
  }

  async upsertPricingOffer(
    clinicId: string,
    data: {
      title: string;
      description?: string;
      percentOff: number;
      validUntil?: string;
      durationMonths?: number;
      notes?: string;
    },
  ) {
    const payload: ClinicPricingOffer = {
      title: data.title,
      description: data.description || '',
      percentOff: data.percentOff,
      validUntil: data.validUntil,
      durationMonths: data.durationMonths,
      notes: data.notes,
    };

    const existing = await this.prisma.featureFlag.findFirst({
      where: { key: PRICING_OFFER_FLAG, clinicId },
    });

    const persist = existing
      ? this.prisma.featureFlag.update({
          where: { id: existing.id },
          data: {
            value: toPrismaInputJsonValue(payload),
            description: 'Clinic pricing offer',
          },
        })
      : this.prisma.featureFlag.create({
          data: {
            key: PRICING_OFFER_FLAG,
            clinicId,
            value: toPrismaInputJsonValue(payload),
            description: 'Clinic pricing offer',
          },
        });

    const record = await persist;
    if (!record.clinicId)
      throw new InvariantViolationError(
        'Pricing offer feature flag must have a clinicId',
      );
    return {
      id: record.id,
      clinicId: record.clinicId,
      title: payload.title,
      description: payload.description,
      percentOff: payload.percentOff,
      durationMonths: payload.durationMonths,
      validUntil: payload.validUntil,
      notes: payload.notes,
      updatedAt: record.updatedAt,
    };
  }

  async deletePricingOffer(clinicId: string) {
    await this.prisma.featureFlag.deleteMany({
      where: { key: PRICING_OFFER_FLAG, clinicId },
    });

    return { success: true };
  }
}
