"use client";

import type { Control, FieldPath } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/indicators/card";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import type { EditInsuranceClaimFormValues } from "@workspace/types";
import { useInsuranceClaimEditLogic } from "@/features/insurance-claims/hooks/use-insurance-claim-edit-logic";

/**
 * Shared render shape for the claim form's plain-text fields (insurer, TPA,
 * policy number, group number) — they're identical aside from the bound
 * field name and label, so a small local wrapper keeps each declaration to
 * one line instead of repeating the FormField/FormItem/Input scaffold.
 */
function ClaimTextField({
  control,
  name,
  label,
  className,
}: {
  control: Control<EditInsuranceClaimFormValues>;
  name: FieldPath<EditInsuranceClaimFormValues>;
  label: string;
  className?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function InsuranceClaimEditUI({ id }: { id: string }) {
  const {
    claim,
    loading,
    isError,
    error,
    refetch,
    form,
    onSubmit,
    isSaving,
    router,
  } = useInsuranceClaimEditLogic(id);
  const status = loading
    ? "loading"
    : isError
      ? "error"
      : claim
        ? "success"
        : "empty";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Edit Insurance Claim"
          actions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />
      }
    >
      <DataState
        status={status}
        loadingMessage="Loading claim…"
        errorMessage={error?.message}
        onRetry={() => void refetch()}
        emptyTitle="Claim not found"
      >
        {claim?.status === "DRAFT" ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <Card>
                <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
                  <ClaimTextField
                    control={form.control}
                    name="insurerName"
                    label="Insurer"
                  />
                  <ClaimTextField
                    control={form.control}
                    name="tpaName"
                    label="TPA (optional)"
                  />
                  <ClaimTextField
                    control={form.control}
                    name="policyNumber"
                    label="Policy number"
                  />
                  <ClaimTextField
                    control={form.control}
                    name="groupNumber"
                    label="Group number (optional)"
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
                            onChange={(event) =>
                              field.onChange(event.target.valueAsNumber || 0)
                            }
                          />
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
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        ) : claim ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Only draft claims can be edited.
            </CardContent>
          </Card>
        ) : null}
      </DataState>
    </AppPageScaffold>
  );
}
