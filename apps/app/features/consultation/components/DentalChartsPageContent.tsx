"use client";

import { useState } from "react";
import { Smile, Save } from "lucide-react";
import { CLINIC_TYPE_LABELS, Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Card } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { toast } from "sonner";
import { useClinic } from "@/lib/contexts/clinic-context";
import { getPatientFullName } from "@workspace/utils";
import { usePatients } from "@workspace/data-access";
import {
  usePatientAppointments,
  useUpdateAppointment,
} from "@workspace/data-access";
import type { DentalChartValue } from "@/features/consultation/components/specialty/DentalChartUI";
import type { Patient, UpdateAppointmentRequest } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { PatientSearchSection } from "./PatientSearchSection";
import { AppointmentListSection } from "./AppointmentListSection";
import { DentalChartPanel } from "./DentalChartPanel";

// Widen to a string-keyed lookup so an arbitrary clinic.type string can index
// the labels without a cast (falls back to the raw type below).
const clinicTypeLabels: Record<string, string> = CLINIC_TYPE_LABELS;

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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setSelectedPatient(null);
    setSelectedAppointmentId(null);
  };

  const handleClearSearch = () => {
    setSearch("");
    setSelectedPatient(null);
    setSelectedAppointmentId(null);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSelectedAppointmentId(null);
    setChartData({});
    setSearch(getPatientFullName(patient).trim());
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
                facility type is{" "}
                <strong>
                  {clinicTypeLabels[clinic.type] ?? clinic.type}
                </strong>
                .
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
            <PatientSearchSection
              search={search}
              onSearchChange={handleSearchChange}
              onClearSearch={handleClearSearch}
              patientsLoading={patientsLoading}
              patientsData={patientsData}
              onSelectPatient={handleSelectPatient}
            />

            <AppointmentListSection
              selectedPatient={selectedPatient}
              appointmentsLoading={appointmentsLoading}
              appointments={appointments}
              selectedAppointmentId={selectedAppointmentId}
              onSelectAppointment={handleSelectAppointment}
            />
          </div>

          <div className="lg:col-span-2">
            <DentalChartPanel
              selectedAppointmentId={selectedAppointmentId}
              selectedPatient={selectedPatient}
              chartData={chartData}
              onChartChange={handleChartChange}
            />
          </div>
        </div>
      </AppPageScaffold>
    </FeatureGate>
  );
}
