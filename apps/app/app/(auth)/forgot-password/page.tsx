"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "@workspace/types";
import { CheckCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { api } from "@/lib/api/api-client";
import { logger } from "@/lib/monitoring/logger";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/navigation/back-button";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <PreDashboardShell currentStep="forgot-password" showProgress={false}>
          <div className="ui-card-surface p-6 sm:p-8">
            <LoadingState message="Loading password reset…" />
          </div>
        </PreDashboardShell>
      }
    >
      <ForgotPasswordPageContent />
    </Suspense>
  );
}

function ForgotPasswordPageContent() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const prefillEmail = useMemo(() => {
    const raw = searchParams.get("email");
    return typeof raw === "string" ? raw.trim() : "";
  }, [searchParams]);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: prefillEmail },
  });

  useEffect(() => {
    form.reset({ email: prefillEmail });
  }, [form, prefillEmail]);

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSubmitted(true);
    } catch (err) {
      logger.error("Forgot password request failed", { error: err });
      setError("We could not send the password reset email. Please try again.");
    }
  };

  return (
    <PreDashboardShell currentStep="forgot-password" showProgress={false}>
      <div className="ui-copy-stack">
        <h1 className="ui-page-title">Reset Password</h1>
        <p className="ui-page-subtitle">
          Enter your email address to receive a password reset link
        </p>
      </div>

      <div className="ui-card-surface p-6 sm:p-8">
        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="surface-success flex h-16 w-16 items-center justify-center rounded-full">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <div className="ui-copy-stack">
              <h2 className="ui-section-title">Check your email</h2>
              <p className="ui-helper-text">
                If an account with that email exists, a password reset link has been sent
              </p>
            </div>
            <BackButton
              fallback="/login"
              label="Back to sign in"
              variant="outline"
              size="default"
              className="w-full h-11"
            />
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="Enter email address"
                className="h-12 min-h-12 bg-background/50"
                aria-invalid={Boolean(form.formState.errors.email)}
                aria-describedby={
                  form.formState.errors.email ? "email-error" : undefined
                }
                {...form.register("email")}
              />
              {form.formState.errors.email?.message ? (
                <p id="email-error" className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
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
                  Sending…
                </>
              ) : (
                "Send reset link"
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
