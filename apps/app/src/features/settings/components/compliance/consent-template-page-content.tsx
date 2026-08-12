import { useCallback } from "react";
import { Printer } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { BackButton } from "@/components/navigation/back-button";
import { ConsentTemplateDocument } from "./consent-template-document";
import type { ConsentDocumentClinicInfo } from "./consent-template-document-sections";

export function ConsentTemplatePageContent() {
  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const clinicInfo: ConsentDocumentClinicInfo | null = null;

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

      <div className="rounded-lg border bg-background p-4 sm:p-6">
        <ConsentTemplateDocument clinic={clinicInfo} />
      </div>
    </div>
  );
}
