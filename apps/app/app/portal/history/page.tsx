"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { usePatientMedicalHistory, usePatientPortalDashboard } from "@/hooks/api/use-patient-portal";

function listToDisplay(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return "-";
}

export default function PatientMedicalHistoryPage() {
  const { data: dashboard, isLoading: isDashboardLoading } =
    usePatientPortalDashboard();

  const patientId =
    dashboard?.patient && typeof dashboard.patient.id === "string"
      ? dashboard.patient.id
      : undefined;

  const {
    data: medicalHistory,
    isLoading: isHistoryLoading,
    isError,
  } = usePatientMedicalHistory(patientId);

  if (isDashboardLoading || isHistoryLoading) {
    return <div>Loading medical history...</div>;
  }

  if (!patientId || isError || !medicalHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medical History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We could not load your medical history right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medical History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This view includes all records associated with your hospital profile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            {medicalHistory.conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conditions recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {medicalHistory.conditions.map((item, index) => (
                  <li key={`condition-${index}`} className="rounded-md border p-2">
                    <p className="font-medium">{listToDisplay(item.conditionName)}</p>
                    <p className="text-muted-foreground">
                      Status: {listToDisplay(item.status)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allergies</CardTitle>
          </CardHeader>
          <CardContent>
            {medicalHistory.allergies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No allergies recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {medicalHistory.allergies.map((item, index) => (
                  <li key={`allergy-${index}`} className="rounded-md border p-2">
                    <p className="font-medium">{listToDisplay(item.allergen)}</p>
                    <p className="text-muted-foreground">
                      Severity: {listToDisplay(item.severity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Family History</CardTitle>
          </CardHeader>
          <CardContent>
            {medicalHistory.familyHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No family history recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {medicalHistory.familyHistory.map((item, index) => (
                  <li key={`family-${index}`} className="rounded-md border p-2">
                    <p className="font-medium">{listToDisplay(item.condition)}</p>
                    <p className="text-muted-foreground">
                      Relationship: {listToDisplay(item.relationship)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Surgical History</CardTitle>
          </CardHeader>
          <CardContent>
            {medicalHistory.surgicalHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No surgeries recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {medicalHistory.surgicalHistory.map((item, index) => (
                  <li key={`surgery-${index}`} className="rounded-md border p-2">
                    <p className="font-medium">{listToDisplay(item.procedureName)}</p>
                    <p className="text-muted-foreground">
                      Date: {listToDisplay(item.procedureDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
