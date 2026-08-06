import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, MicroLabel } from "@workspace/ui/components";
import { FlaskConical } from "lucide-react";
import { appSession } from "@/lib/auth/session";
import { getAppApiUrl } from "@/lib/api/api-config";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { browserRequest } from "@/lib/auth/browser-request";

export function LabPortalLoginUI() {
  const { t } = useTranslation("LabPortal");
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
            : t("invalidCredentials"),
        );
      }

      const data = await res.json();
      appSession.setToken(data.access_token);
      window.location.href = "/lab-portal";
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { fallback: t("loginFailed"), context: "auth" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <MicroLabel className="text-muted-foreground">{t("eyebrow")}</MicroLabel>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {t("loginTitle")}
          </CardTitle>
          <CardDescription>
            {t("loginDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lab-email">{t("email")}</Label>
              <Input
                id="lab-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-password">{t("password")}</Label>
              <Input
                id="lab-password"
                type="password"
                placeholder={t("passwordPlaceholder")}
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
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
