"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";
import { useAuth } from "@/lib/auth";
import { MAIN_APP_URL } from "@/lib/api-config";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { client } from "@/lib/api-client";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

function getMainAppLoginUrl() {
  return `${MAIN_APP_URL.replace(/\/$/, "")}/login`;
}

export default function InternalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) =>
      client.post<{
        user?: {
          id: string;
          name: string;
          email: string;
          role: string;
          clinicId?: string;
        };
        access_token?: string;
      }>("/auth/login", payload, { skipAuth: true }),
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Enter an email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address";
    }

    if (!password.trim()) {
      errors.password = "Enter a password";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const data = await loginMutation.mutateAsync({ email, password });

      if (!data?.user) {
        throw new Error("We could not sign you in. Please try again.");
      }

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
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <SectionHeading
            align="center"
            size="page"
            title="Docita Internal"
            description="Internal Console - Product Owners & System Admins"
          />
        </div>
        <Card className="ui-card-surface">
          <CardHeader className="px-6 pt-8 pb-6">
            <CardTitle className="ui-section-title">Login</CardTitle>
            <CardDescription className="ui-page-subtitle">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "admin-login-email-error" : undefined
                  }
                />
                {fieldErrors.email && (
                  <p
                    id="admin-login-email-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                    className="pr-10"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password
                        ? "admin-login-password-error"
                        : undefined
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
                {fieldErrors.password && (
                  <p
                    id="admin-login-password-error"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
