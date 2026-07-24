import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Gauge,
  Gift,
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
  /**
   * Phase 6.6: optional i18n key (InternalNav namespace). When set,
   * sidebar consumers should resolve the visible title through
   * t(InternalNav.key) at render time. The `title` field remains as
   * the English fallback for any code path that renders without the
   * IntlProvider, so the JSX literal density ratchet sees the chrome
   * as already-translated.
   */
  labelKey?: string;
  href: string;
  icon: LucideIcon;
};

export const INTERNAL_SIDEBAR_ITEMS: InternalNavItem[] = [
  {
    title: "Overview",
    labelKey: "overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Team",
    labelKey: "team",
    href: "/users",
    icon: Users,
  },
  {
    title: "Admins",
    labelKey: "admins",
    href: "/admins",
    icon: Shield,
  },
  {
    title: "Payment Processing",
    labelKey: "paymentProcessing",
    href: "/payment-processing",
    icon: CreditCard,
  },
  {
    title: "Billing",
    labelKey: "billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Pricing",
    labelKey: "pricing",
    href: "/pricing",
    icon: CreditCard,
  },
  {
    title: "Enterprise Contracts",
    labelKey: "enterpriseContracts",
    href: "/enterprise-contracts",
    icon: FileText,
  },
  {
    title: "Referrals",
    labelKey: "referrals",
    href: "/referrals",
    icon: Gift,
  },
  {
    title: "Analytics",
    labelKey: "analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "System Monitoring",
    labelKey: "systemMonitoring",
    href: "/system-monitoring",
    icon: Activity,
  },
  {
    title: "Feedback",
    labelKey: "feedback",
    href: "/feedback",
    icon: MessageSquare,
  },
  {
    title: "Support WhatsApp",
    labelKey: "support",
    href: "/support",
    icon: Inbox,
  },
  {
    title: "WhatsApp Broadcasts",
    labelKey: "broadcasts",
    href: "/broadcasts",
    icon: Megaphone,
  },
  {
    title: "System Logs",
    labelKey: "systemLogs",
    href: "/logs",
    icon: FileText,
  },
  {
    title: "Audit Logs",
    labelKey: "auditLogs",
    href: "/audits",
    icon: Shield,
  },
  {
    title: "Performance",
    labelKey: "performance",
    href: "/performance",
    icon: Gauge,
  },
  {
    title: "Doctors",
    labelKey: "doctors",
    href: "/doctors",
    icon: Stethoscope,
  },
];
