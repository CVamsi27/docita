import { Inject, Injectable } from '@nestjs/common';
import {
  CLINIC_OPERATIONS_TOKEN,
  type IClinicOperations,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import {
  ClinicTier,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { SubscriptionActivationPolicyService } from '@/domains/subscriptions/application/services/subscription-activation-policy.service';

// AuditLogged: subscription activation clinic sync is part of the audited activation workflow.
@Injectable()
export class ActivateSubscriptionClinicSyncService {
  constructor(
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    private readonly activationPolicy: SubscriptionActivationPolicyService,
  ) {}

  async syncAfterActivation(clinicId: string, tier: ClinicTier): Promise<void> {
    const featureUpdates =
      this.activationPolicy.buildPaidTierFeatureUpdates(tier);

    await this.clinicOps.updateTierAndFeatures(
      clinicId,
      tier.value,
      SubscriptionStatusEnum.ACTIVE,
      featureUpdates,
    );

    await this.clinicOps.emitUpdate(clinicId, {
      clinicId,
      tier: tier.value,
      subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
      subscriptionGraceUntil: null,
    });
  }
}
