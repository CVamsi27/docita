import {
  Building2,
  Check,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { DocitaIcon } from "@workspace/ui/components/docita-logo";
import { cn } from "@workspace/ui/lib/utils";
import type { AuthBrandingStep } from "@/features/auth/types/auth";

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
    description: "Enter your details or sign in to continue.",
    authSteps: ["email", "login", "signup", "forgot-password", "reset-password"],
  },
  {
    icon: KeyRound,
    title: "Verify access",
    description: "Confirm your email before moving ahead.",
    authSteps: ["verify-email", "verify-email-sent"],
  },
  {
    icon: Building2,
    title: "Choose your path",
    description: "Create a new clinic or join an existing one.",
    authSteps: ["choose-path"],
  },
  {
    icon: UserCheck,
    title: "Complete setup",
    description: "Finish onboarding, team setup, and profile verification.",
    authSteps: ["onboarding", "join-clinic", "join-request-status", "verify-doctor"],
  },
  {
    icon: LayoutDashboard,
    title: "Start the day",
    description: "Open appointments, patients, prescriptions, and billing.",
    authSteps: [],
  },
];

const assuranceItems = [
  {
    icon: ShieldCheck,
    label: "Encrypted sessions",
  },
  {
    icon: FileCheck2,
    label: "Audit-ready activity",
  },
  {
    icon: Stethoscope,
    label: "Clinic-aware access",
  },
];

export interface AuthBrandingPanelProps {
  currentStep: AuthBrandingStep;
}

export function AuthBrandingPanel({ currentStep }: AuthBrandingPanelProps) {
  const activeStepIndex = setupSteps.findIndex((step) =>
    step.authSteps.includes(currentStep),
  );

  return (
    <aside
      className="relative hidden h-full overflow-hidden border-r bg-card lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
      aria-label="Docita setup overview"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(var(--border) / 0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-success/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between p-10">
        <div className="flex items-center gap-3">
          <DocitaIcon className="h-10 w-10" />
          <span className="text-2xl font-bold text-foreground">docita</span>
        </div>
        <span className="rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          Clinic workspace
        </span>
      </div>

      <div className="relative z-10 px-10">
        <div className="max-w-xl space-y-4">
          <p className="text-sm font-medium text-primary">Getting started</p>
          <h2 className="text-4xl font-bold leading-[1.1] text-foreground">
            Everything in one guided path to your clinic.
          </h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Account setup, email verification, onboarding — each step unlocks the next.
            You only do this once.
          </p>
        </div>

        <div className="mt-8 max-w-lg rounded-lg border bg-background/85 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between border-b pb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Your setup journey
              </p>
              <p className="text-xs text-muted-foreground">
                {activeStepIndex >= 0 ? `Step ${activeStepIndex + 1} of ${setupSteps.length} — keep going` : "Ready to begin"}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {activeStepIndex >= 0 ? `${Math.round(((activeStepIndex) / (setupSteps.length - 1)) * 100)}% there` : "Start"}
            </span>
          </div>

          <ol className="space-y-2">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStepIndex;
              const isComplete =
                activeStepIndex >= 0 && index < activeStepIndex;
              const isUpcoming = activeStepIndex >= 0 && index > activeStepIndex;

              return (
                <li
                  key={step.title}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-2.5 transition-all duration-300",
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
                  <div className="min-w-0 flex items-center gap-2 flex-1">
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-semibold leading-tight",
                        isComplete ? "text-muted-foreground" : "text-foreground",
                      )}>
                        {step.title}
                      </p>
                      {isActive && (
                        <p className="text-xs leading-4 text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                        Now
                      </span>
                    )}
                    {isComplete && (
                      <span className="text-[10px] font-medium text-success shrink-0">
                        Done
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-3 p-10">
        {assuranceItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border bg-background/80 p-3 shadow-sm backdrop-blur"
            >
              <Icon className="mb-3 h-4 w-4 text-success" aria-hidden="true" />
              <p className="text-xs font-medium leading-5 text-foreground">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
