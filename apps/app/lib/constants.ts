import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Receipt,
  MessageSquare,
  BarChart3,
  Package,
  FlaskConical,
  Ticket,
  Sparkles,
  Upload,
  Settings,
  LucideIcon,
} from "lucide-react";
import { Feature, Tier } from "./stores/permission-store";

export interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
  feature?: Feature;
  tier?: Tier;
  badge?: string;
}

export const sidebarItems: SidebarItem[] = [
  // ======= Always Available =======
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
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

  // ======= Analytics =======
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.BASIC_ANALYTICS,
  },

  // ======= Tier 2: PLUS =======
  {
    title: "WhatsApp",
    href: "/whatsapp",
    icon: MessageSquare,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.WHATSAPP_API,
  },

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
    title: "Queue",
    href: "/queue",
    icon: Ticket,
    roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.QUEUE_MANAGEMENT,
  },
  {
    title: "Coding Queue",
    href: "/coding-queue",
    icon: FileText,
    roles: ["DOCTOR", "ADMIN", "ADMIN_DOCTOR"],
    feature: Feature.MEDICAL_CODING,
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
];

export const settingsItem: SidebarItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
  roles: ["DOCTOR", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"],
};
