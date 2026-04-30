"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { EmptyState } from "@workspace/ui/components/empty-state";
import type { PatientPortalPrescription } from "@/features/patient-portal/types/patient-portal-types";
import { getPrescriptionStatusLabel } from "@/features/patient-portal/rules/patient-portal-rules";

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
          <h1 className="text-2xl font-semibold tracking-normal">Prescriptions</h1>
          <p className="text-sm text-muted-foreground">
            Access active and past prescriptions shared by your doctors.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Prescription History</CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No prescriptions available"
              description="Prescriptions will appear here after your consultation is completed"
            />
          ) : (
            <div className="space-y-3 pb-4">
              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{prescription.title}</div>
                    <Badge variant="secondary">
                      {getPrescriptionStatusLabel(prescription.status)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {prescription.prescribedBy} •{" "}
                    {new Date(prescription.issuedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center pb-4">
            <Button asChild variant="outline">
              <Link href={portalHomeHref}>Back to Portal Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
