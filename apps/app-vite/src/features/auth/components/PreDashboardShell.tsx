import { useEffect } from "react";
import { useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { ThemeToggleWithAppearanceSync } from "@/components/layout/theme-toggle-with-appearance-sync";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { cn } from "@workspace/ui/lib/utils";
import { SUPPORT_WHATSAPP_MESSAGE_DEFAULT, SUPPORT_WHATSAPP_MESSAGE_ONBOARDING } from "@/lib/constants/support-contact";
import { AuthBrandingPanel } from "./AuthBrandingPanel";
import { AuthPreDashboardFooter } from "./AuthPreDashboardFooter";
import { useAuth } from "@/lib/auth/auth-context";
import type { AuthBrandingStep } from "../types/auth";

const STEP_META: Record<AuthBrandingStep, { index: number; label: string }> = {
  email: { index: 0, label: "Account setup" },
  login: { index: 0, label: "Account setup" },
  signup: { index: 0, label: "Account setup" },
  "forgot-password": { index: 0, label: "Account setup" },
  "reset-password": { index: 0, label: "Account setup" },
  "verify-email-sent": { index: 1, label: "Email verification" },
  "verify-email": { index: 1, label: "Email verification" },
  "choose-path": { index: 2, label: "Choose your path" },
  onboarding: { index: 3, label: "Facility setup" },
  "join-clinic": { index: 3, label: "Facility setup" },
  "join-request-status": { index: 3, label: "Facility setup" },
  "verify-doctor": { index: 3, label: "Profile verification" },
};

const TOTAL_STEPS = 4;
const EMAIL_VERIFICATION_GATE_STEPS = new Set<AuthBrandingStep>([
  "choose-path",
  "onboarding",
  "join-clinic",
  "join-request-status",
  "verify-doctor",
]);

interface PreDashboardShellProps {
  currentStep: AuthBrandingStep;
  children: React.ReactNode;
  contentMaxWidth?: string;
  contentAlignment?: "center" | "start";
  showSignOut?: boolean;
  showBrandingPanel?: boolean;
  showProgress?: boolean;
  supportWhatsappMessage?: string;
}

export function PreDashboardShell({
  currentStep,
  children,
  contentMaxWidth = "max-w-md",
  contentAlignment = "center",
  showSignOut = false,
  showBrandingPanel = true,
  showProgress = true,
  supportWhatsappMessage,
}: PreDashboardShellProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const meta = STEP_META[currentStep];
  const stepNumber = meta.index + 1;
  const footerWhatsappMessage =
    supportWhatsappMessage ??
    (currentStep === "onboarding"
      ? SUPPORT_WHATSAPP_MESSAGE_ONBOARDING
      : SUPPORT_WHATSAPP_MESSAGE_DEFAULT);

  useEffect(() => {
    if (
      user?.emailVerified === false &&
      EMAIL_VERIFICATION_GATE_STEPS.has(currentStep)
    ) {
      navigate("/verify-email-sent", { replace: true });
    }
  }, [currentStep, navigate, user?.emailVerified]);

  return (
    <div
      className={cn(
        "grid h-screen grid-cols-1 overflow-hidden bg-background",
        showBrandingPanel && "lg:grid-cols-[40%_60%]",
      )}
    >
      {showBrandingPanel ? (
        <AuthBrandingPanel currentStep={currentStep} />
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, color-mix(in oklch, var(--primary) 7%, transparent) 0%, transparent 70%)",
          }}
        />

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/40 bg-background/75 px-4 pt-4 pb-3 backdrop-blur-md sm:px-6">
          <div className={cn(showBrandingPanel ? "lg:hidden" : "")}>
            <DocitaLogo className="h-8 w-auto" />
          </div>

          <div className="flex items-center gap-2">
            {showSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void logout()}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign out
              </Button>
            )}
            <LocaleSwitcher />
            <ThemeToggleWithAppearanceSync />
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
            <div
              className={cn(
                "w-full min-w-0 flex flex-col gap-6",
                contentMaxWidth,
                contentAlignment === "start" && "self-start pt-1",
              )}
            >
              {showProgress ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {meta.label}
                    </p>
                    <p className="text-[var(--fs-2xs)] font-medium text-muted-foreground">
                      <span className="text-foreground">{stepNumber}</span> /{" "}
                      {TOTAL_STEPS}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors duration-500",
                          i < meta.index
                            ? "bg-success"
                            : i === meta.index
                              ? "bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
                              : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {children}
            </div>
          </main>

          <AuthPreDashboardFooter
            data-testid="auth-pre-dashboard-footer"
            className={cn("mx-auto shrink-0 px-4 pb-6", contentMaxWidth)}
            whatsappMessage={footerWhatsappMessage}
            trustRowClassName={showBrandingPanel ? "lg:hidden" : undefined}
          />
        </div>
      </div>
    </div>
  );
}