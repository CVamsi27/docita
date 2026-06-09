"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth";
import { MAIN_APP_URL } from "@/lib/api/api-config";
import { toast } from "sonner";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { ThemeToggle } from "@/components/theme-toggle";
import { InternalLoginHeader } from "./InternalLoginHeader";
import { InternalLoginForm } from "./InternalLoginForm";

function getMainAppLoginUrl() {
  return `${MAIN_APP_URL.replace(/\/$/, "")}/login`;
}

export default function InternalLogin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) =>
      client.post<{
        user?: { id: string; name: string; email: string; role: string; clinicId?: string };
        access_token?: string;
      }>("/auth/login", payload, { skipAuth: true }),
  });

  if (isAuthenticated) {
    router.replace("/dashboard");
    return null;
  }

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await loginMutation.mutateAsync({ email, password });
      if (!data?.user) throw new Error("We could not sign you in. Please try again.");
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
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <InternalLoginHeader />
        <InternalLoginForm onLogin={handleLogin} loading={loading} />
      </div>
    </div>
  );
}
