"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  type AdminAccount,
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  defaultClinicRegistrationData,
  type PaymentDetails,
  type TeamMember,
} from "@/features/onboarding/components/types";

interface PlanPricing {
  monthly: number | "custom";
  yearly: number | "custom";
}

export function useClinicRegistrationFlow() {
  const [step, setStep] = useState(1);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [formData, setFormData] = useState<ClinicRegistrationData>(
    defaultClinicRegistrationData,
  );

  const setClinicDetails = useCallback((data: ClinicDetails) => {
    setFormData((prev) => ({ ...prev, clinicDetails: data }));
    setStep(2);
  }, []);

  const setAdminAccount = useCallback((data: AdminAccount) => {
    setFormData((prev) => ({ ...prev, adminAccount: data }));
    setStep(3);
  }, []);

  const setPlanSelection = useCallback(
    (
      tier: string,
      billingCycle: "MONTHLY" | "YEARLY",
      pricing: PlanPricing,
    ) => {
      const price =
        billingCycle === "YEARLY" ? pricing.yearly : pricing.monthly;

      setFormData((prev) => ({
        ...prev,
        planSelection: {
          tier,
          billingCycle,
          price: typeof price === "number" ? price : 0,
          currency: "₹",
        },
      }));

      setStep(4);
    },
    [],
  );

  const setPaymentDetails = useCallback((paymentDetails: PaymentDetails) => {
    setFormData((prev) => ({ ...prev, paymentDetails }));
    setStep(5);
  }, []);

  const setTeamMembers = useCallback((members: TeamMember[]) => {
    setFormData((prev) => ({ ...prev, teamMembers: members }));
    setStep(6);
  }, []);

  const goBackFromCompliance = useCallback(() => {
    setStep(5);
  }, []);

  const submitRegistration = useCallback(
    async (complianceData: ComplianceSettings, onSuccess: () => void) => {
      const details = formData.clinicDetails as ClinicDetails;
      const admin = formData.adminAccount as AdminAccount;

      if (!details.name || !admin.email) {
        toast.error("Missing previous step data. Please go back.");
        return;
      }

      try {
        const payload = {
          clinicDetails: details,
          adminAccount: admin,
          planSelection: {
            tier: formData.planSelection.tier,
            billingCycle: formData.planSelection.billingCycle,
          },
          slaAgreement: {
            acceptedSLA: complianceData.acceptedSLA,
            acceptedPrivacyPolicy: complianceData.acceptedPrivacyPolicy,
            acceptedDataProcessingTerms: complianceData.acceptedDataProcessing,
            slaVersion: "1.0",
            acceptedBy: admin.name,
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
            cardLast4: formData.paymentDetails?.cardNumber,
            autoPay: formData.paymentDetails?.autoPay,
            addons: formData.paymentDetails?.addons,
            skipPayment: false,
          },
          teamMembers: formData.teamMembers,
        };

        const initRes = await fetch("/api/onboarding/initialize", {
          method: "POST",
        });
        const { onboardingId } = await initRes.json();

        const res = await fetch(`/api/onboarding/${onboardingId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

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
    [formData],
  );

  return {
    step,
    setStep,
    showConsentModal,
    setShowConsentModal,
    formData,
    setClinicDetails,
    setAdminAccount,
    setPlanSelection,
    setPaymentDetails,
    setTeamMembers,
    goBackFromCompliance,
    submitRegistration,
  };
}
