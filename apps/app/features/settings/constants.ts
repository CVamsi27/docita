import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  CalendarOff,
  Crown,
  FileText,
  FlaskConical,
  HeartPulse,
  Lock,
  Paintbrush,
  Sparkles,
  Ticket,
  UserCircle,
  Users,
} from "lucide-react";
import { CLINIC_ADMIN_ROLES, Feature } from "@workspace/types";

const ADMIN_ROLES = [...CLINIC_ADMIN_ROLES, "INTERNAL"] as const;
const DOCTOR_ROLES = [...ADMIN_ROLES, "DOCTOR"] as const;
const QUEUE_ROLES = [...ADMIN_ROLES, "RECEPTIONIST"] as const;

export const settingsTabs = [
  {
    category: "Practice",
    items: [
      {
        value: "general",
        label: "General",
        icon: Building2,
        description: "Clinic info & hours",
        roles: ADMIN_ROLES,
      },
      {
        value: "members",
        label: "Team Members",
        icon: Users,
        description: "Staff & permissions",
        roles: ADMIN_ROLES,
      },
      {
        value: "subscription",
        label: "Billing & Subscription",
        icon: Crown,
        description: "Plan, invoices & usage",
        roles: ADMIN_ROLES,
      },
      {
        value: "branding",
        label: "Enterprise Branding",
        icon: Sparkles,
        description: "Brand name, theme & WhatsApp",
        roles: ADMIN_ROLES,
        feature: Feature.WHITE_LABEL_BRANDING,
      },
    ],
  },
  {
    category: "Clinical",
    items: [
      {
        value: "availability",
        label: "Availability",
        icon: Calendar,
        description: "Doctor schedules",
        roles: DOCTOR_ROLES,
      },
      {
        value: "leave",
        label: "Leave Management",
        icon: CalendarOff,
        description: "Leave plans & requests",
        roles: DOCTOR_ROLES,
        feature: Feature.LEAVE_MANAGEMENT,
      },
      {
        value: "queue",
        label: "Queue",
        icon: Ticket,
        description: "Patient queue settings",
        roles: QUEUE_ROLES,
        feature: Feature.QUEUE_MANAGEMENT,
      },
      {
        value: "prescriptions",
        label: "Prescriptions & Print",
        icon: FileText,
        description: "Rx defaults & printable OPD slip",
        roles: DOCTOR_ROLES,
      },
      {
        value: "labs",
        label: "Labs",
        icon: FlaskConical,
        description: "In-house & external labs",
        roles: ADMIN_ROLES,
        feature: Feature.LAB_TESTS,
      },
      {
        value: "abdm",
        label: "ABDM",
        icon: HeartPulse,
        description: "ABHA, M2 readiness & DHIS",
        roles: ADMIN_ROLES,
        feature: Feature.ABDM_INTEGRATION,
        comingSoon: true,
      },
    ],
  },
  {
    category: "Automation",
    items: [
      {
        value: "reminders",
        label: "Reminders",
        icon: Bell,
        description: "Appointment alerts",
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    category: "Account",
    items: [
      {
        value: "doctor-profile",
        label: "Doctor Profile",
        icon: UserCircle,
        description: "Signature & registration",
        roles: DOCTOR_ROLES,
      },
      {
        value: "notifications",
        label: "Notifications",
        icon: Bell,
        description: "Alert preferences",
        roles: ADMIN_ROLES,
      },
      {
        value: "security",
        label: "Security",
        icon: Lock,
        description: "Password & 2FA",
        roles: ADMIN_ROLES,
      },
      {
        value: "appearance",
        label: "Appearance",
        icon: Paintbrush,
        description: "Theme & display",
      },
    ],
  },
  {
    category: "Danger Zone",
    items: [
      {
        value: "danger-zone",
        label: "Danger Zone",
        icon: AlertTriangle,
        description: "Sign out and account deletion",
      },
    ],
  },
];
