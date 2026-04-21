"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
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
        <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Reset Link Expired</h1>
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Set New Password</h1>
        <p className="text-muted-foreground text-sm">
          Choose a new password below
        </p>
      </div>

      <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Password reset successful</h2>
              <p className="text-sm text-muted-foreground">
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
                  placeholder="New password"
                  {...form.register("newPassword")}
                  className="h-11 pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
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
                placeholder="Confirm password"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
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
          <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          </div>
        </PreDashboardShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
