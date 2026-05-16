"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, Shield } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ThemeToggleWithAppearanceSync } from "@/features/_shared/components/layout/theme-toggle-with-appearance-sync";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";
import { cn } from "@workspace/ui/lib/utils";
import { SupportContact } from "@/components/common/support-contact";
import {
  SUPPORT_WHATSAPP_MESSAGE_DEFAULT,
  SUPPORT_WHATSAPP_MESSAGE_ONBOARDING,
} from "@/lib/support-contact";
import { AuthBrandingPanel } from "./AuthBrandingPanel";
import { useAuth } from "@/lib/auth-context";
import type { AuthBrandingStep } from "@/features/auth/types/auth";

// Derives the user's position in the 4-step pre-dashboard journey
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
  /** Tailwind max-width class for the content container. Default: "max-w-md" */
  contentMaxWidth?: string;
  /** Align the main content vertically within the scroll area. Default: center */
  contentAlignment?: "center" | "start";
  /** Show sign-out button in the top-right corner */
  showSignOut?: boolean;
  /**
   * When false, the left branding rail is omitted (e.g. email-first step before
   * we know login vs signup). Defaults to true for all other pre-dashboard pages.
   */
  showBrandingPanel?: boolean;
  /**
   * When false, hides the step meta + progress bar (useful for the initial email
   * step and existing-account login step).
   */
  showProgress?: boolean;
  /**
   * Overrides the footer WhatsApp prefilled text. When omitted, `currentStep === "onboarding"`
   * uses the onboarding template; all other steps use the generic default.
   */
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
  const router = useRouter();
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
      router.replace("/verify-email-sent");
    }
  }, [currentStep, router, user?.emailVerified]);

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

      {/* Right panel keeps its own scroll so the branding rail stays fixed */}
      <div className="relative flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden">
        {/* Sticky top bar — stays visible while scrolling */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-background/80 backdrop-blur-sm">
          <div className={cn(showBrandingPanel ? "lg:hidden" : "")}>
            <DocitaLogo />
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
            <ThemeToggleWithAppearanceSync />
          </div>
        </div>

        {/* Scrollable content area — my-auto centers when short, collapses to top when tall */}
        <div className="flex-1 relative z-10 flex min-w-0 flex-col items-center px-4 pb-10">
          <div
            className={cn(
              "w-full min-w-0 flex flex-col gap-5 py-4",
              contentMaxWidth,
              contentAlignment === "center" ? "my-auto" : "pt-4",
            )}
          >
            {showProgress ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                    {meta.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stepNumber} / {TOTAL_STEPS}
                  </p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                      key={i}
                      className={[
                        "h-1 flex-1 rounded-full transition-colors duration-500",
                        i < meta.index
                          ? "bg-success"
                          : i === meta.index
                            ? "bg-primary"
                            : "bg-muted",
                      ].join(" ")}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {children}
          </div>
          <div className="flex justify-center gap-6 px-4 pb-2 text-xs text-muted-foreground lg:hidden">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 shrink-0" aria-hidden />
              Data Encrypted
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" aria-hidden />
              Privacy Controls
            </span>
          </div>
          <div className="w-full max-w-2xl px-4 pb-6">
            <SupportContact
              layout="stack"
              variant="footer"
              className="w-full"
              whatsappMessage={footerWhatsappMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
