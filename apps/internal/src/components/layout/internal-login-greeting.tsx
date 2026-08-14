import { DaypartGreetingHero } from "@workspace/ui/components/data-display/daypart-greeting-hero";

/**
 * Serif front-door greeting for the internal admin login.
 *
 * Mirrors the clinician app's auth branding hero (daypart greeting + live
 * clock eyebrow + serif type) so both apps share the same signature moment.
 * The internal console is ops-only (English), so the copy is hardcoded here
 * instead of pulling in the clinician app's i18n runtime.
 */
export function InternalLoginGreeting() {
  return (
    <DaypartGreetingHero
      greetings={{
        morning: "Good morning",
        afternoon: "Good afternoon",
        evening: "Good evening",
      }}
      eyebrow="Today"
      description="Sign in to manage clinics, users, billing, and platform operations."
      timeLocale="en-IN"
      align="center"
    />
  );
}
