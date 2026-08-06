import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";
import { useTranslation } from "react-i18next";
import type { DoctorInfo } from "./prescription-document-types";

interface PrescriptionDocumentFooterProps {
  doctorInfo: DoctorInfo | undefined;
  doctorName: string;
}

export function PrescriptionDocumentFooter({ doctorInfo, doctorName }: PrescriptionDocumentFooterProps) {
  const { t } = useTranslation("Prescriptions");
  return (
    <>
      <div className="pt-8 mt-8 border-t">
        <div className="flex justify-end">
          <div className="text-center min-w-[200px]">
            {doctorInfo?.signatureUrl ? (
              <div className="mb-2">
                <img src={doctorInfo.signatureUrl} alt={t("documentFooter.signatureAlt")} className="h-[60px] w-auto mx-auto object-contain" />
              </div>
            ) : (
              <div className="h-[60px] border-b-2 border-muted-foreground/50 mb-2" />
            )}
            <p className="font-bold">{t("documentFooter.doctorPrefix", { name: doctorName })}</p>
            {doctorInfo?.qualification && (
              <p className="text-sm text-muted-foreground">{doctorInfo.qualification}</p>
            )}
            {doctorInfo?.registrationNumber && (
              <p className="text-sm font-medium">{t("documentFooter.regNumberLabel", { reg: doctorInfo.registrationNumber })}</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t text-center text-xs text-muted-foreground space-y-1">
        <p className="font-medium">{t("documentFooter.digitalGeneratedLabel")}</p>
        <p>{t("documentFooter.poweredByLabel")}</p>
        <p>{t("documentFooter.supportLabel", { email: SUPPORT_EMAIL })}</p>
        <p>{t("documentFooter.validityLabel")}</p>
      </div>
    </>
  );
}
