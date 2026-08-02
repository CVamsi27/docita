import { Building2, Check, FileCheck2, KeyRound, UserCheck, type LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import type { AuthBrandingStep } from "../types/auth";
import { LoginDailyThought } from "./LoginDailyThought";
import { AUTH_ASSURANCE_ITEMS } from "../lib/auth-assurance-items";

export interface SetupStep {
  icon: LucideIcon;
  title: string;
  description: string;
  authSteps: readonly AuthBrandingStep[];
}

export const setupSteps: readonly SetupStep[] = [
  {
    icon: FileCheck2,
    title: "Set up your account",
    description: "Enter your details or sign in to continue",
    authSteps: [
      "email",
      "login",
      "signup",
      "forgot-password",
      "reset-password",
    ],
  },
  {
    icon: KeyRound,
    title: "Verify access",
    description: "Confirm your email before moving ahead",
    authSteps: ["verify-email", "verify-email-sent"],
  },
  {
    icon: Building2,
    title: "Choose your path",
    description: "Create a new facility or join an existing one",
    authSteps: ["choose-path"],
  },
  {
    icon: UserCheck,
    title: "Complete setup",
    description: "Finish onboarding, team setup, and profile verification",
    authSteps: [
      "onboarding",
      "join-clinic",
      "join-request-status",
      "verify-doctor",
    ],
  },
];

export function AuthBrandingHero({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm font-semibold text-primary">{kicker}</p>
      <h2 className="ui-page-title text-[var(--fs-3xl)] leading-[var(--lh-tight)] xl:text-[var(--fs-4xl)]">
        {title}
      </h2>
      <p className="ui-page-subtitle max-w-md">{description}</p>
    </div>
  );
}

export function AuthBrandingContentCard({
  currentStep: _currentStep,
  isEmailFirst,
  isLogin,
  activeStepIndex,
  progressPct,
}: {
  currentStep: AuthBrandingStep;
  isEmailFirst: boolean;
  isLogin: boolean;
  activeStepIndex: number;
  progressPct: number;
}) {
  return (
    <div className="mt-8 max-w-lg rounded-[var(--radius)] border border-border/70 bg-background/85 p-4 shadow-sm backdrop-blur">
      {isEmailFirst ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Sign in or get started
          </p>
          <p className="pb-2 text-xs text-muted-foreground">
            Enter your work email on the right. We will take you to sign in
            or account creation, then guide you through setup.
          </p>
          <LoginDailyThought />
        </div>
      ) : isLogin ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Sign in
              </p>
              <p className="text-xs text-muted-foreground">
                Use your email and password to continue
              </p>
            </div>
            <span className="badge-info rounded-full border px-2.5 py-1 text-xs font-medium">
              Existing account
            </span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Access your dashboard, appointments, billing, and clinical
              workflows
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              If you forgot your password, choose &ldquo;Forgot password&rdquo; to reset
              it
            </li>
          </ul>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between border-b pb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your setup journey
              </p>
              <p className="text-xs text-muted-foreground">
                {activeStepIndex >= 0
                  ? `Step ${activeStepIndex + 1} of ${setupSteps.length} — keep going`
                  : "Ready to begin"}
              </p>
            </div>
            <span className="badge-info rounded-full border px-2.5 py-1 text-xs font-semibold">
              {activeStepIndex >= 0 ? `${progressPct}% there` : "Start"}
            </span>
          </div>

          <ol className="space-y-1.5">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStepIndex;
              const isComplete =
                activeStepIndex >= 0 && index < activeStepIndex;
              const isUpcoming =
                activeStepIndex >= 0 && index > activeStepIndex;

              return (
                <li
                  key={step.title}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-300",
                    isActive
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : isComplete
                        ? "border-success/20 bg-success/5"
                        : "border-transparent",
                    isUpcoming && "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      isActive
                        ? "border-primary/40 bg-background text-primary"
                        : isComplete
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-border/50 bg-card/50 text-muted-foreground",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          isComplete
                            ? "text-muted-foreground"
                            : "text-foreground",
                        )}
                      >
                        {step.title}
                      </p>
                      {isActive && (
                        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <span className="badge-info shrink-0 rounded-full border px-2 py-0.5 text-[var(--fs-2xs)] font-semibold">
                        Now
                      </span>
                    )}
                    {isComplete && (
                      <span className="shrink-0 text-[var(--fs-2xs)] font-medium text-success">
                        Done
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}

export function AuthBrandingFooter() {
  return (
    <div className="relative z-10 flex flex-wrap gap-4 p-8 text-xs text-muted-foreground xl:p-10">
      {AUTH_ASSURANCE_ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-success" aria-hidden="true" />
            <p className="font-medium leading-5 text-foreground">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}