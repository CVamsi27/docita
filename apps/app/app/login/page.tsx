"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred during login";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background px-4">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      <Card className="z-10 w-full max-w-md border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-1 px-8 pt-8 pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <path d="M4.8 2.3A.3.3 0 1 0 4.8.9c-1.8 0-3 1.2-3 3 0 2.2 2.3 4.2 3 5 .7.8 3 2.8 3 5 0 1.8-1.2 3-3 3-.2 0-.3-.1-.3-.3" />
                <path d="M19.2 2.3a.3.3 0 1 1 0-1.4c1.8 0 3 1.2 3 3 0 2.2-2.3 4.2-3 5-.7.8-3 2.8-3 5 0 1.8 1.2 3 3 3 .2 0 .3-.1.3-.3" />
                <path d="M12 2v20" />
                <path d="M22 17a10 10 0 0 1-20 0" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground/80 text-base">
            Sign in to your Docita workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@docita.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  variant="link"
                  className="px-0 h-auto text-xs font-normal"
                  tabIndex={-1}
                  type="button"
                >
                  Forgot password?
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 h-11 bg-background/50"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
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
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
