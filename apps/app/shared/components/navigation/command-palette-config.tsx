import type { ReactNode } from "react";
import {
  Banknote,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  PlusCircle,
  Stethoscope,
} from "lucide-react";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import type {
  UserRole,
  Feature,
  Tier,
} from "@workspace/types";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import type { NavItem } from "./nav-config";

export const COMMAND_PALETTE_GROUP_NAVIGATION = "Navigation";
export const COMMAND_PALETTE_GROUP_ACTIONS = "Actions";
export const COMMAND_PALETTE_GROUP_AI = "AI";

export interface QuickAction {
  id: string;
  label: string;
  href?: string;
  kind?: "navigate" | "start-consultation";
  accessTarget?: (typeof APP_ACCESS_TARGETS)[keyof typeof APP_ACCESS_TARGETS];
  /** Defaults to "write" (create flows); use "read" for navigation-only jumps. */
  accessMode?: "read" | "write";
  keywords?: string[];
  shortcut?: string;
}

export function quickActionRowIcon(action: QuickAction): ReactNode {
  if (action.kind === "start-consultation") {
    return <Stethoscope className="size-4" />;
  }
  if (action.id === "today-schedule") {
    return <CalendarClock className="size-4" />;
  }
  if (action.id === "coding-queue") {
    return <ClipboardList className="size-4" />;
  }
  if (action.id === "follow-ups-board") {
    return <CheckSquare className="size-4" />;
  }
  if (action.id === "payment-desk") {
    return <Banknote className="size-4" />;
  }
  return <PlusCircle className="size-4" />;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "today-schedule",
    label: "Today's schedule",
    href: "/today",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
    accessMode: "read",
    keywords: ["today", "agenda", "day", "schedule"],
    shortcut: "G T",
  },
  {
    id: "new-patient",
    label: "New patient",
    href: "/patients?action=new",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
    keywords: ["create", "add", "register"],
    shortcut: "N P",
  },
  {
    id: "new-appointment",
    label: "New appointment",
    href: "/appointments?action=new",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
    keywords: ["schedule", "book"],
    shortcut: "N A",
  },
  {
    id: "new-invoice",
    label: "New invoice",
    href: "/invoices/new",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
    keywords: ["bill", "create"],
    shortcut: "N I",
  },
  {
    id: "payment-desk",
    label: "Payment desk",
    href: "/desk/collect-payment",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DESK_PAYMENT,
    accessMode: "read",
    keywords: ["payment", "cash", "pos", "upi", "reception", "desk", "pine"],
  },
  {
    id: "coding-queue",
    label: "Coding queue",
    href: "/coding-queue",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
    accessMode: "read",
    keywords: ["medical coding", "claims", "pending", "charts"],
    shortcut: "G Q",
  },
  {
    id: "follow-ups-board",
    label: "Follow-ups",
    href: "/follow-ups",
    kind: "navigate",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
    accessMode: "read",
    keywords: ["tasks", "callbacks", "reminders"],
    shortcut: "G F",
  },
  {
    id: "start-consultation",
    label: "Start consultation",
    kind: "start-consultation",
    keywords: ["queue", "next patient"],
  },
];

type CanAccessFeatureFn = (feature: Feature) => boolean;

export function navItemIsAccessible(
  item: NavItem,
  args: {
    role: UserRole | undefined;
    canAccess: CanAccessFeatureFn;
    currentTier: Tier;
    hasIntelligence: boolean;
  },
): boolean {
  if (item.feature && !args.canAccess(item.feature)) return false;
  if (!item.accessTarget) return true;
  return canAccessTarget(
    item.accessTarget,
    {
      role: args.role,
      canAccessFeature: args.canAccess,
      currentTier: args.currentTier,
      hasIntelligence: args.hasIntelligence,
    },
    "read",
  );
}
