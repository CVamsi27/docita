import {
  Bell,
  Building2,
  Calendar,
  CalendarOff,
  Crown,
  FileText,
  Lock,
  MessageSquare,
  Paintbrush,
  Users,
} from "lucide-react";

const ADMIN_ROLES = ["ADMIN", "ADMIN_DOCTOR", "SUPER_ADMIN"] as const;
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
      },
      {
        value: "queue",
        label: "Queue",
        icon: Users,
        description: "Patient queue settings",
        roles: QUEUE_ROLES,
      },
      {
        value: "prescriptions",
        label: "Prescriptions",
        icon: FileText,
        description: "Rx defaults",
        roles: DOCTOR_ROLES,
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
      {
        value: "whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
        description: "Messaging automation",
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    category: "Account",
    items: [
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
];
