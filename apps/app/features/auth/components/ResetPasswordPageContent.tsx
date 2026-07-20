"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { useResetPasswordFlow } from "@/features/auth/hooks/use-reset-password-flow";
import {
  ResetLinkExpiredCard,
  ResetPasswordFormCard,
  ResetPasswordShell,
  ResetPasswordSuccessCard,
} from "./ResetPasswordPageContentSections";

/**
 * Phase 3 (per-feature): apps/app Auth > reset password content (parent).
 * Companion to ResetPasswordPageContentSections — uses the same
 * "Auth.resetPassword" namespace to avoid duplication.
 */
function useResetPasswordTranslations() {
  return useTranslations("Auth.resetPassword");
}

function ResetPasswordInner() {
  const t = useResetPasswordTranslations();
  const {
    token,
    submitted,
    error,
    showPassword,
    form,
    onSubmit,
    togglePasswordVisibility,
  } = useResetPasswordFlow();

  if (!token) {
    return (
      <ResetPasswordShell>
        <ResetLinkExpiredCard />
      </ResetPasswordShell>
    );
  }

  return (
    <ResetPasswordShell>
      <div className="ui-copy-stack">
        <h1 className="ui-page-title">{t("setNewPasswordTitle")}</h1>
        <p className="ui-page-subtitle">{t("setNewPasswordSubtitle")}</p>
      </div>

      <div className="ui-card-surface p-6 sm:p-8">
        {submitted ? (
          <ResetPasswordSuccessCard />
        ) : (
          <ResetPasswordFormCard
            form={form}
            onSubmit={onSubmit}
            showPassword={showPassword}
            onTogglePassword={togglePasswordVisibility}
            error={error}
          />
        )}
      </div>
    </ResetPasswordShell>
  );
}

export function ResetPasswordPageContent() {
  const t = useResetPasswordTranslations();
  return (
    <Suspense
      fallback={
        <ResetPasswordShell>
          <div className="ui-card-surface p-6 sm:p-8">
            <LoadingState message={t("loadingFallback")} />
          </div>
        </ResetPasswordShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
