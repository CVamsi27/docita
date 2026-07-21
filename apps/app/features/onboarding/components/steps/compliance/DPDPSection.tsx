"use client";

import type { UseFormReturn } from "react-hook-form";
import { ShieldCheck } from "lucide-react";
import {
  Checkbox,
  Label
} from "@workspace/ui/components";
import { OnboardingSection } from "@/features/onboarding/components/shared";
import type { ComplianceSettings } from "@/features/onboarding/components/types";

interface DPDPSectionProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
}

export function DPDPSection({ complianceForm }: DPDPSectionProps) {
  return (
    <OnboardingSection title="DPDP compliance settings" icon={<ShieldCheck />}>
      <div className="flex items-start space-x-2">
        <Checkbox
          id="requireConsent"
          checked={complianceForm.watch("requireConsent")}
          onCheckedChange={(checked) =>
            complianceForm.setValue("requireConsent", checked === true, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          className="mt-0.5"
        />
        <div>
          <Label htmlFor="requireConsent" className="text-sm">
            Require explicit patient consent for WhatsApp communications
            (mandatory under DPDP)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            WhatsApp integration is enabled by default. Patient consent is
            required before sending any messages per DPDP regulations.
          </p>
        </div>
      </div>
    </OnboardingSection>
  );
}
