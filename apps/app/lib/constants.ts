import {
  Baby,
  Bed,
  Brain,
  Calendar,
  CalendarCheck,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  LayoutDashboard,
  LucideIcon,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Smile,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { Feature, Tier } from "./stores/permission-store";
import type { ClinicType } from "@workspace/types";

export interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
  feature?: Feature;
  tier?: Tier;
  badge?: string;
  facilityType?: "CLINIC" | "HOSPITAL";
  clinicTypes?: ClinicType[]; // If specified, only show for these clinic types
}

export const sidebarItems: SidebarItem[] = [
  // ======= Always Available =======
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
  },
  {
    title: "Bed Management",
    href: "/hospital/beds",
    icon: Bed,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    facilityType: "HOSPITAL",
  },

  // ======= Core Workflow =======
  {
    title: "Patients",
    href: "/patients",
    icon: Users,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.BASIC_PATIENT_MANAGEMENT,
  },
  {
    title: "Today's Patients",
    href: "/consultation",
    icon: CalendarCheck,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.QUEUE_MANAGEMENT,
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: Calendar,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.CALENDAR_SLOTS,
  },
  {
    title: "Prescriptions",
    href: "/prescriptions",
    icon: FileText,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.DIGITAL_PRESCRIPTIONS,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.INVOICING,
  },

  // ======= Documents & Import =======
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.DOCUMENT_ARCHIVAL,
  },
  {
    title: "Import Data",
    href: "/import",
    icon: Upload,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.EXCEL_IMPORT,
  },

  // WhatsApp removed - now requires add-on, not tier feature
  // Access controlled via add-on check in the WhatsApp page itself

  // ======= Tier 3: PRO =======
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.INVENTORY,
  },
  {
    title: "Lab Tests",
    href: "/lab-tests",
    icon: FlaskConical,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.LAB_TESTS,
  },
  {
    title: "Coding Queue",
    href: "/coding-queue",
    icon: FileText,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.MEDICAL_CODING,
  },

  // ======= Specialty Features (Clinic-Type Specific) =======
  {
    title: "Dental Charts",
    href: "/specialty/dental-charts",
    icon: Smile,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    clinicTypes: ["DENTAL"],
    badge: "Dental",
  },
  {
    title: "Growth Charts",
    href: "/specialty/growth-charts",
    icon: Baby,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    clinicTypes: ["PEDIATRIC"],
    badge: "Pediatric",
  },
  {
    title: "ECG Monitoring",
    href: "/specialty/ecg-monitoring",
    icon: Heart,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    clinicTypes: ["CARDIOLOGY"],
    badge: "Cardio",
  },
  {
    title: "Vision Tests",
    href: "/specialty/vision-tests",
    icon: Eye,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    clinicTypes: ["OPHTHALMOLOGY"],
    badge: "Eye",
  },
  {
    title: "Prenatal Care",
    href: "/specialty/prenatal-care",
    icon: Baby,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    clinicTypes: ["GYNECOLOGY"],
    badge: "OB/GYN",
  },
  {
    title: "Mental Health",
    href: "/specialty/mental-health",
    icon: Brain,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    clinicTypes: ["PSYCHIATRY"],
    badge: "Psych",
  },

  // ======= Tier 5: INTELLIGENCE =======
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.AI_PRESCRIPTION_ASSISTANT,
    badge: "AI",
  },
  {
    title: "Feedback",
    href: "#feedback",
    icon: MessageSquare,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
  },
];

export const settingsItem: SidebarItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
  roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
};
