"use client";

// check-as-cast-density: allow-file
// This is a static legal/consent template containing user-facing prose (e.g.
// "such as WhatsApp", "as long as necessary"). The density scanner uses a
// simple regex that flags the English word "as" in JSX text as a type cast.
// There are no TypeScript type assertions in this file.

import {
  Card,
  CardContent,
  CardHeader,
  Separator
} from "@workspace/ui/components";
import {
  DocumentHeader,
  PatientInfoSection,
  DataCategoriesSection,
  DataUsageSection,
  ThirdPartySharingSection,
  DataRetentionSection,
  YourRightsSection,
  ConsentSection,
  SignatureSection,
  DocumentFooter,
  type ConsentDocumentClinicInfo,
} from "./consent-template-document-sections";

interface ConsentTemplateDocumentProps {
  clinic: ConsentDocumentClinicInfo | null | undefined;
  generatedOn?: Date;
}

export function ConsentTemplateDocument({
  clinic,
  generatedOn,
}: ConsentTemplateDocumentProps) {
  const issueDate = generatedOn ?? new Date();

  return (
    <Card className="border-0 shadow-none print:border-0 print:shadow-none">
      <CardHeader>
        <DocumentHeader clinic={clinic} issueDate={issueDate} />
      </CardHeader>

      <CardContent className="space-y-6 p-6 text-sm leading-6">
        <PatientInfoSection />

        <Separator />

        <DataCategoriesSection />

        <Separator />

        <DataUsageSection />

        <Separator />

        <ThirdPartySharingSection />

        <Separator />

        <DataRetentionSection />

        <Separator />

        <YourRightsSection />

        <Separator />

        <ConsentSection />

        <Separator />

        <SignatureSection />

        <DocumentFooter />
      </CardContent>
    </Card>
  );
}
