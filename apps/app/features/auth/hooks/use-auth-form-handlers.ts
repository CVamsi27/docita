import { type Dispatch, type SetStateAction, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clearFieldErrorFrom } from "./auth-page-container-helpers";

interface UseAuthFormHandlersParams {
  email: string;
  password: string;
  setOwnerRole: Dispatch<SetStateAction<"ADMIN" | "ADMIN_DOCTOR" | null>>;
  setFirstName: Dispatch<SetStateAction<string>>;
  setLastName: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>;
  setStep: Dispatch<SetStateAction<"email" | "login" | "signup">>;
}

type FieldErrors = Record<string, string>;

export function useAuthFormHandlers({
  email,
  password: _password,
  setOwnerRole,
  setFirstName,
  setLastName,
  setPassword,
  setConfirmPassword,
  setError,
  setFieldErrors,
  setStep,
}: UseAuthFormHandlersParams) {
  void _password;
  const router = useRouter();

  const resetErrors = useCallback(() => {
    setError("");
    setFieldErrors({});
  }, [setError, setFieldErrors]);

  const clearFieldError = useCallback(
    (field: string) => setFieldErrors((prev) => clearFieldErrorFrom(field, prev)),
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
    const normalized = email.trim();
    router.push(normalized ? `/forgot-password?email=${encodeURIComponent(normalized)}` : "/forgot-password");
  }, [email, router]);

  const handleBack = useCallback(() => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setOwnerRole(null);
    resetErrors();
  }, [setStep, setPassword, setConfirmPassword, setFirstName, setLastName, setOwnerRole, resetErrors]);

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
