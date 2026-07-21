"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@workspace/ui/components/form/form-primitives"
import { Alert, AlertDescription, AlertTitle, Badge, Button } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { ComingSoonBadge } from "@/components/feedback/coming-soon-badge";

export type AbhaVerificationUiState =
  | { kind: "idle"; message?: string }
  | { kind: "verified"; message: string }
  | { kind: "not-configured"; message: string }
  | { kind: "failed"; message: string };

interface AbhaVerificationFieldProps<
  T extends FieldValues & { abhaAddress?: unknown },
> {
  control: Control<T>;
  name: Path<T>;
  currentValue?: string | null;
  isPending: boolean;
  patientId?: string | null;
  status: AbhaVerificationUiState;
  onVerify?: () => void;
  /** Verify label (defaults to "Verify"). */
  verifyLabel?: string;
  /** When false, the verify action is available even without a typed ABHA. */
  requireValueToVerify?: boolean;
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
      {status.kind === "verified" ? (
        <AlertDescription>
          ABHA verification completed for this patient.
        </AlertDescription>
      ) : null}
    </Alert>
  );
}

export function AbhaVerificationField<
  T extends FieldValues & { abhaAddress?: unknown },
>({
  control,
  name,
  currentValue,
  isPending,
  status,
  verifyLabel = "Verify",
}: AbhaVerificationFieldProps<T>) {
  return (
    <div className="md:col-span-2">
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              ABHA Address
              <ComingSoonBadge />
            </FormLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? currentValue ?? ""}
                  placeholder="name@abdm"
                  disabled
                  aria-label="ABHA Address (coming soon)"
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                disabled
                className="sm:w-32"
                aria-label={`${verifyLabel} (coming soon)`}
              >
                {isPending ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                )}
                {verifyLabel}
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
