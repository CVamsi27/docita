"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";

export type AbhaVerificationUiState =
  | { kind: "idle"; message?: string }
  | { kind: "verified"; message: string; detail?: string }
  | { kind: "not-configured"; message: string }
  | { kind: "failed"; message: string };

interface AbhaVerificationFieldProps<T extends FieldValues> {
  control: Control<T>;
  currentValue?: string | null;
  isPending: boolean;
  patientId?: string | null;
  status: AbhaVerificationUiState;
  onVerify?: () => void;
}

function getStatusBadge(status: AbhaVerificationUiState) {
  if (status.kind === "verified") {
    return <Badge className="badge-success">Verified</Badge>;
  }
  if (status.kind === "not-configured") {
    return <Badge variant="outline">Not configured</Badge>;
  }
  if (status.kind === "failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return <Badge variant="outline">Unverified</Badge>;
}

function AbhaVerificationStatus({
  status,
}: {
  status: AbhaVerificationUiState;
}) {
  if (status.kind === "idle" && !status.message) return null;

  const isVerified = status.kind === "verified";
  const isFailure = status.kind === "failed";

  return (
    <Alert
      variant={isFailure ? "destructive" : "default"}
      className="mt-3 bg-muted/25"
    >
      {isVerified ? (
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      ) : (
        <AlertCircle className="h-4 w-4" aria-hidden />
      )}
      <AlertTitle className="flex flex-wrap items-center gap-2">
        <span>{status.message ?? "ABHA verification pending"}</span>
        {getStatusBadge(status)}
      </AlertTitle>
      {status.kind === "verified" && status.detail ? (
        <AlertDescription>{status.detail}</AlertDescription>
      ) : null}
    </Alert>
  );
}

export function AbhaVerificationField<T extends FieldValues>({
  control,
  currentValue,
  isPending,
  patientId,
  status,
  onVerify,
}: AbhaVerificationFieldProps<T>) {
  const canVerify = Boolean(patientId && currentValue?.trim() && onVerify);

  return (
    <div className="md:col-span-2">
      <FormField
        control={control}
        name={"abhaAddress" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>ABHA Address</FormLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="name@abdm"
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                onClick={onVerify}
                disabled={!canVerify || isPending}
                className="sm:w-32"
              >
                {isPending ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                )}
                Verify
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <AbhaVerificationStatus status={status} />
    </div>
  );
}
