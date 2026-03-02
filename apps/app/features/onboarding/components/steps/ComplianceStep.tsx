import { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import type { ComplianceSettings } from "@/features/onboarding/components/types";

interface ComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onBack: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onOpenConsentModal: () => void;
}

export function ComplianceStep({
  complianceForm,
  onBack,
  onSubmit,
  onOpenConsentModal,
}: ComplianceStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 6: Compliance & Legal</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="step6" onSubmit={onSubmit} noValidate className="space-y-6">
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-semibold">DPDP Compliance Settings</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireConsent"
                checked={complianceForm.watch("requireConsent")}
                onCheckedChange={(checked) =>
                  complianceForm.setValue(
                    "requireConsent",
                    checked as boolean,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              />
              <Label htmlFor="requireConsent">
                Require explicit patient consent for WhatsApp communications
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableWhatsApp"
                checked={complianceForm.watch("enableWhatsApp")}
                onCheckedChange={(checked) =>
                  complianceForm.setValue(
                    "enableWhatsApp",
                    checked as boolean,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              />
              <Label htmlFor="enableWhatsApp">
                Enable WhatsApp integration
              </Label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Legal Agreements</h3>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="sla"
                className={cn(
                  "mt-1",
                  complianceForm.formState.errors.acceptedSLA &&
                    "border-destructive focus-visible:ring-destructive/30",
                )}
                checked={complianceForm.watch("acceptedSLA")}
                onCheckedChange={(checked) =>
                  complianceForm.setValue("acceptedSLA", checked as boolean, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                aria-invalid={!!complianceForm.formState.errors.acceptedSLA}
                aria-describedby={
                  complianceForm.formState.errors.acceptedSLA
                    ? "accepted-sla-error"
                    : undefined
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="sla" className="text-sm font-normal">
                  I accept the{" "}
                  <a href="#" className="underline text-primary">
                    Service Level Agreement (SLA)
                  </a>
                </Label>
                {complianceForm.formState.errors.acceptedSLA && (
                  <p
                    id="accepted-sla-error"
                    className="text-sm text-destructive"
                  >
                    {complianceForm.formState.errors.acceptedSLA.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="privacy"
                className={cn(
                  "mt-1",
                  complianceForm.formState.errors.acceptedPrivacyPolicy &&
                    "border-destructive focus-visible:ring-destructive/30",
                )}
                checked={complianceForm.watch("acceptedPrivacyPolicy")}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onOpenConsentModal();
                  } else {
                    complianceForm.setValue("acceptedPrivacyPolicy", false, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }
                }}
                aria-invalid={
                  !!complianceForm.formState.errors.acceptedPrivacyPolicy
                }
                aria-describedby={
                  complianceForm.formState.errors.acceptedPrivacyPolicy
                    ? "accepted-privacy-error"
                    : undefined
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="privacy" className="text-sm font-normal">
                  I accept the{" "}
                  <a href="#" className="underline text-primary">
                    Privacy Policy & Data Consent
                  </a>
                </Label>
                {complianceForm.formState.errors.acceptedPrivacyPolicy && (
                  <p
                    id="accepted-privacy-error"
                    className="text-sm text-destructive"
                  >
                    {
                      complianceForm.formState.errors.acceptedPrivacyPolicy
                        .message
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="dpa"
                className={cn(
                  "mt-1",
                  complianceForm.formState.errors.acceptedDataProcessing &&
                    "border-destructive focus-visible:ring-destructive/30",
                )}
                checked={complianceForm.watch("acceptedDataProcessing")}
                onCheckedChange={(checked) =>
                  complianceForm.setValue(
                    "acceptedDataProcessing",
                    checked as boolean,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
                aria-invalid={
                  !!complianceForm.formState.errors.acceptedDataProcessing
                }
                aria-describedby={
                  complianceForm.formState.errors.acceptedDataProcessing
                    ? "accepted-dpa-error"
                    : undefined
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="dpa" className="text-sm font-normal">
                  I accept the{" "}
                  <a href="#" className="underline text-primary">
                    Data Processing Agreement (DPDP Compliant)
                  </a>
                </Label>
                {complianceForm.formState.errors.acceptedDataProcessing && (
                  <p
                    id="accepted-dpa-error"
                    className="text-sm text-destructive"
                  >
                    {
                      complianceForm.formState.errors.acceptedDataProcessing
                        .message
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          form="step6"
          type="submit"
          disabled={complianceForm.formState.isSubmitting}
        >
          {complianceForm.formState.isSubmitting
            ? "Creating Clinic..."
            : "Complete Registration"}
        </Button>
      </CardFooter>
    </Card>
  );
}
