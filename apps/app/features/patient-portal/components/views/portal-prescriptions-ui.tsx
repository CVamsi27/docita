"use client";

import { FileText } from "lucide-react";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { useTranslations } from "next-intl";
import type { PatientPortalPrescription } from "@/features/patient-portal/types/patient-portal-types";
import { getPrescriptionStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";
import { formatDate } from "@/lib/formatters";
import { PortalCardSection } from "./portal-card-section";

interface PatientPortalPrescriptionsUIProps {
  prescriptions: PatientPortalPrescription[];
  portalHomeHref: string;
  showHeader?: boolean;
}

export function PatientPortalPrescriptionsUI({
  prescriptions,
  portalHomeHref,
  showHeader = true,
}: PatientPortalPrescriptionsUIProps) {
  const t = useTranslations("PatientPortal.prescriptions");
  return (
    <PortalCardSection
      pageTitle={t("pageTitle")}
      pageSubtitle={t("pageSubtitle")}
      cardTitle={t("cardTitle")}
      emptyIcon={FileText}
      emptyTitle={t("emptyTitle")}
      emptyDescription={t("emptyDescription")}
      isEmpty={prescriptions.length === 0}
      portalHomeHref={portalHomeHref}
      showHeader={showHeader}
    >
      {prescriptions.map((prescription) => (
        <ListRow
          key={prescription.id}
          title={prescription.title}
          meta={prescription.prescribedBy}
          time={formatDate(prescription.issuedAt)}
          status={prescription.status}
          statusLabel={getPrescriptionStatusLabel(prescription.status)}
          showChevron={false}
        />
      ))}
    </PortalCardSection>
  );
}
