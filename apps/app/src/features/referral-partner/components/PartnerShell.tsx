import { ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@workspace/ui/components/form/button";
import { usePartnerMe } from "@workspace/data-access";
import { usePartnerAuth } from "@/features/referral-partner/hooks/use-partner-auth";

/**
 * The signed-in partner shell. Verifies the access token is
 * still valid (and silently refreshes if not), surfaces the
 * Docita brand + the partner's name in the top bar, and renders
 * a minimal sidebar with the four portal sections.
 */
export function PartnerShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("ReferralPartner");
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();
  // Destructure the stable refresh fn so the effect can depend on the
  // binding (exhaustive-deps tracks the auth object otherwise).
  const { refresh: refreshAccessToken } = auth;

  useEffect(() => {
    if (!auth.signedIn) {
      navigate("/partner/login", { replace: true });
    }
  }, [auth.signedIn, navigate]);

  // Background refresh on shell mount so the access token is fresh
  // for the duration of a typical browsing session. refreshAccessToken has
  // a stable identity (useCallback over the stable React Query mutateAsync).
  useEffect(() => {
    void refreshAccessToken();
    const id = setInterval(() => {
      void refreshAccessToken();
    }, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshAccessToken]);

  const me = usePartnerMe(
    auth.signedIn ? ctx.accessToken : null,
    ctx.baseUrl,
  );

  if (!auth.signedIn) {
    return null;
  }

  const nav: Array<{ href: string; label: string }> = [
    { href: "/partner/dashboard", label: t("shell.dashboard") },
    { href: "/partner/submit-lead", label: t("shell.submitLead") },
    { href: "/partner/submissions", label: t("shell.mySubmissions") },
    { href: "/partner/share", label: t("shell.shareKit") },
    { href: "/partner/payouts", label: t("shell.payouts") },
    { href: "/partner/referrals", label: t("shell.referrals") },
    { href: "/partner/banking", label: t("shell.banking") },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">{t("shell.brandName")}</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {me.data?.name ?? ""}
              {me.data?.code ? (
                <>
                  {" "}
                  · <span className="font-mono">{me.data.code}</span>
                </>
              ) : null}
            </span>
          </div>
          <Button
            variant="link"
            onClick={() => {
              auth.signOut();
              navigate("/partner/login", { replace: true });
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("shell.signOut")}
          </Button>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 sm:block">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={
                    "block rounded-md px-3 py-2 text-sm " +
                    (active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
