"use client";

import { usePatientPortalPrescriptions } from "@/hooks/api/use-patient-portal";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function PortalPrescriptionsPage() {
  const { data, isLoading } = usePatientPortalPrescriptions();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My Prescriptions</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              {data?.prescriptions.length || 0} prescriptions found
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
