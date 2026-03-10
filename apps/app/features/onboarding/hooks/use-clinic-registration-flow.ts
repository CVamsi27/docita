"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useRazorpay, type RazorpayResponse } from "@/hooks/use-razorpay";
import { API_URL } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import {
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  type TeamMember,
} from "@/features/onboarding/components/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";

interface PlanPricing {
  monthly: number | "custom";
  yearly: number | "custom";
}

interface PlanSelectionOptions {
  isCoreTrial?: boolean;
}

interface OnboardingCheckoutResponse {
  orderId: string;
  amountCents: number;
  currency: string;
  razorpayKeyId: string;
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return token ? decodeURIComponent(token) : null;
}

function buildJsonHeaders(): Record<string, string> {
  const csrfToken = getCsrfToken();
  return {
    "Content-Type": "application/json",
    ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
  };
}

export function useClinicRegistrationFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { openCheckout } = useRazorpay();
  const [formData, setFormData] = useState<ClinicRegistrationData>(
    defaultClinicRegistrationData,
  );

  const ensureOnboardingId = useCallback(async (): Promise<string> => {
    if (onboardingId) {
      return onboardingId;
    }

    const initRes = await fetch(`${API_URL}/onboarding/initialize`, {
      method: "POST",
      credentials: "include",
      headers: buildJsonHeaders(),
      body: JSON.stringify({}),
    });

    if (!initRes.ok) {
      throw new Error("Unable to initialize onboarding session");
    }

    const initData = (await initRes.json()) as { onboardingId: string };
    setOnboardingId(initData.onboardingId);
    return initData.onboardingId;
  }, [onboardingId]);

  const uploadSlaSignature = useCallback(
    async (file: File): Promise<string> => {
      const currentOnboardingId = await ensureOnboardingId();

      const sessionRes = await fetch(
        `${API_URL}/onboarding/${currentOnboardingId}/sla-signature-session`,
        {
          method: "POST",
          credentials: "include",
          headers: buildJsonHeaders(),
          body: JSON.stringify({}),
        },
      );

      if (!sessionRes.ok) {
        throw new Error("Failed to create SLA signature upload session");
      }

      const sessionData = (await sessionRes.json()) as { id: string };

      const uploadData = new FormData();
      uploadData.append("file", file);
      const csrfToken = getCsrfToken();

      const uploadRes = await fetch(
        `${API_URL}/onboarding/${currentOnboardingId}/sla-signature-session/${sessionData.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
          },
          body: uploadData,
        },
      );

      if (!uploadRes.ok) {
        throw new Error("Failed to upload SLA signature");
      }

      return sessionData.id;
    },
    [ensureOnboardingId],
  );

  const setClinicDetails = useCallback((data: ClinicDetails) => {
    setFormData((prev) => ({ ...prev, clinicDetails: data }));
    setStep(2);
  }, []);

  const setPlanSelection = useCallback(
    async (
      tier: string,
      billingCycle: "MONTHLY" | "YEARLY",
      pricing: PlanPricing,
      options?: PlanSelectionOptions,
    ) => {
      const price =
        billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;

      const isCoreTrial =
        tier === "CORE" && options?.isCoreTrial === true;

      setFormData((prev) => ({
        ...prev,
        planSelection: {
          tier,
          billingCycle,
          price: typeof price === "number" ? price : 0,
          currency: DEFAULT_CURRENCY,
          isCoreTrial,
        },
      }));

      if (tier === "ENTERPRISE") {
        toast.info("Enterprise plans are handled by our sales team.");
        return;
      }

      if (tier === "CAPTURE" || isCoreTrial) {
        setFormData((prev) => ({
          ...prev,
          paymentDetails: {
            skipPayment: true,
            autoPay: true,
            addons: {
              intelligence: false,
            },
          },
        }));

        setStep(3);
        return;
      }

      if (!user?.email) {
        toast.error("Owner account details are required before payment");
        return;
      }

      try {
        setIsProcessingPayment(true);
        const currentOnboardingId = await ensureOnboardingId();
        const checkoutRes = await fetch(
          `${API_URL}/onboarding/${currentOnboardingId}/checkout`,
          {
            method: "POST",
            credentials: "include",
            headers: buildJsonHeaders(),
            body: JSON.stringify({
              tier,
              billingCycle,
              customerEmail: user.email,
              customerName: user.name,
              customerPhone: formData.clinicDetails.phone,
            }),
          },
        );

        const checkoutData =
          (await checkoutRes.json()) as OnboardingCheckoutResponse & {
            message?: string;
          };

        if (!checkoutRes.ok) {
          throw new Error(
            checkoutData.message || "Unable to initialize payment",
          );
        }

        await openCheckout({
          key: checkoutData.razorpayKeyId,
          amount: checkoutData.amountCents,
          currency: checkoutData.currency,
          name: "Docita Onboarding",
          description: `${tier} ${billingCycle} subscription`,
          order_id: checkoutData.orderId,
          handler: async (response: RazorpayResponse) => {
            setFormData((prev) => ({
              ...prev,
              paymentDetails: {
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                autoPay: true,
                skipPayment: false,
                addons: {
                  intelligence: false,
                },
              },
            }));
            setStep(3);
          },
          prefill: {
            name: user.name || "Clinic Owner",
            email: user.email,
            contact: formData.clinicDetails.phone || undefined,
          },
          theme: { color: "#0F172A" },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Payment failed";
        if (message === "Payment was cancelled") {
          toast.info(message);
        } else {
          toast.error(message);
        }
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [ensureOnboardingId, formData.clinicDetails, openCheckout, user],
  );

  const setTeamMembers = useCallback((members: TeamMember[]) => {
    setFormData((prev) => ({ ...prev, teamMembers: members }));
    setStep(4);
  }, []);

  const goBackFromCompliance = useCallback(() => {
    setStep(3);
  }, []);

  const submitRegistration = useCallback(
    async (complianceData: ComplianceSettings, onSuccess: () => void) => {
      const details = formData.clinicDetails as ClinicDetails;
      const ownerRole =
        user?.role === "ADMIN_DOCTOR" ? "ADMIN_DOCTOR" : "ADMIN";

      if (!details.name || !user?.email) {
        toast.error("Missing previous step data. Please go back.");
        return;
      }

      try {
        const payload = {
          clinicDetails: details,
          adminAccount: {
            name: user.name,
            email: user.email,
            role: ownerRole,
          },
          planSelection: {
            tier: formData.planSelection.tier,
            billingCycle: formData.planSelection.billingCycle,
          },
          slaAgreement: {
            acceptedSLA: complianceData.acceptedSLA,
            acceptedPrivacyPolicy: complianceData.acceptedPrivacyPolicy,
            acceptedDataProcessingTerms: complianceData.acceptedDataProcessing,
            slaVersion: "1.0",
            acceptedBy: user.name,
            signatureSessionId: complianceData.slaSignatureSessionId,
            ipAddress: "client-ip",
            userAgent: navigator.userAgent,
          },
          consentManagement: {
            enableWhatsAppCommunication: complianceData.enableWhatsApp,
            enableMarketingCommunications: false,
            patientConsentRequiredBeforeWhatsApp: complianceData.requireConsent,
            logAllConsentChanges: true,
            dataProcessingPurposes: ["TREATMENT", "BILLING"],
          },
          paymentDetails: {
            cardLast4:
              formData.paymentDetails?.cardLast4 ||
              formData.paymentDetails?.cardNumber,
            razorpayPaymentId: formData.paymentDetails?.razorpayPaymentId,
            razorpayOrderId: formData.paymentDetails?.razorpayOrderId,
            razorpaySignature: formData.paymentDetails?.razorpaySignature,
            autoPay: formData.paymentDetails?.autoPay,
            addons: formData.paymentDetails?.addons,
            skipPayment: formData.paymentDetails?.skipPayment,
          },
          teamMembers: formData.teamMembers,
        };

        const currentOnboardingId = await ensureOnboardingId();

        const res = await fetch(
          `${API_URL}/onboarding/${currentOnboardingId}/complete`,
          {
            method: "POST",
            credentials: "include",
            headers: buildJsonHeaders(),
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Registration failed");
        }

        const responseData = await res.json();

        if (responseData.access_token && responseData.user) {
          localStorage.setItem("docita_token", responseData.access_token);
          localStorage.setItem(
            "docita_user",
            JSON.stringify(responseData.user),
          );
        }

        toast.success("Registration Successful", {
          description: "Your clinic has been registered. Redirecting...",
        });

        onSuccess();
      } catch (error) {
        toast.error("Registration Failed", {
          description: (error as Error).message,
        });
      }
    },
    [ensureOnboardingId, formData, user],
  );

  return {
    step,
    setStep,
    formData,
    setClinicDetails,
    setPlanSelection,
    isProcessingPayment,
    setTeamMembers,
    goBackFromCompliance,
    submitRegistration,
    uploadSlaSignature,
  };
}
