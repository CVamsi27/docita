"use client";

import { FC } from "react";
import { ArrowLeft } from "lucide-react";
import {
  AppPageScaffold,
  Button,
  Form,
  PageHeader
} from "@workspace/ui/components";
import {
  useInsuranceClaimCreateLogic,
  type ClaimCreatePresets,
} from "@/features/insurance-claims/hooks/use-insurance-claim-create-logic";
import {
  PresetPatientCard,
  ClaimReadinessCard,
  ClaimFormFieldGrid,
  ClaimFormActions,
} from "./InsuranceClaimCreateUISections";
export const InsuranceClaimCreateUI: FC<{ presets?: ClaimCreatePresets }> = ({
  presets,
}) => {
  const {
    form,
    onSubmit,
    isSaving,
    router,
    patients,
    patientsLoading,
    presetPatient,
    claimReadiness,
    claimReadinessLoading,
    patientSearch,
    setPatientSearch,
  } = useInsuranceClaimCreateLogic(presets);
  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="New Insurance Claim"
          description="Record a pre-authorization or reimbursement claim for a patient."
          actions={
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
        />
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <PresetPatientCard presetPatient={presetPatient} />
          <ClaimReadinessCard
            invoiceId={presets?.invoiceId}
            claimReadinessLoading={claimReadinessLoading}
            claimReadiness={claimReadiness}
          />
          <ClaimFormFieldGrid
            control={form.control}
            presets={presets}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            patients={patients}
            patientsLoading={patientsLoading}
          />
          <ClaimFormActions
            isSaving={isSaving}
            claimReadinessLoading={claimReadinessLoading}
            onCancel={() => router.back()}
          />
        </form>
      </Form>
    </AppPageScaffold>
  );
};