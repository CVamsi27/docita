"use client";

import { use } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ArrowLeft, FileText, History } from "lucide-react";
import Link from "next/link";
import { apiHooks } from "@/lib/api-hooks";
import { AppointmentHistoryTimeline } from "@/features/patients/components";
import { DetailedHistoryList } from "@/features/patients/components/history/DetailedHistoryList";

interface PatientHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientHistoryPage({
  params,
}: PatientHistoryPageProps) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const { data: patient, isLoading: patientLoading } =
    apiHooks.usePatient(patientId);
  const { data: appointmentsResponse, isLoading: appointmentsLoading } =
    apiHooks.usePatientAppointments(patientId);

  const appointments = appointmentsResponse?.items || [];

  const loading = patientLoading || appointmentsLoading;
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "";

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  if (loading) {
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

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detailed View
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Timeline View */}
        <TabsContent value="timeline">
          <AppointmentHistoryTimeline
            patientId={patientId}
            showFilters={true}
          />
        </TabsContent>

        {/* Detailed View */}
        <TabsContent value="detailed">
          <DetailedHistoryList appointments={sortedAppointments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
