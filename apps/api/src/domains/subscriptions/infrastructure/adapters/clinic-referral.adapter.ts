import { Inject, Injectable } from '@nestjs/common';
import { ReferralService } from '../../core/services/referral.service';
import type { IClinicReferralAppService } from '@/domains/clinics/application/ports/clinic-referral-app.port';

/**
 * Subscriptions-side implementation of the `IClinicReferralAppService`
 * port owned by the clinics domain. The clinics controller binds the
 * port to this adapter in `ClinicsModule`; the cross-domain call
 * stays here, in the domain that owns the actual persistence +
 * business rules. This is the canonical anti-corruption-layer
 * direction: the providing domain implements a port the consuming
 * domain owns, so the consuming domain never imports a providing-
 * domain service.
 */
@Injectable()
export class ClinicReferralAdapter implements IClinicReferralAppService {
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
