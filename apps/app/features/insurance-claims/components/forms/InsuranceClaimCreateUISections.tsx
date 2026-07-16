"use client";

import { getPatientFullName } from "@workspace/utils";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { useTranslations } from "next-intl";
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

/**
 * Phase 3 (per-feature): apps/app Insurance claims > Create form
 * sections. 6 literals converted to
 * useTranslations("InsuranceClaims.createFormSections").
 */
function useClaimFormTranslations() {
  return useTranslations("InsuranceClaims.createFormSections");
}

interface PresetPatientCardProps {
  presetPatient: PatientNameParts | null | undefined;
}

export function PresetPatientCard({ presetPatient }: PresetPatientCardProps) {
  const t = useClaimFormTranslations();
  if (!presetPatient) return null;

  return (
    <Card>
      <CardContent className="py-4 text-sm">
        {t("presetPatientLabel", {
          name: getPatientFullName(presetPatient, "Patient"),
        })}
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
  const t = useClaimFormTranslations();
  if (!invoiceId) return null;

  return (
    <Card>
      <CardContent className="space-y-2 py-4 text-sm">
        <p className="font-medium">{t("readinessTitle")}</p>
        {claimReadinessLoading ? (
          <p className="text-muted-foreground">{t("readinessLoadingLabel")}</p>
        ) : claimReadiness?.claimReady ? (
          <p className="text-muted-foreground">
            {t("readinessReadyLabel")}
          </p>
        ) : (
          <>
            <p className="text-destructive">
              {t("readinessIssuesHeader")}
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
  const t = useClaimFormTranslations();
  return (
    <FormField
      control={control}
      name="patientId"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{t("patientLabel")}</FormLabel>
          <Input
            placeholder={t("patientSearchPlaceholder")}
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="mb-2"
          />
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    patientsLoading ? t("patientLoadingPlaceholder") : t("patientSelectPlaceholder")
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
  const t = useClaimFormTranslations();
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
          <FormLabel>{t("claimTypeLabel")}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(["PRE_AUTH", "REIMBURSEMENT"] as const).map((ct) => (
                <SelectItem
                  key={ct}
                  value={ct}
                  disabled={ct === "REIMBURSEMENT" && !presets?.invoiceId}
                >
                  {CLAIM_TYPE_LABELS[ct]}
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
  const t = useClaimFormTranslations();
  return (
    <FormField
      control={control}
      name="claimedAmount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("claimedAmountLabel")}</FormLabel>
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
  const t = useClaimFormTranslations();
  return (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{t("notesLabel")}</FormLabel>
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
  const t = useClaimFormTranslations();
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
          label={t("insurerLabel")}
          placeholder={t("insurerPlaceholder")}
        />
        <ClaimTextField
          control={control}
          name="tpaName"
          label={t("tpaLabel")}
          placeholder={t("tpaPlaceholder")}
        />
        <ClaimTextField
          control={control}
          name="policyNumber"
          label={t("policyNumberLabel")}
        />
        <ClaimTextField
          control={control}
          name="groupNumber"
          label={t("groupNumberLabel")}
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
  const t = useClaimFormTranslations();
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        {t("cancelButton")}
      </Button>
      <Button type="submit" disabled={isSaving || claimReadinessLoading}>
        {isSaving ? t("creatingLabel") : t("createClaimButton")}
      </Button>
    </div>
  );
}
