import { getPatientFullName } from "@workspace/utils";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { useTranslation } from "react-i18next";
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
import { Button } from "@workspace/ui/components/form/button";
import { FormSelectField } from "@workspace/ui/components/form/form-select-field";
import { CLAIM_TYPE_LABELS } from "@/features/insurance-claims/lib/claim-display";
import type { ClaimCreatePresets } from "@/features/insurance-claims/hooks/use-insurance-claim-create-logic";
import type { CreateInsuranceClaimFormValues, Patient } from "@workspace/types";
import type { Control } from "react-hook-form";
import type { PatientNameParts } from "@workspace/utils";

interface PresetPatientCardProps {
  presetPatient: PatientNameParts | null | undefined;
}

export function PresetPatientCard({ presetPatient }: PresetPatientCardProps) {
  const { t } = useTranslation("InsuranceClaims");
  if (!presetPatient) return null;

  return (
    <Card>
      <CardContent className="py-4 text-sm">
        {t("createFormSections.presetPatientLabel", {
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
  const { t } = useTranslation("InsuranceClaims");
  if (!invoiceId) return null;

  return (
    <Card>
      <CardContent className="space-y-2 py-4 text-sm">
        <p className="font-medium">{t("createFormSections.readinessTitle")}</p>
        {claimReadinessLoading ? (
          <p className="text-muted-foreground">
            {t("createFormSections.readinessLoadingLabel")}
          </p>
        ) : claimReadiness?.claimReady ? (
          <p className="text-muted-foreground">
            {t("createFormSections.readinessReadyLabel")}
          </p>
        ) : (
          <>
            <p className="text-destructive">
              {t("createFormSections.readinessIssuesHeader")}
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

function ClaimPatientSelectField({
  control,
  patientSearch,
  setPatientSearch,
  patients,
  patientsLoading,
}: ClaimPatientSelectFieldProps) {
  const { t } = useTranslation("InsuranceClaims");
  return (
    <FormField
      control={control}
      name="patientId"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{t("createFormSections.patientLabel")}</FormLabel>
          <Input
            placeholder={t("createFormSections.patientSearchPlaceholder")}
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="mb-2"
          />
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    patientsLoading
                      ? t("createFormSections.patientLoadingPlaceholder")
                      : t("createFormSections.patientSelectPlaceholder")
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

function ClaimTypeField({ control, presets }: ClaimTypeFieldProps) {
  const { t } = useTranslation("InsuranceClaims");
  return (
    <FormSelectField
      control={control}
      name="claimType"
      label={t("createFormSections.claimTypeLabel")}
      options={(["PRE_AUTH", "REIMBURSEMENT"] as const).map((ct) => ({
        value: ct,
        label: CLAIM_TYPE_LABELS[ct],
        disabled: ct === "REIMBURSEMENT" && !presets?.invoiceId,
      }))}
    />
  );
}

interface ClaimAmountFieldProps {
  control: Control<CreateInsuranceClaimFormValues>;
}

function ClaimAmountField({ control }: ClaimAmountFieldProps) {
  const { t } = useTranslation("InsuranceClaims");
  return (
    <FormField
      control={control}
      name="claimedAmount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("createFormSections.claimedAmountLabel")}</FormLabel>
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

function ClaimNotesField({ control }: ClaimNotesFieldProps) {
  const { t } = useTranslation("InsuranceClaims");
  return (
    <FormField
      control={control}
      name="notes"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>{t("createFormSections.notesLabel")}</FormLabel>
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
  const { t } = useTranslation("InsuranceClaims");
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
          label={t("createFormSections.insurerLabel")}
          placeholder={t("createFormSections.insurerPlaceholder")}
        />
        <ClaimTextField
          control={control}
          name="tpaName"
          label={t("createFormSections.tpaLabel")}
          placeholder={t("createFormSections.tpaPlaceholder")}
        />
        <ClaimTextField
          control={control}
          name="policyNumber"
          label={t("createFormSections.policyNumberLabel")}
        />
        <ClaimTextField
          control={control}
          name="groupNumber"
          label={t("createFormSections.groupNumberLabel")}
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
  const { t } = useTranslation("InsuranceClaims");
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        {t("createFormSections.cancelButton")}
      </Button>
      <Button type="submit" disabled={isSaving || claimReadinessLoading}>
        {isSaving
          ? t("createFormSections.creatingLabel")
          : t("createFormSections.createClaimButton")}
      </Button>
    </div>
  );
}
