import {
  Activity,
  Baby,
  Bed,
  Bell,
  Boxes,
  CalendarDays,
  ClipboardList,
  Eye,
  FileInput,
  Files,
  FlaskConical,
  Heart,
  LayoutDashboard,
  type LucideIcon,
  MessageCircle,
  Pill,
  Receipt,
  Settings2,
  SmilePlus,
  Stethoscope,
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

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD,
  },
  {
    href: "/patients",
    icon: Users,
    label: "Patients",
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
    accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS,
  },
  {
    href: "/appointments",
    icon: CalendarDays,
    label: "Appointments",
    feature: Feature.CALENDAR_SLOTS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS,
  },
  {
    href: "/consultation",
    icon: Stethoscope,
    label: "Consultation",
    accessTarget: APP_ACCESS_TARGETS.PAGE_CONSULTATION,
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
    href: "/invoices",
    icon: Receipt,
    label: "Invoices",
    feature: Feature.INVOICING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVOICES,
  },
  {
    href: "/inventory",
    icon: Boxes,
    label: "Inventory",
    feature: Feature.INVENTORY,
    accessTarget: APP_ACCESS_TARGETS.PAGE_INVENTORY,
  },
  {
    href: "/documents",
    icon: Files,
    label: "Documents",
    feature: Feature.DOCUMENT_ARCHIVAL,
    accessTarget: APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
  },
  {
    href: "/analytics",
    icon: TrendingUp,
    label: "Analytics",
    feature: Feature.BASIC_ANALYTICS,
    accessTarget: APP_ACCESS_TARGETS.PAGE_ANALYTICS,
  },
  {
    href: "/coding-queue",
    icon: ClipboardList,
    label: "Coding Queue",
    feature: Feature.MEDICAL_CODING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
  },
  {
    href: "/import",
    icon: FileInput,
    label: "Import Data",
    accessTarget: APP_ACCESS_TARGETS.PAGE_IMPORT,
  },
  {
    href: "/whatsapp",
    icon: MessageCircle,
    label: "WhatsApp Inbox",
    feature: Feature.WHATSAPP_MESSAGING,
    accessTarget: APP_ACCESS_TARGETS.PAGE_WHATSAPP,
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  icon: Settings2,
  label: "Settings",
  accessTarget: APP_ACCESS_TARGETS.PAGE_SETTINGS,
};

export const FIXED_NAV_HREFS = new Set(["/dashboard", "/settings"]);

export const mobileOnlyNavItems: NavItem[] = [
  {
    href: "/settings?tab=notification-feed",
    icon: Bell,
    label: "Notifications",
  },
];

export const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Smile: SmilePlus,
  Baby: Baby,
  Heart: Heart,
  Eye: Eye,
  Brain: Activity,
};

export const SPECIALTY_URLS: Record<string, string> = {
  "dental-chart": "/specialty/dental-charts",
  "growth-chart": "/specialty/growth-charts",
  "vision-exam": "/specialty/vision-tests",
  "ecg-monitoring": "/specialty/ecg-monitoring",
  "prenatal-care": "/specialty/prenatal-care",
  "mental-health": "/specialty/mental-health",
};

export const IPD_NAV_ITEM: NavItem = {
  href: "/hospital/beds",
  icon: Bed,
  label: "Bed Management",
  accessTarget: APP_ACCESS_TARGETS.PAGE_HOSPITAL,
};
