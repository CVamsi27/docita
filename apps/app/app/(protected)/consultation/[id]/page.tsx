"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { ArrowLeft, User, PanelLeft } from "lucide-react";
import { ClinicalDocumentationDynamic } from "@/lib/dynamic-imports";
import { ConsultationSidebar } from "@/components/consultation/consultation-sidebar";
import { useState, useMemo, useCallback } from "react";
import { useSmartBack } from "@/hooks/use-smart-back";
import { useNavigationStore } from "@/lib/stores/navigation-store";
import { cn } from "@workspace/ui/lib/utils";
import { apiHooks } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/sheet";

// Map old tab names to new ones
const TAB_MAPPING: Record<string, string> = {
  observations: "chief-complaint",
  vitals: "vitals",
  prescription: "prescription",
  invoice: "invoice",
  diagnosis: "diagnosis",
};

export default function ConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = params.id as string;
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { canGoBack } = useNavigationStore();

  const { data: appointmentData, isLoading: loading } =
    apiHooks.useAppointment(appointmentId);

  // Fetch past appointments for consultation history
  const { data: patientAppointments = [] } = apiHooks.usePatientAppointments(
    appointmentData?.patientId || "",
  );

  // Filter past appointments (exclude current, only completed)
  const pastAppointments = useMemo(() => {
    return patientAppointments
      .filter((apt) => apt.id !== appointmentId && apt.status === "completed")
      .map((apt) => ({
        id: apt.id || "",
        date: apt.startTime,
        chiefComplaint: apt.chiefComplaint,
        finalDiagnosis: apt.finalDiagnosis,
        diagnoses: apt.diagnoses,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [patientAppointments, appointmentId]);

  // Compute fallback route based on 'from' query parameter
  const fromPage = searchParams.get("from");
  const fallbackRoute = useMemo(() => {
    if (fromPage === "patient" && appointmentData?.patientId) {
      return `/patients/${appointmentData.patientId}`;
    }
    if (fromPage === "patient") {
      return "/patients";
    }
    // Default to queue for 'from=queue' or when 'from' is not specified
    return "/queue";
  }, [fromPage, appointmentData?.patientId]);

  const goBack = useSmartBack(fallbackRoute);

  // Hybrid back navigation: use history if available, otherwise use computed fallback
  const handleBack = useCallback(() => {
    if (canGoBack()) {
      goBack();
    } else {
      // No history available, use the fallback route based on 'from' parameter
      router.push(fallbackRoute);
    }
  }, [canGoBack, goBack, router, fallbackRoute]);

  const handleSave = useCallback(() => {
    // Refetch appointment data after save
    queryClient.invalidateQueries({
      queryKey: ["appointments", appointmentId],
    });
  }, [queryClient, appointmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (!appointmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Appointment not found</p>
        <Button onClick={() => router.push("/appointments")}>
          Back to Appointments
        </Button>
      </div>
    );
  }

  const patientName = appointmentData.patient
    ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
    : "Patient";

  // Get default tab from query params and map to new tab names
  const rawTab = searchParams.get("tab") || "chief-complaint";
  const defaultTab = (TAB_MAPPING[rawTab] || rawTab) as
    | "chief-complaint"
    | "history"
    | "examination"
    | "diagnosis"
    | "treatment";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-4 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Mobile sidebar toggle */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <PanelLeft className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <ConsultationSidebar
                appointment={appointmentData}
                pastAppointments={pastAppointments}
              />
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary hidden sm:block" />
              {patientName}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Consultation -{" "}
              {new Date(appointmentData.startTime).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="hidden sm:flex"
          >
            Close
          </Button>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 overflow-hidden flex overflow-x-hidden">
        {/* Sidebar - Desktop only */}
        <aside
          className={cn(
            "hidden md:block border-r overflow-y-auto shrink-0 transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-none",
          )}
        >
          <ConsultationSidebar
            appointment={appointmentData}
            pastAppointments={pastAppointments}
          />
        </aside>

        {/* Clinical Documentation */}
        <div className="flex-1 overflow-hidden overflow-x-hidden flex flex-col">
          {/* Focus Mode Toggle (Floating if sidebar is closed, or in header) */}
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="absolute left-4 top-[72px] z-20 h-8 w-8 p-0 rounded-full border shadow-sm bg-background hidden md:flex items-center justify-center hover:bg-accent"
              title="Show Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          <ClinicalDocumentationDynamic
            appointmentId={appointmentId}
            patientId={appointmentData.patientId}
            doctorId={appointmentData.doctorId}
            defaultTab={defaultTab}
            onSave={handleSave}
            isFocusMode={!isSidebarOpen}
            onToggleFocus={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>
      </div>
    </div>
  );
}
