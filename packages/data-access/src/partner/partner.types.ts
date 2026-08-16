import type {
  FacilityLeadSubmit,
  FacilityLeadView,
  PartnerMe,
  PartnerOtpRequest,
  PartnerOtpVerify,
  PartnerOtpVerifyResponse,
  PartnerPayoutRow,
  PartnerReferralRow,
  ReferrerPayoutDetailsInput,
  ReferrerPayoutDetailsView,
} from "@workspace/types";

// Partner-facing aliases. The wire types live under the `Referrer*`
// prefix in @workspace/types (to mirror the Referrer table) but the
// partner portal sees these as `Partner*` — they only ever come from
// the /partner/* endpoints, never from internal surfaces.
export type PartnerPayoutDetailsInput = ReferrerPayoutDetailsInput;
export type PartnerPayoutDetailsView = ReferrerPayoutDetailsView;
export type PartnerFacilityLeadSubmit = FacilityLeadSubmit;
export type PartnerFacilityLeadView = FacilityLeadView;

export type {
  PartnerMe,
  PartnerOtpRequest,
  PartnerOtpVerify,
  PartnerOtpVerifyResponse,
  PartnerPayoutRow,
  PartnerReferralRow,
};

export interface PartnerPayoutsResponse {
  items: PartnerPayoutRow[];
  nextCursor: string | null;
}

export interface PartnerReferralsResponse {
  items: PartnerReferralRow[];
  nextCursor: string | null;
}

export interface PartnerShareMessageResponse {
  message: string;
}

export interface PartnerRefreshResponse {
  accessToken: string;
  expiresIn: number;
}
