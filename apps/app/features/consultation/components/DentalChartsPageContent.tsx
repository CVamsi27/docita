"use client";

import { getPatientFullName } from "@workspace/utils";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useState } from "react";
import { Smile, Search, Save, X } from "lucide-react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { toast } from "sonner";
import { useClinic } from "@/lib/contexts/clinic-context";
import { formatDate } from "@/lib/formatters";
import { usePatients } from "@workspace/data-access";
import {
  usePatientAppointments,
  useUpdateAppointment,
} from "@workspace/data-access";
import {
  DentalChartUI,
  type DentalChartValue,
} from "@/features/consultation/components/specialty/DentalChartUI";
import type { Patient, UpdateAppointmentRequest } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

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
      <AppPageScaffold
        className="max-w-2xl"
        header={
          <PageHeader
            title="Dental Charts"
            description={
              <>
                Dental charting is only available for dental facilities. Your
                facility type is <strong>{clinic.type}</strong>.
              </>
            }
          />
        }
      >
        <Card className="ui-card-surface p-10 text-center">
          <Smile className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="ui-page-subtitle">
            Switch your facility type to Dental to unlock interactive charting.
          </p>
        </Card>
      </AppPageScaffold>
    );
  }

  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
      <AppPageScaffold
        className="max-w-5xl"
        header={
          <PageHeader
            title="Dental Charts"
            description="Interactive tooth charting and documentation."
            actions={
              selectedAppointmentId ? (
                <Button
                  data-testid="dental-chart-save-button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Chart
                </Button>
              ) : null
            }
          />
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Card className="ui-card-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Patient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    placeholder="Enter name or phone"
                    data-testid="dental-chart-patient-search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setSelectedPatient(null);
                      setSelectedAppointmentId(null);
                    }}
                    className={search.trim() ? "pl-9 pr-10" : "pl-9"}
                    aria-label="Search patients for dental chart"
                  />
                  {search.trim() ? (
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                      <SymbolTooltip label="Clear search">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setSearch("");
                            setSelectedPatient(null);
                            setSelectedAppointmentId(null);
                          }}
                          aria-label="Clear search"
                        >
                          <X
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden
                          />
                        </Button>
                      </SymbolTooltip>
                    </div>
                  ) : null}
                </div>

                {patientsLoading && search.length >= 2 && (
                  <div
                    className="space-y-2"
                    role="status"
                    aria-live="polite"
                    aria-label="Loading patient search"
                  >
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
                        setSearch(getPatientFullName(patient).trim());
                      }}
                      className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium">
                        {getPatientFullName(patient)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.phoneNumber}
                      </p>
                    </button>
                  ))}
              </CardContent>
            </Card>

            {selectedPatient && (
              <Card className="ui-card-surface">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Appointments</CardTitle>
                  <CardDescription className="text-xs">
                    Select an appointment to view or edit its dental chart
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {appointmentsLoading ? (
                    <div
                      className="space-y-2"
                      role="status"
                      aria-live="polite"
                      aria-label="Loading appointments"
                    >
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
                              {formatDate(appt.startTime)}
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
              <Card className="ui-card-surface h-full min-h-[400px] flex items-center justify-center">
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
      </AppPageScaffold>
    </FeatureGate>
  );
}
