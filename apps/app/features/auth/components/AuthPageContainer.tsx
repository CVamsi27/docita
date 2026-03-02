"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiValidationError } from "@/lib/api-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DocitaIcon } from "@workspace/ui/components/docita-logo";
import { AuthEmailStepUI } from "./AuthEmailStepUI";
import { AuthLoginStepUI } from "./AuthLoginStepUI";
import { AuthSignupStepUI } from "./AuthSignupStepUI";
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

export function AuthPageContainer() {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const { login, register, checkEmail } = useAuth();

  const resetErrors = () => {
    setError("");
    setFieldErrors({});
  };

  const handleCatchError = (err: unknown, fallback: string) => {
    if (err instanceof ApiValidationError && err.hasFieldErrors) {
      setFieldErrors(err.fieldErrors);
      setError(err.message);
      return;
    }

    if (err instanceof Error) {
      setError(err.message);
      return;
    }

    setError(fallback);
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
      await register(email, password, firstName, lastName, undefined);
    } catch (err) {
      handleCatchError(err, "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setPassword("");
    setFirstName("");
    setLastName("");
    resetErrors();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-muted/50 to-background px-4">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      <Card className="z-10 w-full max-w-md border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-1 px-8 pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 flex items-center justify-center">
              <DocitaIcon className="h-12 w-12" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center tracking-tight">
            {STEP_TITLES[step]}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground/80 text-base">
            {STEP_DESCRIPTIONS[step]}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-8">
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
              onBack={handleBack}
              onChangePassword={setPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onSubmit={handleLoginSubmit}
            />
          )}

          {step === "signup" && (
            <AuthSignupStepUI
              email={email}
              firstName={firstName}
              lastName={lastName}
              password={password}
              showPassword={showPassword}
              fieldErrors={fieldErrors}
              loading={loading}
              error={error}
              onBack={handleBack}
              onChangeFirstName={setFirstName}
              onChangeLastName={setLastName}
              onChangePassword={setPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onSubmit={handleSignupSubmit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
