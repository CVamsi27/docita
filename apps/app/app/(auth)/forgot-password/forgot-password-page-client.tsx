"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from "@workspace/types";
import { CheckCircle } from "lucide-react";
import { Button, Input, Label, LoadingState } from "@workspace/ui/components";
import { logger } from "@/lib/monitoring/logger";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/navigation/back-button";
import { AuthErrorDisplay } from "@/features/auth/components/AuthErrorDisplay";
import { requestPasswordReset } from "@/features/auth/api/auth.api";

function ForgotPasswordPageInner() {
  const searchParams = useSearchParams();
  const tAuth = useTranslations("Auth.forgotPassword");
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
      await requestPasswordReset(data.email);
      setSubmitted(true);
    } catch (err) {
      logger.error("Forgot password request failed", { error: err });
      setError(tAuth("submitError"));
    }
  };

  return (
    <PreDashboardShell currentStep="forgot-password" showProgress={false}>
      <div className="ui-copy-stack">
        <h1 className="ui-page-title">{tAuth("title")}</h1>
        <p className="ui-page-subtitle">{tAuth("subtitle")}</p>
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
              <h2 className="ui-section-title">{tAuth("submittedTitle")}</h2>
              <p className="ui-helper-text">{tAuth("submittedBody")}</p>
            </div>
            <BackButton
              fallback="/login"
              label={tAuth("backToSignIn")}
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
              <Label htmlFor="email">{tAuth("emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder={tAuth("emailPlaceholder")}
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
{/* jscpd:ignore-start */}
            </div>

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
                  {tAuth("submitPending")}
{/* jscpd:ignore-end */}
                </>
              ) : (
// jscpd:ignore-start
                tAuth("submitIdle")
              )}
            </Button>

            <BackButton
              fallback="/login"
              label={tAuth("backToSignIn")}
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

export function ForgotPasswordPageClient() {
  const tAuth = useTranslations("Auth.forgotPassword");
  return (
    <Suspense
      fallback={
        <PreDashboardShell currentStep="forgot-password" showProgress={false}>
          <div className="ui-card-surface p-6 sm:p-8">
            <LoadingState message={tAuth("loading")} />
          </div>
        </PreDashboardShell>
      }
    >
      <ForgotPasswordPageInner />
    </Suspense>
  );
}
