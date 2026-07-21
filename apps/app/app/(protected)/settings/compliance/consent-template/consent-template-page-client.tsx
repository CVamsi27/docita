"use client";

import {
  AppPageScaffold,
  PageHeader
} from "@workspace/ui/components";
import { ConsentTemplatePageContent } from "@/features/settings/components/compliance/consent-template-page-content";

export function ConsentTemplatePageClient() {
  return (
    <AppPageScaffold
      className="max-w-4xl"
      header={
        <PageHeader
          title="Patient consent template"
          description="A printable consent form that lists every category of patient data this facility collects, the purpose, and the patient's rights under the DPDP Act, 2023."
        />
      }
    >
      <ConsentTemplatePageContent />
    </AppPageScaffold>
  );
}
