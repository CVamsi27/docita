import { Lock, Server, Shield } from "lucide-react";
import {
  DocitaIconMonochrome,
  DocitaLogo,
} from "@workspace/ui/components/docita-logo";

export function AuthBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden p-12 bg-primary">
      <DocitaLogo
        iconClassName="h-8 w-8"
        textClassName="h-8 w-28"
        className="gap-2.5"
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

        <div className="relative mt-8 h-32 rounded-3xl border border-primary-foreground/10 bg-primary-foreground/5">
          <div className="absolute inset-x-5 bottom-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-primary-foreground/8 px-4 py-3">
            <DocitaIconMonochrome className="h-8 w-8 shrink-0 text-primary-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-semibold tracking-tight text-primary-foreground">
                Docita for modern clinics
              </p>
              <p className="text-xs text-primary-foreground/70">
                Simple, clear clinic operations from one modern workspace.
              </p>
            </div>
          </div>
        </div>
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
