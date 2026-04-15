"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { api } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { PreDashboardShell } from "@/features/auth/components/PreDashboardShell";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">Reset Password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email address and we will send you a link to reset your password.
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
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If an account with that email exists, a password reset link has been sent.
              </p>
            </div>
            <Button variant="outline" asChild className="w-full h-11">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
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
                placeholder="doctor@docita.work"
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
              className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
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

            <Button variant="ghost" asChild className="w-full h-11">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </form>
        )}
      </div>
    </PreDashboardShell>
  );
}
