"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { api } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { getUserFacingErrorMessage, passwordSchema } from "@workspace/types";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/common/navigation/back-button";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(1, "Enter new password").pipe(passwordSchema),
    confirmPassword: z.string().min(1, "Confirm password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
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
          fallback: "We could not reset your password. Please request a new reset link.",
          context: "auth",
        }),
      );
    }
  };

  if (!token) {
    return (
      <PreDashboardShell currentStep="reset-password" showProgress={false}>
        <div className="ui-card-surface space-y-6 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center ui-copy-stack">
            <h1 className="ui-page-title">Reset Link Expired</h1>
            <p className="text-sm text-destructive">
              This reset link is invalid or has expired. Please request a new one.
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
    <PreDashboardShell currentStep="reset-password" showProgress={false}>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ui-copy-stack">
        <h1 className="ui-page-title">Set New Password</h1>
        <p className="ui-page-subtitle">
          Choose a new password below
        </p>
      </div>

      <div className="ui-card-surface p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                New Password<span className="text-destructive ml-0.5">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  {...form.register("newPassword")}
                  className="h-11 pr-10"
                  autoFocus
                />
                <SymbolTooltip
                  label={showPassword ? "Hide password" : "Show password"}
                  side="left"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </SymbolTooltip>
              </div>
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter confirm password"
                {...form.register("confirmPassword")}
                className="h-11"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                  Resetting…
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <BackButton
              fallback="/login"
              label="Back to Sign In"
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <PreDashboardShell currentStep="reset-password">
          <div className="ui-card-surface space-y-6 p-6 sm:p-8">
            <div className="text-center ui-copy-stack">
              <h1 className="ui-page-title">Reset Password</h1>
              <div
                className="flex flex-col items-center gap-3 py-4"
                role="status"
                aria-live="polite"
                aria-label="Loading password reset"
              >
                <DocitaLoadingIndicator
                  variant="section"
                  withStatusRole={false}
                  iconClassName="h-10 w-10 text-primary"
                />
                <p className="ui-page-subtitle">Loading…</p>
              </div>
            </div>
          </div>
        </PreDashboardShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
