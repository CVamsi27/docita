import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { formatLoginLockoutMessage } from "@/lib/auth/auth-lockout";
import type { AuthStep, FieldErrors } from "../types/auth";
import { getAuthenticatedLandingPath } from "../lib/auth-landing-path";
import { computeAuthPageLayout } from "./auth-page-container-helpers";
import { useAuthFormHandlers } from "./use-auth-form-handlers";
import { useAuthFormSubmissions } from "./use-auth-form-submissions";

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
  });

  return {
    step, email, password, confirmPassword, firstName, lastName, ownerRole,
    showPassword, error, fieldErrors, loading, isRedirecting,
    isLoginLocked, lockoutMessage, contentAlignment, contentMaxWidth, copyAlignment,
    setEmail, setPassword, setShowPassword, setFirstName, setLastName,
    ...handlers,
    ...submissions,
  };
}