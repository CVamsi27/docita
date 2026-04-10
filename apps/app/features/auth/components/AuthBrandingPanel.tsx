import {
  Building2,
  CalendarCheck,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { DocitaIcon } from "@workspace/ui/components/docita-logo";

const setupSteps = [
  {
    icon: KeyRound,
    title: "Verify access",
    description: "Confirm the email that protects your workspace.",
  },
  {
    icon: Building2,
    title: "Choose your path",
    description: "Create a clinic or request access to an existing one.",
  },
  {
    icon: CalendarCheck,
    title: "Start the day",
    description: "Open appointments, patients, prescriptions, and billing.",
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

export function AuthBrandingPanel() {
  return (
    <aside
      className="relative hidden min-h-screen overflow-hidden border-r bg-card lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
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
        <div className="max-w-xl space-y-5">
          <p className="text-sm font-medium text-primary">Account setup</p>
          <h2 className="text-5xl font-bold leading-[1.05] text-foreground">
            One secure start for every clinic workflow.
          </h2>
          <p className="max-w-md text-base leading-7 text-muted-foreground">
            Verify your account, choose how you work with a clinic, and continue
            into a workspace built for daily care.
          </p>
        </div>

        <div className="mt-10 max-w-lg rounded-lg border bg-background/85 p-4 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Setup rhythm
              </p>
              <p className="text-xs text-muted-foreground">
                Clear steps before patient work begins.
              </p>
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              Guided
            </span>
          </div>

          <ol className="space-y-3">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <li key={step.title} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-card text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {step.description}
                    </p>
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
