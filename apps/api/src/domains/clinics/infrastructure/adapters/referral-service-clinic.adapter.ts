import { Inject, Injectable } from '@nestjs/common';
import { ReferralService } from '@/domains/subscriptions/core/services/referral.service';
import type { IClinicReferralAppService } from '../../application/ports/clinic-referral-app.port';

/**
 * Clinic-side outbound adapter that delegates the clinic-referral
 * surface to `ReferralService` in the subscriptions domain. The
 * controller only sees the local `IClinicReferralAppService` port, so
 * no cross-domain import leaks into the presentation layer; the actual
 * cross-domain call is contained here in the adapter.
 */
@Injectable()
export class ReferralServiceClinicAdapter implements IClinicReferralAppService {
  constructor(
    @Inject(ReferralService)
    private readonly referralService: ReferralService,
  ) {}

  async getClinicReferralStatus(clinicId: string) {
    return this.referralService.getClinicReferralStatus(clinicId);
  }

  async applyReferralCodeAtSettings(clinicId: string, code: string) {
    return this.referralService.applyReferralCodeAtSettings(clinicId, code);
  }
}
