"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { formatLoginLockoutMessage } from "@/lib/auth/auth-lockout";
import { ApiValidationError } from "@/lib/api/api-error";
import { checkEmailSchema, passwordSchema } from "@workspace/types";
import { getUserFacingErrorMessage } from "@workspace/utils";
import type { AuthStep, FieldErrors } from "@/features/auth/types/auth";
import { getAuthenticatedLandingPath } from "@/features/auth/lib/auth-landing-path";

export function useAuthPageContainer() {
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
    router.replace(getAuthenticatedLandingPath(user));
  }, [isAuthenticated, router, user]);

  const lockoutMessage = isLoginLocked
    ? formatLoginLockoutMessage(loginLockoutUntil ?? 0)
    : "";
  const contentAlignment =
    step === "signup" ? ("start" as const) : ("center" as const);
  const contentMaxWidth = step === "signup" ? "max-w-3xl" : "max-w-md";
  const copyAlignment =
    step === "signup" ? "text-center lg:text-left" : "text-center";

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
    clearFieldError("password");
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

    if (!password.trim()) {
      nextFieldErrors.password = "Enter password";
    } else {
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        const firstIssue = passwordValidation.error.issues[0];
        nextFieldErrors.password =
          firstIssue?.message ?? "Enter a valid password";
      }
    }

    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = "Confirm password";
    } else if (password !== confirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match";
    }

    if (!ownerRole) {
      nextFieldErrors.ownerRole = "Choose how you will use this owner account";
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
    const normalizedEmail = email.trim();
    router.push(
      normalizedEmail
        ? `/forgot-password?email=${encodeURIComponent(normalizedEmail)}`
        : "/forgot-password",
    );
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

  return {
    step,
    email,
    password,
    confirmPassword,
    firstName,
    lastName,
    ownerRole,
    showPassword,
    error,
    fieldErrors,
    loading,
    isRedirecting,
    isLoginLocked,
    lockoutMessage,
    contentAlignment,
    contentMaxWidth,
    copyAlignment,
    setEmail,
    setPassword,
    setShowPassword,
    setFirstName,
    setLastName,
    handleEmailSubmit,
    handleLoginSubmit,
    handleSignupSubmit,
    handleForgotPassword,
    handleBack,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleOwnerRoleChange,
  };
}
