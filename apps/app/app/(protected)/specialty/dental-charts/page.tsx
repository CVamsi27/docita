"use client";

import { useState } from "react";
import { Smile, Search, Save, Loader2 } from "lucide-react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import { useClinic } from "@/lib/clinic-context";
import { usePatients } from "@/hooks/api/use-patients";
import {
  usePatientAppointments,
  useUpdateAppointment,
} from "@/hooks/api/use-appointments";
import {
  DentalChartUI,
  type DentalChartValue,
} from "@/features/consultation/components/specialty/DentalChartUI";
import type { Patient, UpdateAppointmentRequest } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export default function DentalChartsPage() {
  const { clinic } = useClinic();
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [chartData, setChartData] = useState<DentalChartValue>({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: patientsData, isLoading: patientsLoading } = usePatients(
    search.length >= 2 ? { search, limit: 10 } : null,
  );

  const { data: patientAppointments, isLoading: appointmentsLoading } =
    usePatientAppointments(selectedPatient?.id ?? "");

  const { mutate: updateAppointment, isPending: isSaving } =
    useUpdateAppointment(selectedAppointmentId ?? "");

  const appointments = patientAppointments?.items ?? [];

  const handleSelectAppointment = (appointmentId: string) => {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    setSelectedAppointmentId(appointmentId);
    setChartData(appointment.dentalChart ?? {});
    setIsDirty(false);
  };

  const handleChartChange = (value: DentalChartValue) => {
    setChartData(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!selectedAppointmentId) return;
    updateAppointment(
      { dentalChart: chartData } satisfies UpdateAppointmentRequest,
      {
        onSuccess: () => {
          toast.success("Dental chart saved");
          setIsDirty(false);
        },
        onError: (err) => {
          showUserFacingErrorToast(
            err,
            "We could not save this dental chart. Please try again.",
            "save",
          );
        },
      },
    );
  };

  if (clinic?.type && clinic.type !== "DENTAL") {
    return (
      <div className="mx-auto w-full max-w-2xl py-8 text-center space-y-4">
        <Smile className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl md:text-3xl font-semibold tracking-normal">Dental Charts</h1>
        <p className="text-muted-foreground">
          Dental charting is only available for dental facilities. Your facility is
          configured as <strong>{clinic.type}</strong>
        </p>
      </div>
    );
  }

  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70">
              <Smile className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-normal leading-tight">
                Dental Charts
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Interactive tooth charting and documentation
              </p>
            </div>
          </div>
          {selectedAppointmentId && (
            <Button
              data-testid="dental-chart-save-button"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Chart
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Patient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone"
                    data-testid="dental-chart-patient-search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedPatient(null);
                      setSelectedAppointmentId(null);
                    }}
                    className="pl-9"
                  />
                </div>

                {patientsLoading && search.length >= 2 && (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                )}

                {search.length >= 2 &&
                  !patientsLoading &&
                  (patientsData?.items ?? []).map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      data-testid="dental-chart-patient-result"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setSelectedAppointmentId(null);
                        setChartData({});
                        setSearch(
                          `${patient.firstName} ${patient.lastName}`.trim(),
                        );
                      }}
                      className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.phoneNumber}
                      </p>
                    </button>
                  ))}
              </CardContent>
            </Card>

            {selectedPatient && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Appointments</CardTitle>
                  <CardDescription className="text-xs">
                    Select an appointment to view or edit its dental chart
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {appointmentsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : appointments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No appointments found
                    </p>
                  ) : (
                    appointments.slice(0, 10).map((appt) => {
                      const hasChart = !!appt.dentalChart;
                      return (
                        <button
                          key={appt.id}
                          type="button"
                          data-testid="dental-chart-appointment"
                          onClick={() =>
                            appt.id && handleSelectAppointment(appt.id)
                          }
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                            selectedAppointmentId === appt.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium">
                              {new Date(appt.startTime).toLocaleDateString()}
                            </p>
                            {hasChart && (
                              <Badge variant="secondary" className="text-xs">
                                Has chart
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">
                            {appt.status}
                          </p>
                        </button>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedAppointmentId ? (
              <DentalChartUI value={chartData} onChange={handleChartChange} />
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center space-y-2 py-12">
                  <Smile className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient
                      ? "Select an appointment to view the dental chart"
                      : "Search for a patient to get started"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
