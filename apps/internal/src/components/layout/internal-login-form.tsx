import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@workspace/types";
import { TurnstileWidget } from "@workspace/ui/components/form/turnstile-widget";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@workspace/ui/components";
import { Eye, EyeOff } from "lucide-react";

interface InternalLoginFormProps {
  onLogin: (credentials: LoginInput) => Promise<void>;
  loading: boolean;
}

export function InternalLoginForm({
  onLogin,
  loading,
}: InternalLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [challengeGeneration, setChallengeGeneration] = useState(0);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors: fieldErrors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(null);
  }, []);
  const handleExpire = useCallback(() => setTurnstileToken(null), []);
  const handleSubmit = handleFormSubmit(async (credentials) => {
    if (loading) return;
    if (siteKey && !turnstileToken) {
      setTurnstileError(
        "Please complete the security verification before signing in.",
      );
      return;
    }
    try {
      await onLogin({
        ...credentials,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
    } finally {
      // Verification precedes password validation, so every attempt consumes
      // its proof, including a rejected password or an uncertain network result.
      setTurnstileToken(null);
      setTurnstileError(null);
      setChallengeGeneration((generation) => generation + 1);
    }
  });

  return (
    <Card className="ui-card-surface">
      <CardHeader className="px-6 pb-6 pt-8">
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
              {...register("email", {
                setValueAs: (value: string) => value.trim(),
              })}
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
                {fieldErrors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                {...register("password")}
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
                {fieldErrors.password.message}
              </p>
            )}
          </div>
          <TurnstileWidget
            key={challengeGeneration}
            siteKey={siteKey}
            onToken={handleToken}
            onExpire={handleExpire}
            className="flex w-full justify-center [&_iframe]:max-w-full"
          />
          {turnstileError && (
            <p className="text-sm text-destructive" role="alert">
              {turnstileError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
