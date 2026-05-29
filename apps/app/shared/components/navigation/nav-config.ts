import {
  Bed,
  Bell,
  Boxes,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  FileInput,
  Files,
  FlaskConical,
  HelpCircle,
  Inbox,
  MessageCircle,
  type LucideIcon,
  Pill,
  Receipt,
  Banknote,
  BookOpen,
  Network,
  Settings2,
  SmilePlus,
  Sparkles,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
} from "lucide-react";
import { APP_ACCESS_TARGETS, type AppAccessTarget, Feature } from "@workspace/types";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  feature?: Feature;
  accessTarget?: AppAccessTarget;
}

export type NavSectionId = "track" | "services";

export interface NavSection {
  id: NavSectionId;
  /** All-caps section label rendered in the sidebar (e.g. "TRACK"). */
  label: string;
  items: NavItem[];
}

const TRACK_ITEMS: NavItem[] = [
  {
    href: "/today",
    icon: CalendarClock,
    label: "Today",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/consultation",
    icon: Stethoscope,
    label: "Consultation",
    accessTarget: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
  },
  {
    href: "/appointments",
    icon: CalendarDays,
    label: "Appointments",
    feature: Feature.CALENDAR_SLOTS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
  },
  {
    href: "/patients",
    icon: Users,
    label: "Patients",
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
  },
  {
    href: "/desk/collect-payment",
    icon: Banknote,
    label: "Payment desk",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DESK_PAYMENT,
  },
  {
    href: "/invoices",
    icon: Receipt,
    label: "Invoices",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
  },
  {
    href: "/daybook",
    icon: BookOpen,
    label: "Daybook",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
  },
  {
    href: "/prescriptions",
    icon: Pill,
    label: "Prescriptions",
    feature: Feature.DIGITAL_PRESCRIPTIONS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
  },
  {
    href: "/lab-tests",
    icon: FlaskConical,
    label: "Lab Tests",
    feature: Feature.LAB_TESTS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_LAB_TESTS,
  },
  {
    href: "/documents",
    icon: Files,
    label: "Documents",
    feature: Feature.DOCUMENT_ARCHIVAL,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
  },
];

const SERVICES_ITEMS: NavItem[] = [
  {
    href: "/whatsapp",
    icon: MessageCircle,
    label: "WhatsApp",
    feature: Feature.WHATSAPP_MESSAGING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_WHATSAPP,
  },
  {
    href: "/inbox",
    icon: Inbox,
    label: "Inbox",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/inventory",
    icon: Boxes,
    label: "Inventory",
    feature: Feature.INVENTORY,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVENTORY,
  },
  {
    href: "/pharmacy",
    icon: Pill,
    label: "Pharmacy",
    feature: Feature.INVENTORY,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVENTORY,
  },
  {
    href: "/vaccines",
    icon: Syringe,
    label: "Vaccines",
    feature: Feature.VACCINE_TRACKING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_VACCINES,
  },
  {
    href: "/referrals",
    icon: Network,
    label: "Referrals",
    feature: Feature.DIGITAL_PRESCRIPTIONS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
  },
  {
    href: "/follow-ups",
    icon: CheckSquare,
    label: "Follow-ups",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/analytics",
    icon: TrendingUp,
    label: "Analytics",
    feature: Feature.BASIC_ANALYTICS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_ANALYTICS,
  },
  {
    href: "/import",
    icon: FileInput,
    label: "Import Data",
    accessTarget: APP_ACCESS_TARGETS.PAGE_IMPORT,
  },
];

export const navSections: NavSection[] = [
  { id: "track", label: "Track", items: TRACK_ITEMS },
  { id: "services", label: "Services", items: SERVICES_ITEMS },
];

/**
 * Flat ordered list of nav items used for back-compat with existing call sites
 * (command palette, customize-sidebar preferences, access checks). Order is
 * preserved as TRACK followed by SERVICES.
 */
export const navItems: NavItem[] = [...TRACK_ITEMS, ...SERVICES_ITEMS];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  icon: Settings2,
  label: "Settings",
  accessTarget: APP_ACCESS_TARGETS.PAGE_SETTINGS,
};

export const HELP_NAV_ITEM: NavItem = {
  href: "/help",
  icon: HelpCircle,
  label: "Help",
};

export const AI_ASSISTANT_NAV_ITEM: NavItem = {
  href: "/ai-assistant",
  icon: Sparkles,
  label: "AI Assistant",
  feature: Feature.AI_PRESCRIPTION_ASSISTANT,
};

export function sidebarNavLinkTestId(href: string): string {
  const slug = href.replace(/^\//, "").replace(/\//g, "-");
  return `sidebar-link-${slug}`;
}

export const FIXED_NAV_HREFS = new Set([
  "/today",
  "/appointments",
  "/settings",
  "/invoices",
  "/desk/collect-payment",
]);

export const mobileOnlyNavItems: NavItem[] = [
  {
    href: "/settings?tab=notifications",
    icon: Bell,
    label: "Notifications",
  },
];

export const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Smile: SmilePlus,
};

export const SPECIALTY_URLS: Record<string, string> = {
  "dental-chart": "/specialty/dental-charts",
};

export const IPD_NAV_ITEM: NavItem = {
  href: "/hospital/beds",
  icon: Bed,
  label: "Bed Management",
  accessTarget: APP_ACCESS_TARGETS.PAGE_HOSPITAL,
};
