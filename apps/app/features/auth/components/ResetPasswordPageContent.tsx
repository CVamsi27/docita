"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@workspace/types";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { BackButton } from "@/components/navigation/back-button";
import { api } from "@/lib/api/api-client";
import { logger } from "@/lib/monitoring/logger";
import { AuthPasswordFloatingField } from "./auth-password-floating-field";
import { PreDashboardShell } from "./PreDashboardShell";
import { AuthErrorDisplay } from "./AuthErrorDisplay";

const PASSWORD_RULES_HELPER =
  "Must be 8+ characters with uppercase, lowercase, number, and special character";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError("This reset link is no longer valid. Please request a new one.");
      return;
    }

    setError("");
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      setSubmitted(true);
    } catch (err) {
      logger.error("Password reset failed", { error: err });
      setError(
        getUserFacingErrorMessage(err, {
          fallback:
            "We could not reset your password. Please request a new reset link.",
          context: "auth",
        }),
      );
    }
  };

  if (!token) {
    return (
      <PreDashboardShell
        currentStep="reset-password"
        showBrandingPanel={false}
        showProgress={false}
      >
        <div className="ui-card-surface space-y-6 p-6 sm:p-8">
          <div className="text-center ui-copy-stack">
            <h1 className="ui-page-title">Reset Link Expired</h1>
            <p className="text-sm text-destructive">
              This reset link is invalid or has expired. Please request a new
              one.
            </p>
          </div>
          <Button variant="outline" asChild className="w-full h-11">
            <Link href="/forgot-password">Request Password Reset</Link>
          </Button>
        </div>
      </PreDashboardShell>
    );
  }

  return (
    <PreDashboardShell
      currentStep="reset-password"
      showBrandingPanel={false}
      showProgress={false}
    >
      <div className="ui-copy-stack">
        <h1 className="ui-page-title">Set New Password</h1>
        <p className="ui-page-subtitle">Choose a new password below</p>
      </div>

      <div className="ui-card-surface p-6 sm:p-8">
        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <div className="ui-copy-stack">
              <h2 className="ui-section-title">Password reset successful</h2>
              <p className="ui-helper-text">
                You can now sign in with your new password.
              </p>
            </div>
            <Button asChild className="w-full h-11">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <AuthPasswordFloatingField
                  id="newPassword"
                  label="New password"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                  autoComplete="new-password"
                  autoFocus
                  showStrength
                  helperText={
                    fieldState.error ? undefined : PASSWORD_RULES_HELPER
                  }
                />
              )}
            />

            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <AuthPasswordFloatingField
                  id="confirmPassword"
                  label="Confirm new password"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                  autoComplete="new-password"
                />
              )}
// jscpd:ignore-start
            />

            <AuthErrorDisplay error={error} />

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  Resetting...
// jscpd:ignore-end
                </>
              ) : (
// jscpd:ignore-start
                "Reset Password"
              )}
            </Button>

            <BackButton
              fallback="/login"
              label="Back to sign in"
              variant="ghost"
              size="default"
              className="w-full h-11"
            />
          </form>
        )}
      </div>
    </PreDashboardShell>
  );
}

// jscpd:ignore-end
export function ResetPasswordPageContent() {
  return (
    <Suspense
      fallback={
        <PreDashboardShell
          currentStep="reset-password"
          showBrandingPanel={false}
          showProgress={false}
        >
          <div className="ui-card-surface p-6 sm:p-8">
            <LoadingState message="Loading password reset..." />
          </div>
        </PreDashboardShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
