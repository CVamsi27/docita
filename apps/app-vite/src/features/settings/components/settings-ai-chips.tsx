import { Sparkles } from "lucide-react";
import { Button, MicroLabel } from "@workspace/ui/components";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { AI_FEATURES_ENABLED } from "@/lib/config/ai-features";

export type SettingsAiChipScope =
  | "doctor-profile"
  | "clinic-general"
  | "compliance"
  | "subscription"
  | "notifications";

interface SettingsAiChipsProps {
  scope: SettingsAiChipScope;
  className?: string;
}

const SUGGESTIONS: Record<SettingsAiChipScope, ReadonlyArray<string>> = {
  "doctor-profile": [
    "Add a typed signature",
    "Set your default consultation duration",
    "Complete your medical council registration",
  ],
  "clinic-general": [
    "Set clinic operating hours",
    "Enable patient self-booking",
    "Add a clinic logo for prescriptions",
  ],
  compliance: [
    "Review your DPDP retention policy",
    "Enable audit log exports",
    "Set staff training reminders",
  ],
  subscription: [
    "Estimate next month's invoice",
    "Compare your tier with usage",
    "Add a backup payment method",
  ],
  notifications: [
    "Enable WhatsApp reminders",
    "Configure no-show alerts",
    "Set quiet hours for the clinic",
  ],
};

const SCOPE_LABEL: Record<SettingsAiChipScope, string> = {
  "doctor-profile": "doctor profile",
  "clinic-general": "clinic settings",
  compliance: "compliance",
  subscription: "subscription",
  notifications: "notifications",
};

/**
 * Origin-style AI chip strip surfaced inside settings tabs. Hidden
 * unless the master AI switch is on for the environment. Each chip
 * opens the global Ask AI overlay scoped to the settings tab and
 * pre-loads the suggested prompt.
 */
export function SettingsAiChips({ scope, className }: SettingsAiChipsProps) {
  const { openOverlay } = useAskAi();

  if (!AI_FEATURES_ENABLED) return null;

  const suggestions = SUGGESTIONS[scope];
  const label = SCOPE_LABEL[scope];

  const handleClick = (prompt: string) => {
    openOverlay({
      id: `settings:${scope}`,
      label: `on ${label}`,
      payload: { kind: "settings", scope, prompt },
    });
  };

  return (
    <section
      data-testid={`settings-ai-chips-${scope}`}
      aria-labelledby={`settings-ai-chips-${scope}-label`}
      className={className}
    >
      <MicroLabel id={`settings-ai-chips-${scope}-label`}>
        Suggested by AI
      </MicroLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => handleClick(suggestion)}
            data-testid={`settings-ai-chip-${scope}`}
          >
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            <span className="text-[var(--fs-xs)]">{suggestion}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
