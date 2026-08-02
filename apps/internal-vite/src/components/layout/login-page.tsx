import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth, type InternalUser } from "@/lib/auth/auth";
import { getMainAppLoginUrl } from "@/lib/auth/use-auth-session";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { InternalLoginHeader } from "./internal-login-header";
import { InternalLoginForm } from "./internal-login-form";
import { PageMeta } from "./page-meta";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) =>
      client.post<{
        user?: InternalUser;
        access_token?: string;
      }>("/auth/login", payload, { skipAuth: true }),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await loginMutation.mutateAsync({ email, password });
      if (!data?.user)
        throw new Error("We could not sign you in. Please try again.");
      if (data.user.role !== "INTERNAL") {
        window.location.replace(getMainAppLoginUrl());
        return;
      }
      login(data.access_token ?? null, data.user);
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
        <div className="w-full max-w-md space-y-6">
          <InternalLoginHeader />
          <InternalLoginForm onLogin={handleLogin} loading={loading} />
        </div>
      </div>
    </>
  );
}
