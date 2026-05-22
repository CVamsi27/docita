import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";

export type InternalNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const INTERNAL_SIDEBAR_ITEMS: InternalNavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Team",
    href: "/users",
    icon: Users,
  },
  {
    title: "Admins",
    href: "/admins",
    icon: Shield,
  },
  {
    title: "Payment Processing",
    href: "/payment-processing",
    icon: CreditCard,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Pricing",
    href: "/pricing",
    icon: CreditCard,
  },
  {
    title: "Enterprise Contracts",
    href: "/enterprise-contracts",
    icon: FileText,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "System Monitoring",
    href: "/system-monitoring",
    icon: Activity,
  },
  {
    title: "Feedback",
    href: "/feedback",
    icon: MessageSquare,
  },
  {
    title: "Support WhatsApp",
    href: "/support",
    icon: Inbox,
  },
  {
    title: "WhatsApp Broadcasts",
    href: "/broadcasts",
    icon: Megaphone,
  },
  {
    title: "System Logs",
    href: "/logs",
    icon: FileText,
  },
  {
    title: "Audit Logs",
    href: "/audits",
    icon: Shield,
  },
  {
    title: "Performance",
    href: "/performance",
    icon: Gauge,
  },
  {
    title: "Doctors",
    href: "/doctors",
    icon: Stethoscope,
  },
];
