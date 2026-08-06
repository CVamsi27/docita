import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { formatLoginLockoutMessage } from "@/lib/auth/auth-lockout";
import type { AuthStep, FieldErrors } from "../types/auth";
import { getAuthenticatedLandingPath } from "../lib/auth-landing-path";
import { computeAuthPageLayout } from "./auth-page-container-helpers";
import { useAuthFormHandlers } from "./use-auth-form-handlers";
import { useAuthFormSubmissions } from "./use-auth-form-submissions";

// Rendered only when VITE_TURNSTILE_SITE_KEY is configured (P5.17); the
// backend enforces the token only when TURNSTILE_SECRET_KEY is set.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;

export function useAuthPageContainer() {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ownerRole, setOwnerRole] = useState<"ADMIN" | "ADMIN_DOCTOR" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const navigate = useNavigate();
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
    if (!isAuthenticated || !user) return;
    setIsRedirecting(true);
    navigate(getAuthenticatedLandingPath(user), { replace: true });
  }, [isAuthenticated, navigate, user]);

  // A Turnstile token is single-use for the step it was issued on; clear it
  // (and any verification error) whenever the user moves between steps.
  useEffect(() => {
    setTurnstileToken(null);
    setTurnstileError(null);
  }, [step]);

  const lockoutMessage = isLoginLocked
    ? formatLoginLockoutMessage(loginLockoutUntil ?? 0)
    : "";
  const { contentAlignment, contentMaxWidth, copyAlignment } =
    computeAuthPageLayout(step);

  const handlers = useAuthFormHandlers({
    email, setOwnerRole, setFirstName, setLastName,
    setPassword, setConfirmPassword, setError, setFieldErrors, setStep,
  });

  const submissions = useAuthFormSubmissions({
    email, setEmail, password, confirmPassword, firstName, lastName, ownerRole,
    setError, setFieldErrors, setLoading, setStep,
    checkEmail, login, register,
    siteKey: TURNSTILE_SITE_KEY ?? "",
    turnstileToken,
    setTurnstileToken,
    setTurnstileError,
  });

  return {
    step, email, password, confirmPassword, firstName, lastName, ownerRole,
    showPassword, error, fieldErrors, loading, isRedirecting,
    isLoginLocked, lockoutMessage, contentAlignment, contentMaxWidth, copyAlignment,
    siteKey: TURNSTILE_SITE_KEY ?? "",
    turnstileToken, turnstileError,
    setTurnstileToken, setTurnstileError,
    setEmail, setPassword, setShowPassword, setFirstName, setLastName,
    ...handlers,
    ...submissions,
  };
}