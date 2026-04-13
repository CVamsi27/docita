"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield } from "lucide-react";
import { useAuth, type User } from "@/lib/auth-context";
import { ApiValidationError } from "@/lib/api-error";
import { checkEmailSchema, getUserFacingErrorMessage } from "@workspace/types";
import { PageTransitionLoader } from "@/components/common/loaders/page-transition-loader";
import { AuthEmailStepUI } from "./AuthEmailStepUI";
import { AuthLoginStepUI } from "./AuthLoginStepUI";
import { AuthSignupStepUI } from "./AuthSignupStepUI";
import { PreDashboardShell } from "./PreDashboardShell";
import type { AuthStep, FieldErrors } from "@/features/auth/types/auth";

const STEP_TITLES: Record<AuthStep, string> = {
  email: "Welcome to Docita",
  login: "Welcome back",
  signup: "Create your account",
};

const STEP_DESCRIPTIONS: Record<AuthStep, string> = {
  email: "Enter your email to continue",
  login: "Sign in to your workspace",
  signup: "Get started with Docita",
};

function formatLockoutMessage(lockoutUntil: number | null): string {
  if (!lockoutUntil) {
    return "";
  }

  const remainingMs = lockoutUntil - Date.now();
  if (remainingMs <= 0) {
    return "Your account lockout has expired. You can sign in again.";
  }

  const minutesRemaining = Math.ceil(remainingMs / 60_000);
  return `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`;
}

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

  return "/dashboard";
}

export function AuthPageContainer() {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ownerRole, setOwnerRole] = useState<"ADMIN" | "ADMIN_DOCTOR" | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    login,
    register,
    checkEmail,
    isLoginLocked,
    loginLockoutUntil,
  } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    setIsRedirecting(true);
    router.replace(getPostAuthPath(user));
  }, [isAuthenticated, router, user]);

  const lockoutMessage = isLoginLocked
    ? formatLockoutMessage(loginLockoutUntil)
    : "";
  const contentAlignment = step === "signup" ? "start" : "center";

  const resetErrors = () => {
    setError("");
    setFieldErrors({});
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleOwnerRoleChange = (value: "ADMIN" | "ADMIN_DOCTOR") => {
    setOwnerRole(value);
    clearFieldError("ownerRole");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearFieldError("confirmPassword");
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    clearFieldError("confirmPassword");
  };

  const handleCatchError = (err: unknown, fallback: string) => {
    if (err instanceof ApiValidationError && err.hasFieldErrors) {
      setFieldErrors(err.fieldErrors);
      setError(
        getUserFacingErrorMessage(err, {
          fallback,
          context: "form",
        }),
      );
      return;
    }

    setError(
      getUserFacingErrorMessage(err, {
        fallback,
        context: "auth",
      }),
    );
  };

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetErrors();

    const normalizedEmail = email.trim();
    const validation = checkEmailSchema.safeParse({ email: normalizedEmail });
    if (!validation.success) {
      const emailIssue = validation.error.issues.find(
        (issue) => issue.path[0] === "email",
      );
      setFieldErrors({
        email: emailIssue?.message ?? "Please enter a valid email address",
      });
      return;
    }

    setLoading(true);
    setEmail(normalizedEmail);

    try {
      const exists = await checkEmail(normalizedEmail);
      setStep(exists ? "login" : "signup");
    } catch (err) {
      handleCatchError(
        err,
        "We could not check this email right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetErrors();
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      handleCatchError(
        err,
        "We could not sign you in right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetErrors();

    const nextFieldErrors: FieldErrors = {};

    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = "Please re-enter your password.";
    } else if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (!ownerRole) {
      nextFieldErrors.ownerRole = "Choose how you will use this owner account.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setLoading(true);

    try {
      await register(
        email,
        password,
        firstName,
        lastName,
        ownerRole ?? undefined,
        undefined,
      );
    } catch (err) {
      handleCatchError(
        err,
        "We could not finish creating your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  const handleBack = () => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setOwnerRole(null);
    resetErrors();
  };

  const contentMaxWidth = step === "signup" ? "max-w-3xl" : "max-w-md";

  if (isRedirecting) {
    return (
      <PageTransitionLoader
        title="Redirecting..."
        description="Taking you to your workspace..."
      />
    );
  }

  return (
    <PreDashboardShell
      currentStep={step}
      contentMaxWidth={contentMaxWidth}
      contentAlignment={contentAlignment}
    >
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold">{STEP_TITLES[step]}</h1>
        <p className="text-muted-foreground text-sm">
          {STEP_DESCRIPTIONS[step]}
        </p>
      </div>

      <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
        <div
          key={step}
          className="animate-in fade-in slide-in-from-right-4 duration-500"
        >
          {step === "email" && (
            <AuthEmailStepUI
              email={email}
              fieldErrors={fieldErrors}
              loading={loading}
              error={error}
              onChangeEmail={setEmail}
              onSubmit={handleEmailSubmit}
            />
          )}

          {step === "login" && (
            <AuthLoginStepUI
              email={email}
              password={password}
              showPassword={showPassword}
              fieldErrors={fieldErrors}
              loading={loading}
              error={error}
              isLocked={isLoginLocked}
              lockoutMessage={lockoutMessage}
              onBack={handleBack}
              onChangePassword={setPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onSubmit={handleLoginSubmit}
              onForgotPassword={handleForgotPassword}
            />
          )}

          {step === "signup" && (
            <AuthSignupStepUI
              email={email}
              firstName={firstName}
              lastName={lastName}
              password={password}
              confirmPassword={confirmPassword}
              ownerRole={ownerRole}
              showPassword={showPassword}
              fieldErrors={fieldErrors}
              loading={loading}
              error={error}
              onBack={handleBack}
              onChangeFirstName={setFirstName}
              onChangeLastName={setLastName}
              onChangePassword={handlePasswordChange}
              onChangeConfirmPassword={handleConfirmPasswordChange}
              onChangeOwnerRole={handleOwnerRoleChange}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onSubmit={handleSignupSubmit}
            />
          )}
        </div>
      </div>

      <div className="lg:hidden flex justify-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Data Encrypted
        </span>
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          HIPAA Ready
        </span>
      </div>
    </PreDashboardShell>
  );
}
