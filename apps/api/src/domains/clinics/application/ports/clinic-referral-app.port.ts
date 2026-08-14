import type {
  ApplyReferralCodeResult,
  ClinicReferralStatus,
} from '@workspace/types';

/**
 * Outbound port for the clinic-side referral surface. The clinics
 * domain owns this contract; an adapter in `infrastructure/adapters`
 * implements it by delegating to `ReferralService` in the
 * subscriptions domain. This keeps the controller free of
 * cross-domain imports while letting the real implementation live
 * where the rules + persistence do.
 */
export interface IClinicReferralAppService {
  getClinicReferralStatus(clinicId: string): Promise<ClinicReferralStatus>;
  applyReferralCodeAtSettings(
    clinicId: string,
    code: string,
  ): Promise<ApplyReferralCodeResult>;
}

export const CLINIC_REFERRAL_APP_SERVICE = 'IClinicReferralAppService';
