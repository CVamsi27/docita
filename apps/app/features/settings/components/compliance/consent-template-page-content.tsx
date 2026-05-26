"use client";

import { useCallback } from "react";
import { Printer } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { PrintSheet } from "@workspace/ui/components/print-sheet";
import { BackButton } from "@/components/navigation/back-button";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  ConsentTemplateDocument,
  type ConsentDocumentClinicInfo,
} from "./consent-template-document";

export function ConsentTemplatePageContent() {
  const { clinic } = useClinic();

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const clinicInfo: ConsentDocumentClinicInfo | null = clinic
    ? {
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        email: clinic.email,
        logo: clinic.logo ?? null,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackButton
          fallback="/settings/compliance"
          label="Back to compliance"
          variant="outline"
          size="sm"
        />
        <Button type="button" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Print consent form
        </Button>
      </div>

      <PrintSheet paperSize="a4" hidePrintButton>
        <ConsentTemplateDocument clinic={clinicInfo} />
      </PrintSheet>
    </div>
  );
}
