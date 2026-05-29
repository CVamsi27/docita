"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import type { PatientPortalPrescription } from "@/features/patient-portal/types/patient-portal-types";
import { getPrescriptionStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";
import { formatDate } from "@/lib/formatters";

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
    <div className="space-y-4">
      {showHeader ? (
        <div>
          <h1 className="ui-page-title">Prescriptions</h1>
          <p className="ui-page-subtitle">
            Access active and past prescriptions shared by your doctors.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Prescription history</CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No prescriptions available"
              description="Prescriptions will appear here after your consultation is completed"
            />
          ) : (
            <div className="ui-card-surface overflow-hidden rounded-[var(--radius-md)] border border-border/70 pb-4">
              <ListRowGroup>
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
              </ListRowGroup>
            </div>
          )}
          <div className="flex justify-center pb-4 pt-4">
            <Button asChild variant="outline" className="touch-manipulation">
              <Link href={portalHomeHref}>Back to Portal Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
