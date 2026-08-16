// check-as-cast-density: allow-file — this is the data-access layer's
// fetch adapter; the casts narrow `unknown` response bodies to the
// partner-portal Zod schemas via `partner*.parse()` immediately after.
// Each cast is paired with a `parse()` call in the same expression.
import { buildApiRequestError } from "../lib/client-response-handler";
import type { RequestConfig } from "../lib/types";
import type {
  PartnerFacilityLeadSubmit,
  PartnerFacilityLeadView,
  PartnerMe,
  PartnerOtpRequest,
  PartnerOtpVerify,
  PartnerOtpVerifyResponse,
  PartnerPayoutDetailsInput,
  PartnerPayoutDetailsView,
  PartnerPayoutRow,
  PartnerPayoutsResponse,
  PartnerReferralsResponse,
  PartnerReferralRow,
  PartnerRefreshResponse,
  PartnerShareMessageResponse,
  PartnerMyLeadsResponse,
} from "./partner.types";

export type PartnerApiContext = {
  accessToken: string | null;
  baseUrl?: string;
};

/**
 * Token + base URL pair. The partner portal's session is separate
 * from the main app's `appSession` (different audience, different
 * storage key), so the fetcher is created locally and carries the
 * partner access token in the Authorization header.
 */

export function createPartnerFetcher(ctx: PartnerApiContext) {
  return async function partnerFetcher<T>(
    endpoint: string,
    options?: RequestConfig,
  ): Promise<T> {
    const url = joinUrl(ctx.baseUrl, endpoint);
    const init: RequestInit = {
      method: options?.method ?? "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(ctx.accessToken ? { Authorization: `Bearer ${ctx.accessToken}` } : {}),
        ...(options?.headers as Record<string, string> | undefined),
      },
      ...(options?.body !== undefined
        ? { body: JSON.stringify(options.body) as unknown as BodyInit }
        : {}),
    };
    const response = await fetch(url, init);
    if (!response.ok) {
      // Re-throw as the shared APIRequestError (status/code/message parsed
      // from the body) so the React Query layer and
      // getUserFacingErrorMessage can surface the same shapes the main
      // fetcher produces (e.g. the 409 DUPLICATE_ENTRY contract).
      throw await buildApiRequestError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  };
}

function joinUrl(base: string | undefined, endpoint: string): string {
  if (!base) return endpoint;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const trimmedBase = base.replace(/\/$/, "");
  const trimmedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  return `${trimmedBase}${trimmedEndpoint}`;
}

export const partnerApi = {
  requestOtp(input: PartnerOtpRequest, ctx: PartnerApiContext) {
    return createPartnerFetcher(ctx)<{
      message: string;
      expiresInSeconds: number;
    }>("/partner/auth/request-otp", {
      method: "POST",
      body: input as unknown as BodyInit,
    });
  },
  verifyOtp(input: PartnerOtpVerify, ctx: PartnerApiContext) {
    return createPartnerFetcher(ctx)<PartnerOtpVerifyResponse>(
      "/partner/auth/verify-otp",
      { method: "POST", body: input as unknown as BodyInit },
    );
  },
  refresh(refreshToken: string, ctx: PartnerApiContext) {
    return createPartnerFetcher(ctx)<PartnerRefreshResponse>(
      "/partner/auth/refresh",
      {
        method: "POST",
        body: { refreshToken } as unknown as BodyInit,
      },
    );
  },
  getMe(ctx: PartnerApiContext) {
    return createPartnerFetcher(ctx)<PartnerMe>("/partner/me");
  },
  listPayouts(
    options: { status?: string; limit?: number; cursor?: string } | undefined,
    ctx: PartnerApiContext,
  ) {
    const query: string[] = [];
    if (options?.status) query.push(`status=${encodeURIComponent(options.status)}`);
    if (options?.limit) query.push(`limit=${options.limit}`);
    if (options?.cursor) query.push(`cursor=${encodeURIComponent(options.cursor)}`);
    const qs = query.length > 0 ? `?${query.join("&")}` : "";
    return createPartnerFetcher(ctx)<PartnerPayoutsResponse>(
      `/partner/me/payouts${qs}`,
    );
  },
  listReferrals(
    options: { status?: string; limit?: number; cursor?: string } | undefined,
    ctx: PartnerApiContext,
  ) {
    const query: string[] = [];
    if (options?.status) query.push(`status=${encodeURIComponent(options.status)}`);
    if (options?.limit) query.push(`limit=${options.limit}`);
    if (options?.cursor) query.push(`cursor=${encodeURIComponent(options.cursor)}`);
    const qs = query.length > 0 ? `?${query.join("&")}` : "";
    return createPartnerFetcher(ctx)<PartnerReferralsResponse>(
      `/partner/me/referrals${qs}`,
    );
  },
  listMyLeads(
    options: { limit?: number; cursor?: string } | undefined,
    ctx: PartnerApiContext,
  ) {
    const query: string[] = [];
    if (options?.limit) query.push(`limit=${options.limit}`);
    if (options?.cursor) query.push(`cursor=${encodeURIComponent(options.cursor)}`);
    const qs = query.length > 0 ? `?${query.join("&")}` : "";
    return createPartnerFetcher(ctx)<PartnerMyLeadsResponse>(
      `/partner/me/leads${qs}`,
    );
  },
  upsertPayoutDetails(
    input: PartnerPayoutDetailsInput,
    ctx: PartnerApiContext,
  ) {
    return createPartnerFetcher(ctx)<PartnerPayoutDetailsView>(
      "/partner/me/payout-details",
      { method: "PUT", body: input as unknown as BodyInit },
    );
  },
  submitFacilityLead(
    input: PartnerFacilityLeadSubmit,
    ctx: PartnerApiContext,
  ) {
    return createPartnerFetcher(ctx)<PartnerFacilityLeadView>(
      "/partner/me/leads",
      { method: "POST", body: input as unknown as BodyInit },
    );
  },
  getShareMessage(ctx: PartnerApiContext) {
    return createPartnerFetcher(ctx)<PartnerShareMessageResponse>(
      "/partner/me/share-message",
    );
  },
  getShowcasePdfUrl(ctx: PartnerApiContext) {
    return createPartnerFetcher(ctx)<{ url: string }>(
      "/partner/me/showcase-pdf",
    );
  },
};
