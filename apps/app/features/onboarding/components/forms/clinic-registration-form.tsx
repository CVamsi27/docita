"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import "react-phone-number-input/style.css";
import { ConsentNoticeModal } from "../../../legal/components/ConsentNoticeModal";
import { useClinicRegistrationFlow } from "../../hooks/use-clinic-registration-flow";
import {
  AdminAccountStep,
  ClinicDetailsStep,
  ComplianceStep,
  PaymentStep,
  PlanSelectionStep,
  TeamInviteStep,
} from "../steps";
import {
  type AdminAccount,
  adminAccountSchema,
  type ClinicDetails,
  clinicDetailsSchema,
  complianceSchema,
  type ComplianceSettings,
  defaultComplianceValues,
  type PlanSelection,
} from "../types";

export function ClinicRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const {
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
  } = useClinicRegistrationFlow();

  // Step 1 Form
  const clinicForm = useForm<ClinicDetails>({
    resolver: zodResolver(clinicDetailsSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: formData.clinicDetails as ClinicDetails,
  });

  // Step 2 Form
  const adminForm = useForm<AdminAccount>({
    resolver: zodResolver(adminAccountSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: formData.adminAccount as AdminAccount,
  });

  // Step 6 Form (Compliance)
  const complianceForm = useForm<ComplianceSettings>({
    resolver: zodResolver(complianceSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    defaultValues: {
      ...defaultComplianceValues,
      ...formData.compliance,
    },
  });

  return (
    <div className="space-y-6">
      {/* Step Indicator can be added here */}

      {step === 1 && (
        <ClinicDetailsStep
          clinicForm={clinicForm}
          onSubmit={setClinicDetails}
        />
      )}

      {step === 2 && (
        <AdminAccountStep
          adminForm={adminForm}
          onBack={() => setStep(1)}
          onSubmit={setAdminAccount}
        />
      )}

      {step === 3 && (
        <PlanSelectionStep
          currency="₹"
          defaultTier={formData.planSelection.tier}
          defaultBillingCycle={formData.planSelection.billingCycle}
          onSelect={(tier, billingCycle, pricing) =>
            setPlanSelection(
              tier,
              billingCycle,
              pricing as PlanSelection["billingCycle"] extends
                | "MONTHLY"
                | "YEARLY"
                ? { monthly: number | "custom"; yearly: number | "custom" }
                : never,
            )
          }
        />
      )}

      {step === 4 && (
        <PaymentStep
          selectedPlanPrice={formData.planSelection.price}
          billingCycle={formData.planSelection.billingCycle}
          currencySymbol={formData.planSelection.currency}
          onBack={() => setStep(3)}
          onComplete={setPaymentDetails}
        />
      )}

      {step === 5 && (
        <TeamInviteStep onSkip={() => setStep(6)} onComplete={setTeamMembers} />
      )}

      {step === 6 && (
        <ComplianceStep
          complianceForm={complianceForm}
          onBack={goBackFromCompliance}
          onSubmit={complianceForm.handleSubmit((data: ComplianceSettings) =>
            submitRegistration(data, onSuccess),
          )}
          onOpenConsentModal={() => setShowConsentModal(true)}
        />
      )}

      {/* DPDP Consent Modal */}
      <ConsentNoticeModal
        open={showConsentModal}
        onOpenChange={(open) => {
          setShowConsentModal(open);
          if (!open && !complianceForm.getValues("acceptedPrivacyPolicy")) {
            // If closed without acceptance
          }
        }}
        userType="clinic"
        onConsent={(_) => {
          complianceForm.setValue("acceptedPrivacyPolicy", true, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          setShowConsentModal(false);
        }}
        onDecline={() => {
          complianceForm.setValue("acceptedPrivacyPolicy", false, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          setShowConsentModal(false);
        }}
      />
    </div>
  );
}
