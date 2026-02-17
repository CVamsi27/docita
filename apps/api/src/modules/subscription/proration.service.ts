/**
 * Proration Service
 *
 * Handles plan change proration calculations:
 * - Proration previews
 * - Plan upgrade/downgrade calculations
 * - Credit and charge calculations
 *
 * Single Responsibility: Proration calculations for plan changes
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClinicTier, BillingCycle } from '@workspace/db';
import {
  BillingCalculationService,
  ProrationPreview,
} from './billing-calculation.service';

@Injectable()
export class ProrationService {
  private readonly logger = new Logger(ProrationService.name);

  constructor(
    private prisma: PrismaService,
    private billingCalculation: BillingCalculationService,
  ) {}

  /**
   * Preview proration for a plan change
   */
  async previewProration(
    clinicId: string,
    newTier: ClinicTier,
    newCycle?: BillingCycle,
    addOns: string[] = [],
  ): Promise<ProrationPreview> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: { clinic: true },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const currentCycle = newCycle || subscription.billingCycle;
    const cycleDays = this.billingCalculation.getBillingCycleDays(currentCycle);

    const daysRemaining = this.billingCalculation.calculateDaysRemaining(
      subscription.currentPeriodEnd,
    );

    const currentPriceCents = subscription.basePriceCents;
    const newPriceCents = this.billingCalculation.getPriceCents(
      newTier,
      currentCycle,
      addOns,
    );

    const proration = this.billingCalculation.calculateProration(
      currentPriceCents,
      newPriceCents,
      cycleDays,
      daysRemaining,
    );

    return {
      currentPlan: subscription.plan,
      newPlan: newTier,
      currentPriceCents,
      newPriceCents,
      creditCents: proration.creditCents,
      chargeCents: proration.chargeCents,
      daysRemaining,
      effectiveDate: new Date(),
    };
  }

  /**
   * Preview upgrade/downgrade proration
   * Returns either proration details or new subscription price if no active subscription
   */
  async previewUpgrade(
    clinicId: string,
    newTier: ClinicTier,
    newCycle: BillingCycle,
    addOns: string[] = [],
  ): Promise<
    ProrationPreview | { isNewSubscription: boolean; priceCents: number }
  > {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
    });

    // If no active subscription, return new subscription price
    if (!subscription || subscription.status !== 'ACTIVE') {
      return {
        isNewSubscription: true,
        priceCents: this.billingCalculation.getPriceCents(
          newTier,
          newCycle,
          addOns,
        ),
      };
    }

    // Otherwise, return proration preview
    return this.previewProration(clinicId, newTier, newCycle, addOns);
  }

  /**
   * Calculate proration breakdown for detailed UI display
   */
  async getProrationBreakdown(
    clinicId: string,
    newTier: ClinicTier,
    newCycle: BillingCycle,
  ) {
    const preview = await this.previewProration(clinicId, newTier, newCycle);

    const isUpgrade = preview.newPriceCents > preview.currentPriceCents;
    const isDowngrade = preview.newPriceCents < preview.currentPriceCents;

    return {
      ...preview,
      isUpgrade,
      isDowngrade,
      breakdown: {
        currentPlanDaily: Math.round(
          preview.currentPriceCents / preview.daysRemaining || 30,
        ),
        newPlanDaily: Math.round(
          preview.newPriceCents / preview.daysRemaining || 30,
        ),
        creditsApplied: preview.creditCents,
        finalCharge: preview.chargeCents,
      },
    };
  }
}
