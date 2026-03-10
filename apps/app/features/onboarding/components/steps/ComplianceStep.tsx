"use client";

import { UseFormReturn } from "react-hook-form";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
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
import {
  DataProcessingAgreementContent,
  PrivacyPolicyContent,
  SLAContent,
} from "@/features/legal";
import type { ComplianceSettings } from "@/features/onboarding/components/types";

type LegalDocumentType = "sla" | "privacy" | "dpa";

interface ComplianceStepProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  onBack: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onUploadSlaSignature: (file: File) => Promise<string>;
}

export function ComplianceStep({
  complianceForm,
  onBack,
  onSubmit,
  onUploadSlaSignature,
}: ComplianceStepProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureName, setSignatureName] = useState<string | null>(null);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentType | null>(
    null,
  );

  const openLegalDocument = (documentType: LegalDocumentType) => {
    setActiveLegalDoc(documentType);
  };

  const closeLegalDocument = () => {
    setActiveLegalDoc(null);
  };

  const agreeToActiveDocument = () => {
    if (activeLegalDoc === "sla") {
      complianceForm.setValue("acceptedSLA", true, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    if (activeLegalDoc === "privacy") {
      complianceForm.setValue("acceptedPrivacyPolicy", true, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    if (activeLegalDoc === "dpa") {
      complianceForm.setValue("acceptedDataProcessing", true, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    closeLegalDocument();
  };

  const legalDocumentConfig =
    activeLegalDoc === "sla"
      ? {
          title: "Service Level Agreement",
          description:
            "Review the SLA terms before accepting this agreement.",
          content: <SLAContent />,
        }
      : activeLegalDoc === "privacy"
        ? {
            title: "Privacy Policy and Data Consent",
            description:
              "Review privacy and consent terms before accepting this agreement.",
            content: <PrivacyPolicyContent />,
          }
        : activeLegalDoc === "dpa"
          ? {
              title: "Data Processing Agreement",
              description:
                "Review data processing obligations before accepting this agreement.",
              content: <DataProcessingAgreementContent />,
            }
          : null;

  const handleSlaSignaturePick = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSignatureUploading(true);
    try {
      const sessionId = await onUploadSlaSignature(file);
      complianceForm.setValue("slaSignatureSessionId", sessionId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setSignatureName(file.name);
    } catch {
      complianceForm.setValue("slaSignatureSessionId", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setSignatureName(null);
    } finally {
      setSignatureUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Compliance and Legal</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="step5" onSubmit={onSubmit} noValidate className="space-y-6">
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

            <div className="rounded-md border p-4 space-y-2 max-h-52 overflow-y-auto text-sm">
              <p className="font-medium">Official Service Level Agreement (SLA)</p>
              <p>
                This SLA governs service availability, support response targets,
                incident handling, data protection obligations, business
                continuity, audit logging, legal compliance, billing practices,
                and platform governance for the clinic.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Monthly uptime target and operational reliability commitments.</li>
                <li>Defined support and incident response timelines.</li>
                <li>Security, role-based access, and tenant data isolation controls.</li>
                <li>Privacy and data processing obligations under applicable law.</li>
                <li>Retention of legal acceptance records and signed proof artifacts.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">SLA Signature</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleSlaSignaturePick}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={signatureUploading}
              >
                {signatureUploading ? "Uploading signature..." : "Upload Signature"}
              </Button>
              {signatureName && (
                <p className="text-xs text-muted-foreground">
                  Uploaded: {signatureName}
                </p>
              )}
              {complianceForm.formState.errors.slaSignatureSessionId && (
                <p className="text-sm text-destructive">
                  {complianceForm.formState.errors.slaSignatureSessionId.message}
                </p>
              )}
            </div>

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
                  <button
                    type="button"
                    className="underline text-primary"
                    onClick={() => openLegalDocument("sla")}
                  >
                    Service Level Agreement (SLA)
                  </button>
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
                    openLegalDocument("privacy");
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
                  <button
                    type="button"
                    className="underline text-primary"
                    onClick={() => openLegalDocument("privacy")}
                  >
                    Privacy Policy & Data Consent
                  </button>
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
                  <button
                    type="button"
                    className="underline text-primary"
                    onClick={() => openLegalDocument("dpa")}
                  >
                    Data Processing Agreement (DPDP Compliant)
                  </button>
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
          form="step5"
          type="submit"
          disabled={complianceForm.formState.isSubmitting}
        >
          {complianceForm.formState.isSubmitting
            ? "Creating Clinic..."
            : "Complete Registration"}
        </Button>
      </CardFooter>

      <Dialog open={Boolean(activeLegalDoc)} onOpenChange={closeLegalDocument}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{legalDocumentConfig?.title}</DialogTitle>
            <DialogDescription>{legalDocumentConfig?.description}</DialogDescription>
          </DialogHeader>
          {legalDocumentConfig?.content}
          <DialogFooter>
            <Button variant="outline" onClick={closeLegalDocument}>
              Close
            </Button>
            <Button onClick={agreeToActiveDocument}>I Agree</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
