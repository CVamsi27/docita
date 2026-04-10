"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiValidationError } from "@/lib/api-error";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { ThemeToggle } from "@workspace/ui/components/theme-toggle";
import { getUserFacingErrorMessage } from "@workspace/types";
import { AuthEmailStepUI } from "./AuthEmailStepUI";
import { AuthLoginStepUI } from "./AuthLoginStepUI";
import { AuthSignupStepUI } from "./AuthSignupStepUI";
import { AuthBrandingPanel } from "./AuthBrandingPanel";
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

export function AuthPageContainer() {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ownerRole, setOwnerRole] = useState<"ADMIN" | "ADMIN_DOCTOR">(
    "ADMIN",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {
    login,
    register,
    checkEmail,
    isLoginLocked,
    loginLockoutUntil,
  } = useAuth();
  const lockoutMessage = isLoginLocked
    ? formatLockoutMessage(loginLockoutUntil)
    : "";

  const resetErrors = () => {
    setError("");
    setFieldErrors({});
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
    setLoading(true);

    try {
      const exists = await checkEmail(email);
      setStep(exists ? "login" : "signup");
    } catch (err) {
      handleCatchError(err, "An error occurred checking email");
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
      handleCatchError(err, "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    resetErrors();
    setLoading(true);

    try {
      await register(
        email,
        password,
        firstName,
        lastName,
        ownerRole,
        undefined,
      );
    } catch (err) {
      handleCatchError(err, "An error occurred during registration");
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
    setFirstName("");
    setLastName("");
    setOwnerRole("ADMIN");
    resetErrors();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AuthBrandingPanel />

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-4 py-8 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 60% 40%, oklch(var(--primary) / 0.04) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-6 relative z-10">
          <div className="lg:hidden flex justify-center mb-2">
            <DocitaLogo />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-1 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight">
              {STEP_TITLES[step]}
            </h1>
            <p className="text-muted-foreground text-sm">
              {STEP_DESCRIPTIONS[step]}
            </p>
          </div>

          <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
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
                  ownerRole={ownerRole}
                  showPassword={showPassword}
                  fieldErrors={fieldErrors}
                  loading={loading}
                  error={error}
                  onBack={handleBack}
                  onChangeFirstName={setFirstName}
                  onChangeLastName={setLastName}
                  onChangePassword={setPassword}
                  onChangeOwnerRole={setOwnerRole}
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
        </div>
      </div>
    </div>
  );
}
