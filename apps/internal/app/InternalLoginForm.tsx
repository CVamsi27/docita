"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@workspace/ui/components";
import { Eye, EyeOff } from "lucide-react";

interface InternalLoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  loading: boolean;
}

export function InternalLoginForm({ onLogin, loading }: InternalLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = async (e: React.FormEvent) => {
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

    await onLogin(email, password);
  };

  return (
    <Card className="ui-card-surface">
      <CardHeader className="px-6 pt-8 pb-6">
        <CardTitle className="ui-section-title">Login</CardTitle>
        <CardDescription className="ui-page-subtitle">
          Enter your credentials to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
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
            {loading ? "Logging in…" : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
