import { Lock, Server, Shield } from "lucide-react";
import { DocitaLogo } from "@workspace/ui/components/docita-logo";

export function AuthBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden p-12 bg-primary">
      <DocitaLogo
        tone="dark"
      />

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
