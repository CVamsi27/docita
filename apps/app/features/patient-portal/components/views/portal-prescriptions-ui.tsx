"use client";

import { FileText } from "lucide-react";
import { ListRow } from "@workspace/ui/components/data-display/list-row";
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
  return (
    <PortalCardSection
      pageTitle="Prescriptions"
      pageSubtitle="Access active and past prescriptions shared by your doctors."
      cardTitle="Prescription history"
      emptyIcon={FileText}
      emptyTitle="No prescriptions available"
      emptyDescription="Prescriptions will appear here after your consultation is completed"
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
