import { useTranslation } from "react-i18next";
import { DocitaIcon } from "@workspace/ui/components/indicators/docita-logo";
import type { AuthBrandingStep } from "../types/auth";
import { AuthBrandingHero, AuthBrandingContentCard, AuthBrandingFooter } from "./AuthBrandingPanelSections";
import { setupSteps } from "./auth-branding-setup-steps";

interface AuthBrandingPanelProps {
  currentStep: AuthBrandingStep;
}

export function AuthBrandingPanel({ currentStep }: AuthBrandingPanelProps) {
  const activeStepIndex = setupSteps.findIndex((step) =>
    step.authSteps.includes(currentStep),
  );
  const isEmailFirst = currentStep === "email";
  const isLogin = ["login", "forgot-password", "reset-password"].includes(
    currentStep,
  );
  const { t } = useTranslation("Auth");

  const heroKicker = isEmailFirst
    ? t("branding.heroKicker.emailFirst")
    : isLogin
      ? t("branding.heroKicker.welcomeBack")
      : t("branding.heroKicker.gettingStarted");
  const heroTitle = isEmailFirst
    ? t("branding.heroTitle.emailFirst")
    : isLogin
      ? t("branding.heroTitle.welcomeBack")
      : t("branding.heroTitle.gettingStarted");
  const heroDescription = isEmailFirst
    ? t("branding.heroDescription.emailFirst")
    : isLogin
      ? t("branding.heroDescription.welcomeBack")
      : t("branding.heroDescription.gettingStarted");

  const progressPct =
    activeStepIndex >= 0
      ? Math.round((activeStepIndex / (setupSteps.length - 1)) * 100)
      : 0;

  return (
    <aside
      className="relative hidden h-full min-h-0 overflow-hidden border-r border-border/60 bg-card lg:flex lg:flex-col lg:justify-between"
      aria-label={t("branding.ariaLabel")}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(var(--border) / 0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent" />
        <div className="absolute -left-28 -top-28 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between p-8 xl:p-10">
        <div className="flex items-center gap-3">
          <DocitaIcon className="h-10 w-10" />
          <span className="ui-section-title text-[var(--fs-2xl)] text-foreground">
            docita
          </span>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-xs font-semibold tracking-wide text-primary">
          {t("branding.facilityWorkspace")}
        </span>
      </div>

      <div className="relative z-10 px-8 xl:px-10">
        <AuthBrandingHero
          kicker={heroKicker}
          title={heroTitle}
          description={heroDescription}
        />
        <AuthBrandingContentCard
          currentStep={currentStep}
          isEmailFirst={isEmailFirst}
          isLogin={isLogin}
          activeStepIndex={activeStepIndex}
          progressPct={progressPct}
        />
      </div>

      <AuthBrandingFooter />
    </aside>
  );
}