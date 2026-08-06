import { formatDate } from "@workspace/utils";
import { useTranslation } from "react-i18next";
import { formatGenderLabel } from "@/lib/formatters";
import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";
import type { ClinicInfo, DoctorInfo } from "./prescription-document-types";

interface PrescriptionDocumentHeaderProps {
  clinicInfo: ClinicInfo | undefined;
  doctorInfo: DoctorInfo | undefined;
  doctorName: string;
  patientName: string;
  patientAge: number | null;
  gender?: string | null;
  createdAt: string | Date;
}

export function PrescriptionDocumentHeader({
  clinicInfo, doctorInfo, doctorName, patientName, patientAge, gender, createdAt,
}: PrescriptionDocumentHeaderProps) {
  const { t } = useTranslation("Prescriptions");
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-primary pb-6 gap-4">
        <div className="flex items-start gap-4 max-w-[70%]">
          {clinicInfo?.logo ? (
            <div className="items-start pt-1">
              <img src={clinicInfo.logo} alt={t("documentHeader.facilityLogoAlt")} className="h-20 w-20 object-contain rounded-lg" />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <h1 className="ui-page-title text-primary leading-[var(--lh-tight)]">
              {clinicInfo?.name ?? ""}
            </h1>
            {clinicInfo?.address && (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {clinicInfo.address}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
              {clinicInfo?.phone && (
                <span className="flex items-center gap-1">
                  <span className="opacity-70">{t("documentHeader.phoneLabel")}</span> {clinicInfo.phone}
                </span>
              )}
              {clinicInfo?.email && (
                <span className="flex items-center gap-1">
                  <span className="opacity-70">{t("documentHeader.emailLabel")}</span> {clinicInfo.email}
                </span>
              )}
              {!clinicInfo?.email && (
                <span className="flex items-center gap-1">
                  <span className="opacity-70">{t("documentHeader.supportLabel")}</span> {SUPPORT_EMAIL}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto mt-2 md:mt-0 bg-muted/20 p-3 rounded-lg md:bg-transparent md:p-0">
          <p className="font-bold text-lg text-primary">{t("documentHeader.doctorPrefix", { name: doctorName })}</p>
          {doctorInfo?.qualification && (
            <p className="text-sm text-muted-foreground font-medium">{doctorInfo.qualification}</p>
          )}
          {doctorInfo?.registrationNumber && (
            <p className="text-xs font-mono mt-1 text-primary/80">{t("documentHeader.regLabel", { reg: doctorInfo.registrationNumber })}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("documentHeader.patientNameLabel")}</p>
          <p className="font-semibold text-lg">{patientName}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {patientAge && <span>{t("documentHeader.ageLabel", { age: patientAge })}</span>}
            {gender && <span>{t("documentHeader.genderLabel", { gender: formatGenderLabel(gender) })}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("documentHeader.dateLabel")}</p>
          <p className="font-semibold">{formatDate(createdAt, "dd MMMM yyyy")}</p>
        </div>
      </div>
    </>
  );
}
