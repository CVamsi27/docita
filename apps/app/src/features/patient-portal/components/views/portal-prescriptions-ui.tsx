"use client";

import { FileText } from "lucide-react";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("PatientPortal");
  return (
    <PortalCardSection
      pageTitle={t("prescriptions.pageTitle")}
      pageSubtitle={t("prescriptions.pageSubtitle")}
      cardTitle={t("prescriptions.cardTitle")}
      emptyIcon={FileText}
      emptyTitle={t("prescriptions.emptyTitle")}
      emptyDescription={t("prescriptions.emptyDescription")}
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
