import { useTranslation } from "react-i18next";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { AuthEmailStepUI } from "./AuthEmailStepUI";
import { AuthLoginStepUI } from "./AuthLoginStepUI";
import { AuthSignupStepUI } from "./AuthSignupStepUI";
import { PreDashboardShell } from "./PreDashboardShell";
import { AUTH_STEP_COPY } from "../lib/auth-page-copy";
import { useAuthPageContainer } from "../hooks/use-auth-page-container";

export function AuthPageContainer() {
  const auth = useAuthPageContainer();
  const { t } = useTranslation("Auth");
  const tAuth = (key: string) => {
    const result = t(`signIn.${key}`);
    return result !== `signIn.${key}` ? result : undefined;
  };
  const stepCopy = AUTH_STEP_COPY[auth.step];

  if (auth.isRedirecting) return (
      <PageTransitionLoader
        title="Redirecting…"
        description="Taking you to your workspace…"
      />
    );

  return (
    <PreDashboardShell
      currentStep={auth.step}
      contentMaxWidth={auth.contentMaxWidth}
      contentAlignment={auth.contentAlignment}
      showBrandingPanel
      showProgress={auth.step === "signup"}
    >
      <div className={["ui-copy-stack", auth.copyAlignment].join(" ")}>
        <h1 className="ui-page-title">
          {tAuth(stepCopy.titleKey) || stepCopy.title}
        </h1>
        <p className="ui-page-subtitle">
          {tAuth(stepCopy.descriptionKey) || stepCopy.description}
        </p>
      </div>

      <div className="ui-card-surface p-6 sm:p-8">
        <div key={auth.step}>
          {auth.step === "email" && (
            <AuthEmailStepUI
              email={auth.email}
              fieldErrors={auth.fieldErrors}
              loading={auth.loading}
              error={auth.error}
              onChangeEmail={auth.setEmail}
              onSubmit={auth.handleEmailSubmit}
            />
          )}

          {auth.step === "login" && (
            <AuthLoginStepUI
              email={auth.email}
              password={auth.password}
              showPassword={auth.showPassword}
              fieldErrors={auth.fieldErrors}
              loading={auth.loading}
              error={auth.error}
              isLocked={auth.isLoginLocked}
              lockoutMessage={auth.lockoutMessage}
              onBack={auth.handleBack}
              onChangePassword={auth.setPassword}
              onTogglePassword={() => auth.setShowPassword((prev) => !prev)}
              onSubmit={auth.handleLoginSubmit}
              onForgotPassword={auth.handleForgotPassword}
            />
          )}

          {auth.step === "signup" && (
            <AuthSignupStepUI
              email={auth.email}
              firstName={auth.firstName}
              lastName={auth.lastName}
              password={auth.password}
              confirmPassword={auth.confirmPassword}
              ownerRole={auth.ownerRole}
              showPassword={auth.showPassword}
              fieldErrors={auth.fieldErrors}
              loading={auth.loading}
              error={auth.error}
              onBack={auth.handleBack}
              onChangeFirstName={auth.setFirstName}
              onChangeLastName={auth.setLastName}
              onChangePassword={auth.handlePasswordChange}
              onChangeConfirmPassword={auth.handleConfirmPasswordChange}
              onChangeOwnerRole={auth.handleOwnerRoleChange}
              onTogglePassword={() => auth.setShowPassword((prev) => !prev)}
              onSubmit={auth.handleSignupSubmit}
            />
          )}
        </div>
      </div>
    </PreDashboardShell>
  );
}