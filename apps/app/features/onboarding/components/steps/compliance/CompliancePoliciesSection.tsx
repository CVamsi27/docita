"use client";

import type { UseFormReturn } from "react-hook-form";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Progress } from "@workspace/ui/components/feedback/progress";
import { ShieldCheck } from "lucide-react";
import {
  DataProcessingAgreementContent,
  PrivacyPolicyContent,
  SLAContent,
} from "@/features/legal";
import type { ComplianceSettings } from "@/features/onboarding/components/types";
import type { LegalDocumentType } from "./use-compliance-step";
import { ComplianceLegalCard } from "./compliance-legal-card";
import { ComplianceLegalDocumentDialog } from "./compliance-legal-document-dialog";

export interface LegalDocEntry {
  key: LegalDocumentType;
  title: string;
  summary: string;
  accepted: boolean;
  fieldKey: "acceptedSLA" | "acceptedPrivacyPolicy" | "acceptedDataProcessing";
}

interface CompliancePoliciesSectionProps {
  complianceForm: UseFormReturn<ComplianceSettings>;
  activeLegalDoc: LegalDocumentType | null;
  setActiveLegalDoc: (doc: LegalDocumentType | null) => void;
  legalDocs: LegalDocEntry[];
  acceptedCount: number;
}

export function CompliancePoliciesSection({
  complianceForm,
  activeLegalDoc,
  setActiveLegalDoc,
  legalDocs,
  acceptedCount,
}: CompliancePoliciesSectionProps) {
  const legalDocumentConfig = activeLegalDoc
    ? activeLegalDoc === "sla"
      ? {
          title: "Service Level Agreement",
          description: "Review the SLA terms before accepting",
          content: <SLAContent />,
        }
      : activeLegalDoc === "privacy"
        ? {
            title: "Privacy Policy & Data Consent",
            description: "Review privacy and consent terms before accepting",
            content: <PrivacyPolicyContent />,
          }
        : {
            title: "Data Processing Agreement",
            description: "Review data processing obligations before accepting",
            content: <DataProcessingAgreementContent />,
          }
    : null;

  return (
    <>
      <div className="space-y-4 rounded-lg border p-4 md:p-5 bg-card">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Legal Agreements</h3>
            </div>
            <Badge
              variant={
                acceptedCount === legalDocs.length ? "default" : "secondary"
              }
              className="h-6 px-2.5"
            >
              {acceptedCount}/{legalDocs.length} accepted
            </Badge>
          </div>
          <Progress
            value={(acceptedCount / legalDocs.length) * 100}
            className="h-1.5"
          />
          <p className="text-xs text-muted-foreground">
            Review each agreement and accept all documents to continue
            registration.
          </p>
        </div>
        <div className="space-y-3">
          {legalDocs.map((doc, index) => (
            <ComplianceLegalCard
              key={doc.key}
              index={index + 1}
              title={doc.title}
              summary={doc.summary}
              accepted={doc.accepted}
              error={complianceForm.formState.errors[doc.fieldKey]?.message}
              onOpenDocument={() => setActiveLegalDoc(doc.key)}
              onUnaccept={() =>
                complianceForm.setValue(doc.fieldKey, false, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
            />
          ))}
        </div>
      </div>

      {legalDocumentConfig ? (
        <ComplianceLegalDocumentDialog
          open={Boolean(activeLegalDoc)}
          onClose={() => setActiveLegalDoc(null)}
          title={legalDocumentConfig.title}
          description={legalDocumentConfig.description}
          content={legalDocumentConfig.content}
          onAgree={() => {
            if (activeLegalDoc === "sla") {
              complianceForm.setValue("acceptedSLA", true, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            } else if (activeLegalDoc === "privacy") {
              complianceForm.setValue("acceptedPrivacyPolicy", true, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            } else if (activeLegalDoc === "dpa") {
              complianceForm.setValue("acceptedDataProcessing", true, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }
            setActiveLegalDoc(null);
          }}
        />
      ) : null}
    </>
  );
}
