import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";
import { useTranslations } from "next-intl";

interface DoctorInfo {
  name?: string;
  qualification?: string | null;
  registrationNumber?: string | null;
  signatureUrl?: string | null;
}

interface PrescriptionDocumentFooterProps {
  doctorInfo: DoctorInfo | undefined;
  doctorName: string;
}

/**
 * Phase 3 (per-feature): apps/app Prescriptions > Document footer.
 * 6 literals converted to useTranslations("Prescriptions.documentFooter").
 */
function useDocumentFooterTranslations() {
  return useTranslations("Prescriptions.documentFooter");
}

export function PrescriptionDocumentFooter({ doctorInfo, doctorName }: PrescriptionDocumentFooterProps) {
  const t = useDocumentFooterTranslations();
  return (
    <>
      <div className="pt-8 mt-8 border-t">
        <div className="flex justify-end">
          <div className="text-center min-w-[200px]">
            {doctorInfo?.signatureUrl ? (
              <div className="mb-2">
                <img src={doctorInfo.signatureUrl} alt={t("signatureAlt")} className="h-[60px] w-auto mx-auto object-contain" />
              </div>
            ) : (
              <div className="h-[60px] border-b-2 border-muted-foreground/50 mb-2" />
            )}
            <p className="font-bold">{t("doctorPrefix", { name: doctorName })}</p>
            {doctorInfo?.qualification && (
              <p className="text-sm text-muted-foreground">{doctorInfo.qualification}</p>
            )}
            {doctorInfo?.registrationNumber && (
              <p className="text-sm font-medium">{t("regNumberLabel", { reg: doctorInfo.registrationNumber })}</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
        <p className="font-medium">{t("digitalGeneratedLabel")}</p>
        <p>{t("poweredByLabel")}</p>
        <p>{t("supportLabel", { email: SUPPORT_EMAIL })}</p>
        <p>{t("validityLabel")}</p>
      </div>
    </>
  );
}
