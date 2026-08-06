/**
 * Pure helper that assembles the registration payload sent to the API.
 * Keeping this separate makes `use-clinic-registration-flow.ts` shorter
 * and the payload shape easier to test in isolation.
 */
import type {
  ClinicDetails,
  ClinicRegistrationData,
  ComplianceSettings,
} from "@/features/setup/components/onboarding/types";

interface AdminRole {
  name: string;
  email: string;
  role: "ADMIN" | "ADMIN_DOCTOR";
}

export function buildRegistrationPayload(
  formData: ClinicRegistrationData,
  details: ClinicDetails,
  admin: AdminRole,
  complianceData: ComplianceSettings,
) {
  return {
    clinicDetails: details,
    adminAccount: admin,
    planSelection: {
      tier: formData.planSelection.tier,
      billingCycle: formData.planSelection.billingCycle,
      currency: formData.planSelection.currency,
      planMode: formData.planSelection.planMode,
    },
    slaAgreement: {
      acceptedSLA: complianceData.acceptedSLA,
      acceptedPrivacyPolicy: complianceData.acceptedPrivacyPolicy,
      acceptedDataProcessingTerms: complianceData.acceptedDataProcessing,
      slaVersion: "1.0",
      acceptedBy: admin.name,
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
      skipPayment: formData.paymentDetails?.skipPayment,
    },
    staffSetup: { staffMembers: formData.teamMembers },
    clinicWeeklyHours:
      formData.clinicWeeklyHours.length === 7
        ? formData.clinicWeeklyHours
        : undefined,
  };
}

export function validateRegistrationRequirements(
  details: Partial<ClinicDetails>,
  ownerName: string | undefined,
  ownerEmail: string | undefined,
  complianceData: ComplianceSettings,
): { stepOneMissing: string[]; stepFourMissing: string[]; all: string[] } {
  const stepOneMissing: string[] = [];
  const stepFourMissing: string[] = [];
  const general: string[] = [];

  if (!details.name?.trim()) stepOneMissing.push("facility name");
  if (!details.phone?.trim()) stepOneMissing.push("facility phone");
  if (!details.address?.trim()) stepOneMissing.push("facility address");
  if (!details.type) stepOneMissing.push("facility type");
  if (!ownerName?.trim()) general.push("owner name");
  if (!ownerEmail?.trim()) general.push("owner email");
  if (!complianceData.slaSignatureSessionId?.trim())
    stepFourMissing.push("SLA signature upload");
  if (!complianceData.acceptedSLA)
    stepFourMissing.push("SLA agreement acceptance");
  if (!complianceData.acceptedPrivacyPolicy)
    stepFourMissing.push("privacy policy acceptance");
  if (!complianceData.acceptedDataProcessing)
    stepFourMissing.push("data processing agreement acceptance");

  return {
    stepOneMissing,
    stepFourMissing,
    all: [...general, ...stepOneMissing, ...stepFourMissing],
  };
}
