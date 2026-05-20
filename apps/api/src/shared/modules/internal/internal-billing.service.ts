import { Injectable } from '@nestjs/common';
import { ClinicTier } from '@workspace/db';
import type { InternalAdditionalChargeCategory } from '@workspace/types';
import { InternalBillingMetricsService } from './internal-billing-metrics.service';
import { InternalSubscriptionQueryService } from './internal-subscription-query.service';
import { InternalSubscriptionAdminService } from './internal-subscription-admin.service';
import { InternalPricingAdminService } from './internal-pricing-admin.service';
import { InternalAdditionalChargeService } from './internal-additional-charge.service';

/**
 * Facade for internal billing operations. Delegates to focused services (SRP).
 */
@Injectable()
export class InternalBillingService {
  constructor(
    private readonly billingMetrics: InternalBillingMetricsService,
    private readonly subscriptionQuery: InternalSubscriptionQueryService,
    private readonly subscriptionAdmin: InternalSubscriptionAdminService,
    private readonly pricingAdmin: InternalPricingAdminService,
    private readonly additionalCharge: InternalAdditionalChargeService,
  ) {}

  getMetrics() {
    return this.billingMetrics.getMetrics();
  }

  getSubscriptions(
    filters: Parameters<InternalSubscriptionQueryService['getSubscriptions']>[0],
  ) {
    return this.subscriptionQuery.getSubscriptions(filters);
  }

  getExpiringSubscriptions(
    days?: Parameters<
      InternalSubscriptionQueryService['getExpiringSubscriptions']
    >[0],
  ) {
    return this.subscriptionQuery.getExpiringSubscriptions(days);
  }

  getPayments(
    filters: Parameters<InternalSubscriptionQueryService['getPayments']>[0],
  ) {
    return this.subscriptionQuery.getPayments(filters);
  }

  sendReminder(subscriptionId: string) {
    return this.subscriptionAdmin.sendReminder(subscriptionId);
  }

  extendGracePeriod(subscriptionId: string, days: number) {
    return this.subscriptionAdmin.extendGracePeriod(subscriptionId, days);
  }

  processPaymentAndUpdateTier(
    clinicId: string,
    data: Parameters<
      InternalSubscriptionAdminService['processPaymentAndUpdateTier']
    >[1],
  ) {
    return this.subscriptionAdmin.processPaymentAndUpdateTier(clinicId, data);
  }

  recordAdditionalCharge(
    clinicId: string,
    data: Parameters<
      InternalAdditionalChargeService['recordAdditionalCharge']
    >[1],
  ) {
    return this.additionalCharge.recordAdditionalCharge(clinicId, data);
  }

  getClinicTierInfo(clinicId: string) {
    return this.subscriptionAdmin.getClinicTierInfo(clinicId);
  }

  upgradeTier(clinicId: string, newTier: ClinicTier) {
    return this.subscriptionAdmin.upgradeTier(clinicId, newTier);
  }

  downgradeTier(clinicId: string, newTier: ClinicTier) {
    return this.subscriptionAdmin.downgradeTier(clinicId, newTier);
  }

  getTierPricingInfo() {
    return this.subscriptionAdmin.getTierPricingInfo();
  }

  getPricingTiers() {
    return this.pricingAdmin.getPricingTiers();
  }

  updatePricingTier(tierId: string, data: Record<string, unknown>) {
    return this.pricingAdmin.updatePricingTier(tierId, data);
  }

  getPricingOffers() {
    return this.pricingAdmin.getPricingOffers();
  }

  upsertPricingOffer(
    clinicId: string,
    data: Parameters<InternalPricingAdminService['upsertPricingOffer']>[1],
  ) {
    return this.pricingAdmin.upsertPricingOffer(clinicId, data);
  }

  deletePricingOffer(clinicId: string) {
    return this.pricingAdmin.deletePricingOffer(clinicId);
  }
}
