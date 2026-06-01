import {
  Building2,
  Check,
  FileCheck2,
  KeyRound,
  UserCheck,
} from "lucide-react";
import { AUTH_ASSURANCE_ITEMS } from "@/features/auth/lib/auth-assurance-items";
import { DocitaIcon } from "@workspace/ui/components/indicators/docita-logo";
import { cn } from "@workspace/ui/lib/utils";
import type { AuthBrandingStep } from "@/features/auth/types/auth";
import { LoginDailyThought } from "@/features/auth/components/LoginDailyThought";

interface SetupStep {
  icon: typeof KeyRound;
  title: string;
  description: string;
  authSteps: readonly AuthBrandingStep[];
}

const setupSteps: readonly SetupStep[] = [
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

export interface AuthBrandingPanelProps {
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

  const heroKicker = isEmailFirst
    ? "Welcome to Docita"
    : isLogin
      ? "Welcome back"
      : "Getting started";
  const heroTitle = isEmailFirst
    ? "Your practice workspace starts here"
    : isLogin
      ? "Pick up where you left off"
      : "Everything in one guided path to your facility";
  const heroDescription = isEmailFirst
    ? "Run appointments, clinical notes, prescriptions, and billing in one secure workspace built for healthcare teams."
    : isLogin
      ? "Sign in to manage appointments, patients, billing, and clinical workflows"
      : "Account setup, email verification, onboarding — each step unlocks the next. You only do this once.";

  const progressPct =
    activeStepIndex >= 0
      ? Math.round((activeStepIndex / (setupSteps.length - 1)) * 100)
      : 0;

  return (
    <aside
      className="relative hidden h-full min-h-0 overflow-hidden border-r border-border/60 bg-card lg:flex lg:flex-col lg:justify-between"
      aria-label="Docita setup overview"
    >
      {/* Brand accent bar — matches the app's guided-flow hero language. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"
      />

      {/* Layered light depth: a faint primary tint + glow over a subtle grid. */}
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
          Facility workspace
        </span>
      </div>

      <div className="relative z-10 px-8 xl:px-10">
        <div className="max-w-xl space-y-4">
          <p className="text-sm font-semibold text-primary">{heroKicker}</p>
          <h2 className="ui-page-title text-[var(--fs-3xl)] leading-[var(--lh-tight)] xl:text-[var(--fs-4xl)]">
            {heroTitle}
          </h2>
          <p className="ui-page-subtitle max-w-md">{heroDescription}</p>
        </div>

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
                  If you forgot your password, choose “Forgot password” to reset
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
      </div>

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
    </aside>
  );
}
