import { passwordSchema } from "@workspace/types";
import type { AuthStep, FieldErrors } from "../types/auth";

interface AuthPageLayout {
  contentAlignment: "start" | "center";
  contentMaxWidth: string;
  copyAlignment: string;
}

export function computeAuthPageLayout(step: AuthStep): AuthPageLayout {
  return {
    contentAlignment: step === "signup" ? ("start" as const) : ("center" as const),
    contentMaxWidth: step === "signup" ? "max-w-3xl" : "max-w-md",
    copyAlignment:
      step === "signup" ? "text-center lg:text-left" : "text-center",
  };
}

export function validateSignupForm(
  password: string,
  confirmPassword: string,
  ownerRole: "ADMIN" | "ADMIN_DOCTOR" | null,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!password.trim()) {
    errors.password = "Enter password";
  } else {
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      const firstIssue = passwordValidation.error.issues[0];
      errors.password = firstIssue?.message ?? "Enter a valid password";
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm password";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (!ownerRole) {
    errors.ownerRole = "Choose how you will use this owner account";
  }

  return errors;
}

export function clearFieldErrorFrom(
  field: string,
  prev: FieldErrors,
): FieldErrors {
  if (!prev[field]) return prev;
  const next = { ...prev };
  delete next[field];
  return next;
}