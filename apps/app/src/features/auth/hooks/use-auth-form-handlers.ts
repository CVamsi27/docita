import { type Dispatch, type SetStateAction, useCallback } from "react";
import { useNavigate } from "react-router";
import { clearFieldErrorFrom } from "./auth-page-container-helpers";

interface UseAuthFormHandlersParams {
  email: string;
  setOwnerRole: Dispatch<SetStateAction<"ADMIN" | "ADMIN_DOCTOR" | null>>;
  setFirstName: Dispatch<SetStateAction<string>>;
  setLastName: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setStep: Dispatch<SetStateAction<"email" | "login" | "signup">>;
}

export function useAuthFormHandlers({
  email,
  setOwnerRole,
  setFirstName,
  setLastName,
  setPassword,
  setConfirmPassword,
  setError,
  setFieldErrors,
  setStep,
}: UseAuthFormHandlersParams) {
  const navigate = useNavigate();
  const resetErrors = useCallback(() => {
    setError("");
    setFieldErrors({});
  }, [setError, setFieldErrors]);
  const clearFieldError = useCallback(
    (field: string) =>
      setFieldErrors((prev) => clearFieldErrorFrom(field, prev)),
    [setFieldErrors],
  );
  const handleOwnerRoleChange = useCallback(
    (value: "ADMIN" | "ADMIN_DOCTOR") => {
      setOwnerRole(value);
      clearFieldError("ownerRole");
    },
    [setOwnerRole, clearFieldError],
  );
  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      clearFieldError("password");
      clearFieldError("confirmPassword");
    },
    [setPassword, clearFieldError],
  );
  const handleConfirmPasswordChange = useCallback(
    (value: string) => {
      setConfirmPassword(value);
      clearFieldError("confirmPassword");
    },
    [setConfirmPassword, clearFieldError],
  );
  const handleForgotPassword = useCallback(() => {
    const n = email.trim();
    navigate(
      n
        ? `/forgot-password?email=${encodeURIComponent(n)}`
        : "/forgot-password",
    );
  }, [email, navigate]);
  const handleBack = useCallback(() => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setOwnerRole(null);
    resetErrors();
  }, [
    setStep,
    setPassword,
    setConfirmPassword,
    setFirstName,
    setLastName,
    setOwnerRole,
    resetErrors,
  ]);
  return {
    resetErrors,
    clearFieldError,
    handleOwnerRoleChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleForgotPassword,
    handleBack,
  };
}