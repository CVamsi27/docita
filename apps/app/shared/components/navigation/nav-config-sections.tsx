import {
  Banknote,
  BarChart3,
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
  /**
   * Phase 6.3: optional i18n key (Nav namespace). When set, sidebar
   * consumers should resolve the visible label through t(Nav.key) at
   * render time. The `label` field remains as the English fallback
   * for any code path that renders without the IntlProvider.
   */
  labelKey?: string;
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
    labelKey: "today",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/consultation",
    icon: Stethoscope,
    label: "Consultation",
    labelKey: "consultation",
    accessTarget: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
  },
  {
    href: "/appointments",
    icon: CalendarDays,
    label: "Appointments",
    labelKey: "appointments",
    feature: Feature.CALENDAR_SLOTS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
  },
  {
    href: "/patients",
    icon: Users,
    label: "Patients",
    labelKey: "patients",
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
  },
  {
    href: "/desk/collect-payment",
    icon: Banknote,
    label: "Payment desk",
    labelKey: "paymentDesk",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DESK_PAYMENT,
  },
  {
    href: "/invoices",
    icon: Receipt,
    label: "Invoices",
    labelKey: "invoices",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
  },
  {
    href: "/daybook",
    icon: BookOpen,
    label: "Daybook",
    labelKey: "daybook",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
  },
  {
    href: "/insurance-claims",
    icon: ShieldPlus,
    label: "Insurance Claims",
    labelKey: "insuranceClaims",
    feature: Feature.INSURANCE_BILLING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INSURANCE_CLAIMS,
  },
  {
    // Shown only for clinics with medical coding enabled (R2). Filtering is
    // handled by use-sidebar-sections via feature + accessTarget.
    href: "/coding-queue",
    icon: FileCode2,
    label: "Coding Queue",
    labelKey: "codingQueue",
    feature: Feature.MEDICAL_CODING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
  },
  {
    href: "/prescriptions",
    icon: Pill,
    label: "Prescriptions",
    labelKey: "prescriptions",
    feature: Feature.DIGITAL_PRESCRIPTIONS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
  },
  {
    href: "/lab-tests",
    icon: FlaskConical,
    label: "Lab Tests",
    labelKey: "labTests",
    feature: Feature.LAB_TESTS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_LAB_TESTS,
  },
  {
    href: "/documents",
    icon: Files,
    label: "Documents",
    labelKey: "documents",
    feature: Feature.DOCUMENT_ARCHIVAL,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
  },
];

const SERVICES_ITEMS: NavItem[] = [
  {
    href: "/whatsapp",
    icon: MessageCircle,
    label: "WhatsApp",
    labelKey: "whatsapp",
    feature: Feature.WHATSAPP_MESSAGING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_WHATSAPP,
  },
  {
    href: "/inbox",
    icon: Inbox,
    label: "Inbox",
    labelKey: "inbox",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/inventory",
    icon: Boxes,
    label: "Inventory",
    labelKey: "inventory",
    feature: Feature.INVENTORY,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVENTORY,
  },
  {
    href: "/follow-ups",
    icon: CheckSquare,
    label: "Follow-ups",
    labelKey: "followUps",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/analytics",
    icon: TrendingUp,
    label: "Analytics",
    labelKey: "analytics",
    feature: Feature.BASIC_ANALYTICS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_ANALYTICS,
  },
  {
    href: "/reports",
    icon: BarChart3,
    label: "Reports",
    labelKey: "reports",
    feature: Feature.BASIC_ANALYTICS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_REPORTS,
  },
  {
    href: "/import",
    icon: FileInput,
    label: "Import Data",
    labelKey: "importData",
    accessTarget: APP_ACCESS_TARGETS.PAGE_IMPORT,
  },
];

export const navSections: NavSection[] = [
  { id: "track", label: "Track", items: TRACK_ITEMS },
  { id: "services", label: "Services", items: SERVICES_ITEMS },
];

export const navItems: NavItem[] = [...TRACK_ITEMS, ...SERVICES_ITEMS];
