import {
  Activity,
  Baby,
  BarChart3,
  Bed,
  Bell,
  Calendar,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  Home,
  type LucideIcon,
  Package,
  Pill,
  Receipt,
  Settings,
  SmilePlus,
  Stethoscope,
  Upload,
  Users,
} from "lucide-react";
import { Feature } from "@workspace/types";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  feature?: Feature;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  {
    href: "/patients",
    icon: Users,
    label: "Patients",
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  {
    href: "/appointments",
    icon: Calendar,
    label: "Appointments",
    feature: Feature.CALENDAR_SLOTS,
  },
  { href: "/consultation", icon: Stethoscope, label: "Consultation" },
  {
    href: "/prescriptions",
    icon: Pill,
    label: "Prescriptions",
    feature: Feature.DIGITAL_PRESCRIPTIONS,
  },
  {
    href: "/lab-tests",
    icon: FlaskConical,
    label: "Lab Tests",
    feature: Feature.LAB_TESTS,
  },
  {
    href: "/invoices",
    icon: Receipt,
    label: "Invoices",
    feature: Feature.INVOICING,
  },
  {
    href: "/inventory",
    icon: Package,
    label: "Inventory",
    feature: Feature.INVENTORY,
  },
  {
    href: "/documents",
    icon: FileText,
    label: "Documents",
    feature: Feature.DOCUMENT_ARCHIVAL,
  },
  {
    href: "/analytics",
    icon: BarChart3,
    label: "Analytics",
    feature: Feature.BASIC_ANALYTICS,
  },
  {
    href: "/coding-queue",
    icon: FileText,
    label: "Coding Queue",
    feature: Feature.MEDICAL_CODING,
  },
  { href: "/import", icon: Upload, label: "Import Data" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// Items that are always shown and cannot be hidden by admins
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
  feature: undefined,
};
