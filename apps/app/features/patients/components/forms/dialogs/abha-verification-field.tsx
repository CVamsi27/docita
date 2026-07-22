"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { useTranslations } from "next-intl";
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
  /** Verify label (defaults to namespace "verifyLabel"). */
  verifyLabel?: string;
  /** When false, the verify action is available even without a typed ABHA. */
  requireValueToVerify?: boolean;
}

function getStatusBadge(
  status: AbhaVerificationUiState,
  t: (key: string) => string,
) {
  if (status.kind === "verified") {
    return <Badge className="badge-success">{t("verifiedBadge")}</Badge>;
  }
  if (status.kind === "not-configured") {
    return <Badge variant="outline">{t("notConfiguredBadge")}</Badge>;
  }
  if (status.kind === "failed") {
    return <Badge variant="destructive">{t("failedBadge")}</Badge>;
  }
  return <Badge variant="outline">{t("unverifiedBadge")}</Badge>;
}

function AbhaVerificationStatus({
  status,
}: {
  status: AbhaVerificationUiState;
}) {
  const t = useTranslations("Patients.abhaField");
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
        <span>{status.message ?? t("pendingTitle")}</span>
        {getStatusBadge(status, t)}
      </AlertTitle>
      {status.kind === "verified" ? (
        <AlertDescription>{t("verifiedDescription")}</AlertDescription>
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
  verifyLabel,
}: AbhaVerificationFieldProps<T>) {
  const t = useTranslations("Patients.abhaField");
  const resolvedVerifyLabel = verifyLabel ?? t("verifyLabel");
  return (
    <div className="md:col-span-2">
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {t("label")}
              <ComingSoonBadge />
            </FormLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? currentValue ?? ""}
                  placeholder="name@abdm"
                  disabled
                  aria-label={t("labelAria")}
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                disabled
                className="sm:w-32"
                aria-label={t("verifyAria", { label: resolvedVerifyLabel })}
              >
                {isPending ? (
                  <DocitaLoadingIndicator variant="inline" decorative />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                )}
                {resolvedVerifyLabel}
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
