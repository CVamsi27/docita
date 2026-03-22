import { Lock, Server, Shield } from "lucide-react";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";

export function AuthBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden p-12 bg-primary">
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl"
        aria-hidden="true"
      />

      <DocitaLogo textClassName="text-primary-foreground" />

      <div className="relative z-10 space-y-4">
        <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
          Modern Healthcare,
          <br />
          Simplified.
        </h2>
        <p className="text-primary-foreground/70 text-lg max-w-sm">
          Manage patients, appointments, prescriptions, and billing — all in one
          place built for Indian clinics.
        </p>

        <svg
          viewBox="0 0 400 80"
          className="w-full mt-8 text-primary-foreground/20"
          aria-hidden="true"
        >
          <polyline
            points="0,40 40,40 60,10 80,70 100,40 140,40 160,20 180,60 200,40 240,40 260,15 280,65 300,40 340,40 360,25 380,55 400,40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
          <Shield className="h-4 w-4" />
          <span>Data Encrypted</span>
        </div>
        <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
          <Lock className="h-4 w-4" />
          <span>HIPAA Ready</span>
        </div>
        <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
          <Server className="h-4 w-4" />
          <span>99.9% Uptime</span>
        </div>
      </div>
    </div>
  );
}
