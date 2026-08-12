import { type Dispatch, type SetStateAction, useCallback } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { checkEmailSchema } from "@workspace/types";
import { ApiValidationError } from "@/lib/api/api-error";
import { validateSignupForm } from "./auth-page-container-helpers";

interface UseAuthFormSubmissionsParams {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  ownerRole: "ADMIN" | "ADMIN_DOCTOR" | null;
  setError: Dispatch<SetStateAction<string>>;
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<"email" | "login" | "signup">>;
  checkEmail: (email: string) => Promise<boolean>;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: "ADMIN" | "ADMIN_DOCTOR",
    clinicName?: string,
    turnstileToken?: string,
  ) => Promise<void>;
  siteKey: string;
  turnstileToken: string | null;
  setTurnstileToken: (token: string | null) => void;
  setTurnstileError: (message: string | null) => void;
}

type FieldErrors = Record<string, string>;

function handleCatchError(
  err: unknown,
  fallback: string,
  setError: Dispatch<SetStateAction<string>>,
  setFieldErrors: Dispatch<SetStateAction<FieldErrors>>,
) {
  if (err instanceof ApiValidationError && err.hasFieldErrors) {
    setFieldErrors(err.fieldErrors);
    setError(getUserFacingErrorMessage(err, { fallback, context: "form" }));
    return;
  }
  setError(getUserFacingErrorMessage(err, { fallback, context: "auth" }));
}

export function useAuthFormSubmissions({
  email,
  setEmail,
  password,
  confirmPassword,
  firstName,
  lastName,
  ownerRole,
  setError,
  setFieldErrors,
  setLoading,
  setStep,
  checkEmail,
  login,
  register,
  siteKey,
  turnstileToken,
  setTurnstileToken,
  setTurnstileError,
}: UseAuthFormSubmissionsParams) {
  const requireTurnstile = Boolean(siteKey && !turnstileToken);
  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setFieldErrors({});
      const normalizedEmail = email.trim();
      const validation = checkEmailSchema.safeParse({ email: normalizedEmail });
      if (!validation.success) {
        const emailIssue = validation.error.issues.find(
          (i) => i.path[0] === "email",
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
          setError,
          setFieldErrors,
        );
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      setEmail,
      setError,
      setFieldErrors,
      setLoading,
      setStep,
      checkEmail,
    ],
  );
  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setFieldErrors({});
      if (requireTurnstile) {
        setTurnstileError(
          "Please complete the security verification before signing in.",
        );
        return;
      }
      setLoading(true);
      try {
        await login(email, password, turnstileToken ?? undefined);
      } catch (err) {
        // A failed attempt consumed the Turnstile token (the backend verifies
        // it before validating credentials), so force a fresh challenge on
        // retry instead of replaying an already-used token.
        if (turnstileToken) {
          setTurnstileToken(null);
          setTurnstileError(null);
        }
        handleCatchError(
          err,
          "We could not sign you in right now. Please try again.",
          setError,
          setFieldErrors,
        );
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      password,
      turnstileToken,
      requireTurnstile,
      setTurnstileToken,
      setTurnstileError,
      setError,
      setFieldErrors,
      setLoading,
      login,
    ],
  );
  const handleSignupSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError("");
      setFieldErrors({});
      const nextFieldErrors = validateSignupForm(
        password,
        confirmPassword,
        ownerRole,
      );
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        return;
      }
      if (requireTurnstile) {
        setTurnstileError(
          "Please complete the security verification before creating your account.",
        );
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
          turnstileToken ?? undefined,
        );
      } catch (err) {
        // Same single-use token semantics as login: force a fresh challenge.
        if (turnstileToken) {
          setTurnstileToken(null);
          setTurnstileError(null);
        }
        handleCatchError(
          err,
          "We could not finish creating your account. Please try again.",
          setError,
          setFieldErrors,
        );
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      ownerRole,
      turnstileToken,
      requireTurnstile,
      setTurnstileToken,
      setTurnstileError,
      setError,
      setFieldErrors,
      setLoading,
      register,
    ],
  );
  return { handleEmailSubmit, handleLoginSubmit, handleSignupSubmit };
}