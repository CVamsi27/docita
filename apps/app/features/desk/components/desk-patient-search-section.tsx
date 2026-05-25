"use client";

import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Section } from "@workspace/ui/components/layout/section";
import { Input } from "@workspace/ui/components/form/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

interface DeskPatientListItem {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}

export interface PatientSearchSectionProps {
  searchQuery: string;
  selectedPatientId: string | null;
  patients: DeskPatientListItem[];
  patientsState: "loading" | "error" | "empty" | "success";
  onSearchChange: (value: string) => void;
  onSelectPatient: (patientId: string) => void;
  onRetry: () => void;
}

export function PatientSearchSection({
  searchQuery,
  selectedPatientId,
  patients,
  patientsState,
  onSearchChange,
  onSelectPatient,
  onRetry,
}: PatientSearchSectionProps) {
  return (
    <Section
      title="Find patient"
      description="Search by name. Select a patient to see their open visit invoices."
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[var(--fs-sm)] font-medium">
            Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="search"
            placeholder="Enter patient name"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search patients"
          />
          <DataState
            status={patientsState}
            loadingMessage="Loading patients…"
            errorMessage="We could not load patients. Please try again."
            onRetry={onRetry}
          >
            <ul className="max-h-[min(420px,50vh)] divide-y overflow-y-auto rounded-md border border-border">
              {patients.map((p) => {
                const active = p.id === selectedPatientId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!p.id) return;
                        onSelectPatient(p.id);
                      }}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 ${
                        active ? "bg-muted/80" : ""
                      }`}
                    >
                      <span className="font-medium text-[var(--fs-sm)]">
                        {p.firstName} {p.lastName}
                      </span>
                      {p.phoneNumber ? (
                        <span className="text-[var(--fs-xs)] text-muted-foreground">
                          {p.phoneNumber}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </DataState>
        </CardContent>
      </Card>
    </Section>
  );
}
