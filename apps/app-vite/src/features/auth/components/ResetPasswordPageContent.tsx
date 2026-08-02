import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { useResetPasswordFlow } from "@/features/auth/hooks/use-reset-password-flow";
import { ResetLinkExpiredCard, ResetPasswordFormCard, ResetPasswordShell, ResetPasswordSuccessCard } from "./ResetPasswordPageContentSections";

function useResetPasswordTranslations() {
  const { t } = useTranslation("Auth");
  return (key: string) => {
    const result = t(`resetPassword.${key}`);
    return result !== `resetPassword.${key}` ? result : key;
  };
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
