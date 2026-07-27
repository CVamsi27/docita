"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePartnerMe } from "@workspace/data-access";
import { usePartnerAuth } from "../hooks/use-partner-auth";

/**
 * The signed-in partner shell. Verifies the access token is
 * still valid (and silently refreshes if not), surfaces the
 * Docita brand + the partner's name in the top bar, and renders
 * a minimal sidebar with the four portal sections.
 */
export function PartnerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = usePartnerAuth();
  const ctx = auth.buildContext();

  useEffect(() => {
    if (!auth.signedIn) {
      router.replace("/partner/login");
    }
  }, [auth.signedIn, router]);

  // Background refresh on shell mount so the access token is fresh
  // for the duration of a typical browsing session.
  useEffect(() => {
    void auth.refresh();
    const id = setInterval(() => {
      void auth.refresh();
    }, 14 * 60 * 1000);
    return () => clearInterval(id);
    // auth.refresh is stable (closure over state setters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const me = usePartnerMe(
    auth.signedIn ? ctx.accessToken : null,
    ctx.baseUrl,
  );

  if (!auth.signedIn) {
    return null;
  }

  const nav: Array<{ href: string; label: string }> = [
    { href: "/partner/dashboard", label: "Dashboard" },
    { href: "/partner/share", label: "Share kit" },
    { href: "/partner/payouts", label: "Payouts" },
    { href: "/partner/referrals", label: "Referrals" },
    { href: "/partner/banking", label: "Banking" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">Docita Partner</span>
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
          <button
            type="button"
            onClick={() => {
              auth.signOut();
              router.replace("/partner/login");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
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
                  href={item.href}
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
