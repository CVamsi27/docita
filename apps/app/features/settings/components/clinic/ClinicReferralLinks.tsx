"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { CopyableLinkField } from "@/components/signature/copyable-link-field";
import { getPublicAppOrigin } from "@/lib/constants/public-app-origin";

interface ClinicReferralLinksProps {
  facilityLabel: string;
  referralCode: string;
}

export function ClinicReferralLinks({
  facilityLabel,
  referralCode,
}: ClinicReferralLinksProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <MicroLabel as="h3">Staff workspace</MicroLabel>
        <p className="mt-2 text-sm font-medium text-foreground">
          Join code for Docita
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Doctors and staff enter this code in the Docita app to join this{" "}
          {facilityLabel.toLowerCase()}. Do not send this code to patients for
          appointments.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="text-sm font-mono font-semibold tracking-wider text-foreground">
            {referralCode}
          </code>
          <SymbolTooltip label="Copy staff join code">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCopyCode}
              aria-label="Copy staff join code"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </SymbolTooltip>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <MicroLabel as="h3">Patient booking</MicroLabel>
        <p className="mt-2 text-sm font-medium text-foreground">
          Public booking page
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Send this link to patients so they can request a visit without a
          Docita account. This is not the staff join code.
        </p>
        <div className="mt-3">
          <CopyableLinkField
            value={`${getPublicAppOrigin()}/book/${encodeURIComponent(referralCode)}`}
            helperText="Opens your clinic's online booking form."
          />
        </div>
      </div>
    </div>
  );
}
