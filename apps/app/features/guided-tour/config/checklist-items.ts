export interface ChecklistItemDef {
  /** Stable id; also the key into the live-signal map (see use-checklist-signals). */
  id: string;
  label: string;
  description: string;
  href: string;
}

/**
 * Getting-started milestones. Completion is DERIVED from live data signals
 * (never stored) — see `useChecklistSignals`. Deep links use confirmed route
 * bases; refine sub-routes (team invite, profile) when those settle.
 */
export const CHECKLIST_ITEMS: readonly ChecklistItemDef[] = [
  {
    id: "add-patient",
    label: "Add your first patient",
    description: "Create a patient record to get started.",
    href: "/patients",
  },
  {
    id: "book-appointment",
    label: "Book your first appointment",
    description: "Schedule a visit and build out your day.",
    href: "/appointments",
  },
  {
    id: "invite-team",
    label: "Invite a team member",
    description: "Add a doctor or front-desk staff to your clinic.",
    href: "/settings",
  },
  {
    id: "complete-profile",
    label: "Complete your clinic profile",
    description: "Add your clinic logo and branding.",
    href: "/settings",
  },
] as const;
