"use client";

import { getPatientFullName } from "@workspace/utils";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
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
        )}

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

        <FormField
          control={control}
          name="insurerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurer</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Star Health" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="tpaName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TPA (optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Third-party administrator" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="policyNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy number</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="groupNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group number (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
