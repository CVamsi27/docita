"use client";

import { use } from "react";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePatient } from "@/hooks/api/use-patients";
import { UnifiedTimelineContainer } from "@/features/patients/components/timeline/UnifiedTimelineContainer";

interface PatientHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientHistoryPage({
  params,
}: PatientHistoryPageProps) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const { data: patient, isLoading } = usePatient(patientId);
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "";

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/patients/${patientId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patient
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Medical History</h1>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
      </div>

      <UnifiedTimelineContainer patientId={patientId} />
    </div>
  );
}
