"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Controller, type Control, type UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { type ResetPasswordFormValues } from "@workspace/types";
import { BackButton } from "@/components/navigation/back-button";
import { AuthPasswordFloatingField } from "./auth-password-floating-field";
import { PreDashboardShell } from "./PreDashboardShell";
import { AuthErrorDisplay } from "./AuthErrorDisplay";

const PASSWORD_RULES_HELPER =
  "Must be 8+ characters with uppercase, lowercase, number, and special character";

interface ResetPasswordShellProps {
  children: React.ReactNode;
}

/** The reset-password flow's fixed `PreDashboardShell` wrapper — every step (loading, expired, form, success) renders the same chrome, so it's named once instead of repeated three times. */
export function ResetPasswordShell({ children }: ResetPasswordShellProps) {
  return (
    <PreDashboardShell
      currentStep="reset-password"
      showBrandingPanel={false}
      showProgress={false}
    >
      {children}
    </PreDashboardShell>
  );
}

/** The "this link is no longer valid" terminal state — split out as a self-contained, prop-free card. */
export function ResetLinkExpiredCard() {
  return (
    <div className="ui-card-surface space-y-6 p-6 sm:p-8">
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
  );
}

/** The "password reset successful" terminal state — split out as a self-contained, prop-free card. */
export function ResetPasswordSuccessCard() {
  return (
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
  );
}

interface ResetPasswordFieldProps {
  control: Control<ResetPasswordFormValues>;
  name: "newPassword" | "confirmPassword";
  label: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  autoFocus?: boolean;
  showStrength?: boolean;
  helperText?: string;
}

/** One password field wired through `Controller` — the new/confirm fields were near-identical copies of this same render, so the shared shape is named once instead of duplicated. */
function ResetPasswordField({
  control,
  name,
  label,
  showPassword,
  onTogglePassword,
  autoFocus,
  showStrength,
  helperText,
}: ResetPasswordFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AuthPasswordFloatingField
          id={name}
          label={label}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          showPassword={showPassword}
          onTogglePassword={onTogglePassword}
          autoComplete="new-password"
          autoFocus={autoFocus}
          showStrength={showStrength}
          helperText={fieldState.error ? undefined : helperText}
        />
      )}
    />
  );
}

interface ResetPasswordSubmitButtonProps {
  isSubmitting: boolean;
}

/** Submit button + its inline loading state — split out as its own self-contained, independently-rendered action. */
function ResetPasswordSubmitButton({
  isSubmitting,
}: ResetPasswordSubmitButtonProps) {
  return (
    <Button
      type="submit"
      className="w-full h-11 text-base"
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
          Resetting...
        </>
      ) : (
        "Reset Password"
      )}
    </Button>
  );
}

interface ResetPasswordFormCardProps {
  form: UseFormReturn<ResetPasswordFormValues>;
  onSubmit: (data: ResetPasswordFormValues) => void | Promise<void>;
  showPassword: boolean;
  onTogglePassword: () => void;
  error: string;
}

/** The active reset-password form — fields, error display, submit, and back link — split out as the page's self-contained "do the thing" unit. */
export function ResetPasswordFormCard({
  form,
  onSubmit,
  showPassword,
  onTogglePassword,
  error,
}: ResetPasswordFormCardProps) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      <ResetPasswordField
        control={form.control}
        name="newPassword"
        label="New password"
        showPassword={showPassword}
        onTogglePassword={onTogglePassword}
        autoFocus
        showStrength
        helperText={PASSWORD_RULES_HELPER}
      />
      <ResetPasswordField
        control={form.control}
        name="confirmPassword"
        label="Confirm new password"
        showPassword={showPassword}
        onTogglePassword={onTogglePassword}
      />

      <AuthErrorDisplay error={error} />

      <ResetPasswordSubmitButton isSubmitting={form.formState.isSubmitting} />

      <BackButton
        fallback="/login"
        label="Back to sign in"
        variant="ghost"
        size="default"
        className="w-full h-11"
      />
    </form>
  );
}
