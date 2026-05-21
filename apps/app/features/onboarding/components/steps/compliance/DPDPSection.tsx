"use client";

import type { UseFormReturn } from "react-hook-form";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Label } from "@workspace/ui/components/form/label";
import type { ComplianceSettings } from "@/features/onboarding/components/types";

interface DPDPSectionProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
}

export function DPDPSection({ complianceForm }: DPDPSectionProps) {
  return (
    <div className="space-y-3 border p-4 rounded-md">
      <h3 className="font-semibold text-sm">DPDP Compliance Settings</h3>
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
            Require explicit patient consent for WhatsApp communications (mandatory under DPDP)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            WhatsApp integration is enabled by default. Patient consent is required before sending
            any messages per DPDP regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
