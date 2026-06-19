import {
  Banknote,
  BookOpen,
  Boxes,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  FileCode2,
  FileInput,
  Files,
  FlaskConical,
  Inbox,
  MessageCircle,
  Pill,
  Receipt,
  ShieldPlus,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  APP_ACCESS_TARGETS,
  type AppAccessTarget,
  Feature,
} from "@workspace/types";

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
    href: "/insurance-claims",
    icon: ShieldPlus,
    label: "Insurance Claims",
    feature: Feature.INSURANCE_BILLING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INSURANCE_CLAIMS,
  },
  {
    // Shown only for clinics with medical coding enabled (R2). Filtering is
    // handled by use-sidebar-sections via feature + accessTarget.
    href: "/coding-queue",
    icon: FileCode2,
    label: "Coding Queue",
    feature: Feature.MEDICAL_CODING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
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
    href: "/vaccines",
    icon: Syringe,
    label: "Vaccines",
    feature: Feature.VACCINE_TRACKING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_VACCINES,
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

export const navItems: NavItem[] = [...TRACK_ITEMS, ...SERVICES_ITEMS];
