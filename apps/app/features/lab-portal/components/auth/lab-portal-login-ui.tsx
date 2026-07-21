"use client";

// jscpd:ignore-start
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  MicroLabel
} from "@workspace/ui/components";
import { FlaskConical } from "lucide-react";
import { appSession } from "@/lib/auth/session";
import { getAppApiUrl } from "@/lib/api/api-config";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { browserRequest } from "@/lib/auth/browser-request";

export function LabPortalLoginUI() {
// jscpd:ignore-end
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl = getAppApiUrl();
      const res = await browserRequest(`${apiUrl}/v1/lab-portal/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Invalid credentials",
        );
      }

      const data = await res.json();
      appSession.setToken(data.access_token);
      window.location.href = "/lab-portal";
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { fallback: "Login failed", context: "auth" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <MicroLabel className="text-muted-foreground">Lab Portal</MicroLabel>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Lab Technician Login
          </CardTitle>
          <CardDescription>
            Enter your lab credentials to access the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lab-email">Email</Label>
              <Input
                id="lab-email"
                type="email"
                placeholder="lab@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-password">Password</Label>
              <Input
                id="lab-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error ? (
              <p className="text-[var(--fs-xs)] text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
