"use client";

import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { AuthEmailStepUI } from "./AuthEmailStepUI";
import { AuthLoginStepUI } from "./AuthLoginStepUI";
import { AuthSignupStepUI } from "./AuthSignupStepUI";
import { PreDashboardShell } from "./PreDashboardShell";
import {
  AUTH_STEP_DESCRIPTIONS,
  AUTH_STEP_TITLES,
} from "@/features/auth/lib/auth-page-copy";
import { useAuthPageContainer } from "@/features/auth/hooks/use-auth-page-container";

export function AuthPageContainer() {
  const auth = useAuthPageContainer();

  if (auth.isRedirecting) {
    return (
      <PageTransitionLoader
        title="Redirecting…"
        description="Taking you to your workspace…"
      />
    );
  }

  return (
    <PreDashboardShell
      currentStep={auth.step}
      contentMaxWidth={auth.contentMaxWidth}
      contentAlignment={auth.contentAlignment}
      showBrandingPanel
      showProgress={auth.step === "signup"}
    >
      <div className={["ui-copy-stack", auth.copyAlignment].join(" ")}>
        <h1 className="ui-page-title">{AUTH_STEP_TITLES[auth.step]}</h1>
        <p className="ui-page-subtitle">
          {AUTH_STEP_DESCRIPTIONS[auth.step]}
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
