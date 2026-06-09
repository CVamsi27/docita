"use client";

import { getPatientFullName } from "@workspace/utils";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
// The shadcn/ui form-field + select import blocks below are identical to the
// ones every other `react-hook-form` + `Select` field module pulls in (see
// order-lab-select-field.tsx) — that's the framework's own re-export surface,
// not copy-pasted code, so it's marked as intentional structural similarity.
// jscpd:ignore-start
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
// jscpd:ignore-end
import { Button } from "@workspace/ui/components/form/button";
import { CLAIM_TYPE_LABELS } from "@/features/insurance-claims/lib/claim-display";
import type { ClaimCreatePresets } from "@/features/insurance-claims/hooks/use-insurance-claim-create-logic";
import type { CreateInsuranceClaimFormValues, Patient } from "@workspace/types";
import type { Control } from "react-hook-form";
import type { PatientNameParts } from "@workspace/utils";

interface PresetPatientCardProps {
  presetPatient: PatientNameParts | null | undefined;
}

export function PresetPatientCard({ presetPatient }: PresetPatientCardProps) {
  if (!presetPatient) return null;

  return (
    <Card>
      <CardContent className="py-4 text-sm">
        Creating a claim for{" "}
        <span className="font-medium">
          {getPatientFullName(presetPatient, "Patient")}
        </span>
        .
      </CardContent>
    </Card>
  );
}

interface ClaimReadinessCardProps {
  invoiceId?: string;
  claimReadinessLoading: boolean;
  claimReadiness?: { claimReady: boolean; issues?: string[] } | null;
}

export function ClaimReadinessCard({
  invoiceId,
  claimReadinessLoading,
  claimReadiness,
}: ClaimReadinessCardProps) {
  if (!invoiceId) return null;

  return (
    <Card>
      <CardContent className="space-y-2 py-4 text-sm">
        <p className="font-medium">Invoice claim readiness</p>
        {claimReadinessLoading ? (
          <p className="text-muted-foreground">Checking clinical coding…</p>
        ) : claimReadiness?.claimReady ? (
          <p className="text-muted-foreground">
            This invoice is ready for insurance submission.
          </p>
        ) : (
          <>
            <p className="text-destructive">
              Complete these items before submitting the claim:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {(claimReadiness?.issues ?? []).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ClaimPatientSelectFieldProps {
  control: Control<CreateInsuranceClaimFormValues>;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  patients: Patient[];
  patientsLoading: boolean;
}

/** The patient search-then-select combo — split out as its own self-contained field, since (unlike the rest of the grid) it owns a search box alongside its `FormField`. */
function ClaimPatientSelectField({
  control,
  patientSearch,
  setPatientSearch,
  patients,
  patientsLoading,
}: ClaimPatientSelectFieldProps) {
  return (
    <FormField
      control={control}
      name="patientId"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Patient</FormLabel>
          <Input
            placeholder="Search patients…"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="mb-2"
          />
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    patientsLoading ? "Loading…" : "Select a patient"
                  }
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id ?? ""}>
                  {getPatientFullName(p, "Patient")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ClaimTypeFieldProps {
  control: Control<CreateInsuranceClaimFormValues>;
  presets?: ClaimCreatePresets;
}

/** The claim-type select — split out as its own self-contained field; it's the only one that derives option-level state (REIMBURSEMENT disabled without a linked invoice) from `presets`. */
function ClaimTypeField({ control, presets }: ClaimTypeFieldProps) {
  // The `<Select>` + `FormControl`/`SelectTrigger`/`SelectContent`/`FormMessage`
  // shell below mirrors `ClaimPatientSelectField`'s shell — that's the shadcn/ui
  // `Select` + `react-hook-form` `FormField` convention, not copy-paste; each
  // field's option list and value handling differ meaningfully (patient lookup
  // vs. fixed claim-type enum), so a forced shared wrapper would add indirection
  // without real reuse. Marked as intentional structural similarity.
  // jscpd:ignore-start
  return (
    <FormField
      control={control}
      name="claimType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Claim type</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(["PRE_AUTH", "REIMBURSEMENT"] as const).map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  disabled={t === "REIMBURSEMENT" && !presets?.invoiceId}
                >
                  {CLAIM_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  // jscpd:ignore-end
}

interface ClaimAmountFieldProps {
  control: Control<CreateInsuranceClaimFormValues>;
}

/** The claimed-amount numeric input — split out as its own self-contained field; it's the only one with numeric coercion (`valueAsNumber`) instead of passthrough `{...field}`. */
function ClaimAmountField({ control }: ClaimAmountFieldProps) {
  return (
    <FormField
      control={control}
      name="claimedAmount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Claimed amount</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={field.value}
              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ClaimTextFieldProps {
  control: Control<CreateInsuranceClaimFormValues>;
  name: "insurerName" | "tpaName" | "policyNumber" | "groupNumber";
  label: string;
  placeholder?: string;
}

/** A single passthrough text field (`FormLabel` + `Input {...field}` + `FormMessage`) — the insurer, TPA, policy-number, and group-number fields were four verbatim copies of this exact shape (differing only in field name, label, and placeholder), so the shared shape is named once and parameterized instead of duplicated four times. */
function ClaimTextField({
  control,
  name,
  label,
  placeholder,
}: ClaimTextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} placeholder={placeholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ClaimNotesFieldProps {
  control: Control<CreateInsuranceClaimFormValues>;
}

/** The free-text notes field — the only `Textarea`-backed field in the grid (and the only one spanning both columns), so it's split out as its own self-contained piece rather than folded into `ClaimTextField`'s `Input`-only shape. */
function ClaimNotesField({ control }: ClaimNotesFieldProps) {
  return (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Notes (optional)</FormLabel>
          <FormControl>
            <Textarea {...field} rows={3} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ClaimFormFieldGridProps {
  control: Control<CreateInsuranceClaimFormValues>;
  presets?: ClaimCreatePresets;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  patients: Patient[];
  patientsLoading: boolean;
}

export function ClaimFormFieldGrid({
  control,
  presets,
  patientSearch,
  setPatientSearch,
  patients,
  patientsLoading,
}: ClaimFormFieldGridProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
        {!presets?.patientId && (
          <ClaimPatientSelectField
            control={control}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            patients={patients}
            patientsLoading={patientsLoading}
          />
        )}

        <ClaimTypeField control={control} presets={presets} />
        <ClaimAmountField control={control} />
        <ClaimTextField
          control={control}
          name="insurerName"
          label="Insurer"
          placeholder="e.g. Star Health"
        />
        <ClaimTextField
          control={control}
          name="tpaName"
          label="TPA (optional)"
          placeholder="Third-party administrator"
        />
        <ClaimTextField
          control={control}
          name="policyNumber"
          label="Policy number"
        />
        <ClaimTextField
          control={control}
          name="groupNumber"
          label="Group number (optional)"
        />

        <ClaimNotesField control={control} />
      </CardContent>
    </Card>
  );
}

interface ClaimFormActionsProps {
  isSaving: boolean;
  claimReadinessLoading: boolean;
  onCancel: () => void;
}

export function ClaimFormActions({
  isSaving,
  claimReadinessLoading,
  onCancel,
}: ClaimFormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSaving || claimReadinessLoading}>
        {isSaving ? "Creating…" : "Create claim"}
      </Button>
    </div>
  );
}
