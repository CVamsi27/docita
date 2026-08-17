import { useCallback, useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import {
  type PartnerApiContext,
  usePartnerRefresh,
  usePartnerRequestOtp,
  usePartnerVerifyOtp,
} from "@workspace/data-access";
import { partnerSession } from "@/features/referral-partner/lib/partner-session";

const EXPIRY_BUFFER_MS = 30 * 1000;

function getApiBaseUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/api/v1`;
}

function buildContext(): PartnerApiContext {
  return { accessToken: partnerSession.getAccessToken(), baseUrl: getApiBaseUrl() };
}

/**
 * Two-step OTP auth: phone → OTP. On success, the server sets the
 * refresh token as an httpOnly cookie and the client stores only
 * the access token in localStorage. Refresh is handled by the browser
 * sending the cookie automatically on POST /partner/auth/refresh.
 */
export function usePartnerAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean>(() =>
    Boolean(partnerSession.getAccessToken()),
  );

  const requestOtp = usePartnerRequestOtp();
  const verifyOtp = usePartnerVerifyOtp();
  const refreshOtp = usePartnerRefresh();
  // Destructure the stable mutation fn so effects can depend on the binding
  // (exhaustive-deps tracks the object otherwise).
  const { mutateAsync: refreshPartnerToken } = refreshOtp;

  const request = async () => {
    setError(null);
    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    try {
      const result = await requestOtp.mutateAsync({ phone: phone.trim() });
      if (typeof result?.expiresInSeconds === "number") {
        // nothing for now — UI uses the default 10min hint
      }
      setStep("otp");
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not send your verification code. Try again.",
          context: "verification",
        }),
      );
    }
  };

  const verify = async () => {
    setError(null);
    if (!otp.trim()) {
      setError("Please enter the verification code");
      return;
    }
    try {
      const result = await verifyOtp.mutateAsync({
        phone: phone.trim(),
        otp: otp.trim(),
      });
      if (!result?.accessToken) {
        throw new Error("Sign-in could not be completed. Please try again.");
      }
      const expiresAt = Date.now() + result.expiresIn * 1000 - EXPIRY_BUFFER_MS;
      partnerSession.set({
        accessToken: result.accessToken,
        referrerId: result.referrer.id,
        name: result.referrer.name,
        code: result.referrer.code,
        type: result.referrer.type,
        expiresAt,
      });
      setSignedIn(true);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not verify your code. Try again.",
          context: "verification",
        }),
      );
    }
  };

  const signOut = () => {
    partnerSession.clear();
    setSignedIn(false);
    setStep("phone");
    setOtp("");
    setError(null);
  };

  /**
   * Refresh the access token via the httpOnly refresh cookie.
   * The browser sends the cookie automatically. Before the POST, we
   * bootstrap the CSRF double-submit: first request bootstraps the
   * XSRF-TOKEN cookie (via GET /health), then the token is echoed
   * back as the x-xsrf-token header on the refresh POST.
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!partnerSession.getAccessToken()) return false;
    try {
      // Bootstrap CSRF token if not present (GET /health sets XSRF-TOKEN).
      await partnerSession.bootstrapCsrfToken();
      const csrfToken = partnerSession.getCsrfToken();
      const result = await refreshPartnerToken(csrfToken ?? '');
      const expiresAt = Date.now() + result.expiresIn * 1000 - EXPIRY_BUFFER_MS;
      partnerSession.setAccessToken(result.accessToken, expiresAt);
      return true;
    } catch {
      partnerSession.clear();
      setSignedIn(false);
      return false;
    }
  }, [refreshPartnerToken]);

  return {
    phone,
    setPhone,
    otp,
    setOtp,
    step,
    setStep,
    error,
    isRequesting: requestOtp.isPending,
    isVerifying: verifyOtp.isPending,
    signedIn,
    request,
    verify,
    signOut,
    refresh,
    buildContext,
  };
}
