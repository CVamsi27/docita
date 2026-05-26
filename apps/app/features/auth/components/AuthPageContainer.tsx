"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type User } from "@/lib/auth/auth-context";
import { formatLoginLockoutMessage } from "@/lib/auth/auth-lockout";
import { ApiValidationError } from "@/lib/api/api-error";
import {
  checkEmailSchema,
  getUserFacingErrorMessage,
  passwordSchema,
  type UserRole,
} from "@workspace/types";

const ROLES_LAND_ON_CONSULTATION = new Set<UserRole>(["DOCTOR", "ADMIN_DOCTOR"]);
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { AuthEmailStepUI } from "./AuthEmailStepUI";
import { AuthLoginStepUI } from "./AuthLoginStepUI";
import { AuthSignupStepUI } from "./AuthSignupStepUI";
import { PreDashboardShell } from "./PreDashboardShell";
import type { AuthStep, FieldErrors } from "@/features/auth/types/auth";
import { sanitizeAppReturnPath } from "@/lib/auth/safe-return-path";
import { APP_REDIRECT_AFTER_LOGIN_KEY } from "@/lib/auth/session";

const STEP_TITLES: Record<AuthStep, string> = {
  email: "Welcome to Docita",
  login: "Welcome back",
  signup: "Create your account",
};

const STEP_DESCRIPTIONS: Record<AuthStep, string> = {
  email: "Use your work email to sign in or create an account",
  login: "Sign in to your workspace",
  signup: "Get started with Docita",
};

function getPostAuthPath(user: User): string {
  if (user.emailVerified === false) {
    return "/verify-email-sent";
  }

  if (!user.clinicId) {
    switch (user.onboardingStep) {
      case "JOINING_CLINIC":
        return "/join-request-status";
      case "CREATING_CLINIC":
        return "/onboarding";
      case "CHOOSE_PATH":
      case "NOT_STARTED":
      default:
        return "/choose-path";
    }
  }

  if (ROLES_LAND_ON_CONSULTATION.has(user.role as UserRole)) {
    return "/consultation";
  }

  return "/today";
}

function getAuthenticatedLandingPath(user: User): string {
  const fallback = getPostAuthPath(user);

  if (user.emailVerified === false || !user.clinicId) {
    return fallback;
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY);
  sessionStorage.removeItem(APP_REDIRECT_AFTER_LOGIN_KEY);
  const safe = sanitizeAppReturnPath(stored);
  return safe ?? fallback;
}

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
