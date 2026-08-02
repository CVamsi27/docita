import { getPatientFullName } from "@workspace/utils";
import { Button, DataState, SearchInput } from "@workspace/ui/components";
import { X } from "lucide-react";

interface DeskPatientListItem {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
}

export interface DeskPatientSearchProps {
  searchQuery: string;
  selectedPatientId: string | null;
  patients: DeskPatientListItem[];
  patientsState: "loading" | "error" | "empty" | "success";
  onSearchChange: (value: string) => void;
  onSelectPatient: (patientId: string) => void;
  onClearPatient: () => void;
  onRetry: () => void;
  hasSearchQuery: boolean;
}

export function DeskPatientSearch({
  searchQuery,
  selectedPatientId,
  patients,
  patientsState,
  onSearchChange,
  onSelectPatient,
  onClearPatient,
  onRetry,
  hasSearchQuery,
}: DeskPatientSearchProps) {
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  return (
    <div className="space-y-3">
      {selectedPatientId && selectedPatient ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <span className="text-[var(--fs-xs)] text-muted-foreground">
              Selected patient
            </span>
            <p className="font-medium text-[var(--fs-sm)] truncate">
              {getPatientFullName(selectedPatient)}
            </p>
            {selectedPatient.phoneNumber ? (
              <p className="text-[var(--fs-xs)] text-muted-foreground">
                {selectedPatient.phoneNumber}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={onClearPatient}
          >
            <X className="h-3.5 w-3.5" />
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            placeholder="Search patient by name or phone"
            ariaLabel="Search patients"
          />

          {hasSearchQuery ? (
            <div className="rounded-md border border-border bg-popover shadow-md">
              <DataState
                status={patientsState}
                loadingMessage="Searching…"
                errorMessage="Search failed. Please try again."
                onRetry={onRetry}
                emptyTitle="No matching patients"
                emptyDescription="Try a different name or phone number."
              >
                <ul className="max-h-[280px] divide-y overflow-y-auto">
                  {patients.map((p) => (
                    <li key={p.id}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (!p.id) return;
                          onSelectPatient(p.id);
                        }}
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left h-auto justify-start hover:bg-muted/60"
                        aria-label={`Select ${getPatientFullName(p)}`}
                      >
                        <span className="font-medium text-[var(--fs-sm)]">
                          {getPatientFullName(p)}
                        </span>
                        {p.phoneNumber ? (
                          <span className="text-[var(--fs-xs)] text-muted-foreground">
                            {p.phoneNumber}
                          </span>
                        ) : null}
                      </Button>
                    </li>
                  ))}
                </ul>
              </DataState>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
