export interface TourStep {
  id: string;
  /** CSS selector for the element to spotlight. Omit for a centered card. */
  targetSelector?: string;
  title: string;
  body: string;
}

/**
 * The welcome tour: a short, skippable sequence shown once to a freshly
 * onboarded clinic admin on `/today`. Targets carry stable `data-tour-id`
 * attributes (see the sidebar nav + the getting-started checklist); if a
 * target never mounts the overlay falls back to a centered card.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Docita 👋",
    body: "Your clinic is set up. Here's a quick tour of where everything lives — it takes less than a minute.",
  },
  {
    id: "patients",
    targetSelector: '[data-tour-id="nav-patients"]',
    title: "Patients",
    body: "Register and manage patient records here. Start by adding your first patient.",
  },
  {
    id: "appointments",
    targetSelector: '[data-tour-id="nav-appointments"]',
    title: "Appointments",
    body: "Book visits, manage your schedule, and check patients in from this section.",
  },
  {
    id: "checklist",
    targetSelector: '[data-tour-id="getting-started-checklist"]',
    title: "Track your progress",
    body: "Use this getting-started checklist to finish setting up. You can dismiss it anytime once you're done.",
  },
] as const;
