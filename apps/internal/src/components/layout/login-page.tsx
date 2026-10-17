import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  loginSchema,
  loginWireResponseSchema,
  type LoginInput,
} from "@workspace/types";
import { useAuth } from "@/lib/auth/auth";
import { getMainAppLoginUrl } from "@/lib/auth/use-auth-session";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { InternalLoginHeader } from "./internal-login-header";
import { InternalLoginForm } from "./internal-login-form";
import { InternalLoginGreeting } from "./internal-login-greeting";
import { PageMeta } from "./page-meta";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const loginMutation = useMutation({
    mutationFn: async (payload: LoginInput) =>
      loginWireResponseSchema.parse(
        await client.post("/auth/login", loginSchema.parse(payload), {
          skipAuth: true,
        }),
      ),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (credentials: LoginInput) => {
    setLoading(true);
    try {
      const data = await loginMutation.mutateAsync(credentials);
      if ("mfa_required" in data) {
        // The API issues no session for an MFA challenge, so the sign-in
        // cannot complete here. Saying "check your details" would send staff
        // round the password loop for a credential that was right.
        throw new Error(
          "This account needs two-factor authentication, which the console cannot complete yet. Ask an administrator for help signing in.",
        );
      }
      if (data.user.role !== "INTERNAL") {
        window.location.replace(getMainAppLoginUrl());
        return;
      }
      login(data.access_token, {
        ...data.user,
        clinicId: data.user.clinicId ?? undefined,
      });
      toast.success("Login successful");
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not sign you in. Please check your details and try again.",
        "auth",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Admin Login" />
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <InternalLoginGreeting />
          <InternalLoginHeader />
          <InternalLoginForm onLogin={handleLogin} loading={loading} />
        </div>
      </div>
    </>
  );
}
