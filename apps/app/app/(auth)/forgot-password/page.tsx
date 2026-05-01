"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { api } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";
import { BackButton } from "@/components/common/navigation/back-button";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <PreDashboardShell currentStep="forgot-password" showProgress={false}>
          <div className="ui-card-surface p-6 sm:p-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
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
    resolver: zodResolver(forgotPasswordSchema),
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ui-copy-stack">
        <h1 className="ui-page-title">Reset Password</h1>
        <p className="ui-page-subtitle">
          Enter your email address to receive a password reset link
        </p>
      </div>

      <div className="ui-card-surface p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              label="Back to Sign In"
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
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                {...form.register("email")}
                className="h-11"
                autoFocus
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
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
                  Sending...
                </>
              ) : (
                "Send Reset Link"
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
