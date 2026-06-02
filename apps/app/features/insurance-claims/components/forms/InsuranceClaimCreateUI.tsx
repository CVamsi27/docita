"use client";

import { FC } from "react";
import { ArrowLeft } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { getPatientFullName } from "@workspace/utils";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import {
  Form,
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
import {
  useInsuranceClaimCreateLogic,
  type ClaimCreatePresets,
} from "@/features/insurance-claims/hooks/use-insurance-claim-create-logic";
import { CLAIM_TYPE_LABELS } from "@/features/insurance-claims/lib/claim-display";

export const InsuranceClaimCreateUI: FC<{ presets?: ClaimCreatePresets }> = ({
  presets,
}) => {
  const {
    form,
    onSubmit,
    isSaving,
    router,
    patients,
    patientsLoading,
    presetPatient,
    claimReadiness,
    claimReadinessLoading,
    patientSearch,
    setPatientSearch,
  } = useInsuranceClaimCreateLogic(presets);

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="New Insurance Claim"
          description="Record a pre-authorization or reimbursement claim for a patient."
          actions={
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
        />
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {presetPatient && (
            <Card>
              <CardContent className="py-4 text-sm">
                Creating a claim for{" "}
                <span className="font-medium">
                  {getPatientFullName(presetPatient, "Patient")}
                </span>
                .
              </CardContent>
            </Card>
          )}

          {presets?.invoiceId && (
            <Card>
              <CardContent className="space-y-2 py-4 text-sm">
                <p className="font-medium">Invoice claim readiness</p>
                {claimReadinessLoading ? (
                  <p className="text-muted-foreground">
                    Checking clinical coding…
                  </p>
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
          )}

          <Card>
            <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
              {!presets?.patientId && (
                <FormField
                  control={form.control}
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                patientsLoading
                                  ? "Loading…"
                                  : "Select a patient"
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
                control={form.control}
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
                control={form.control}
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
                        onChange={(e) =>
                          field.onChange(e.target.valueAsNumber || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                control={form.control}
                name="tpaName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TPA (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Third-party administrator"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSaving ||
                claimReadinessLoading
              }
            >
              {isSaving ? "Creating…" : "Create claim"}
            </Button>
          </div>
        </form>
      </Form>
    </AppPageScaffold>
  );
};
