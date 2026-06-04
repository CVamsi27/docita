import { Bed, Bell, HelpCircle, Settings2, SmilePlus, Sparkles, type LucideIcon } from "lucide-react";
import { APP_ACCESS_TARGETS, Feature } from "@workspace/types";
import type { NavItem } from "./nav-config-sections";

export { NavItem, NavSectionId, NavSection, navSections, navItems } from "./nav-config-sections";

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  icon: Settings2,
  label: "Settings",
  accessTarget: APP_ACCESS_TARGETS.PAGE_SETTINGS,
};

export const HELP_NAV_ITEM: NavItem = {
  href: "/help",
  icon: HelpCircle,
  label: "Help",
};

export const AI_ASSISTANT_NAV_ITEM: NavItem = {
  href: "/ai-assistant",
  icon: Sparkles,
  label: "AI Assistant",
  feature: Feature.AI_PRESCRIPTION_ASSISTANT,
};

export function sidebarNavLinkTestId(href: string): string {
  const slug = href.replace(/^\//, "").replace(/\//g, "-");
  return `sidebar-link-${slug}`;
}

export const FIXED_NAV_HREFS = new Set([
  "/today",
  "/appointments",
  "/settings",
  "/invoices",
  "/desk/collect-payment",
]);

export const mobileOnlyNavItems: NavItem[] = [
  {
    href: "/settings?tab=notifications",
    icon: Bell,
    label: "Notifications",
  },
];

export const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Smile: SmilePlus,
};

export const SPECIALTY_URLS: Record<string, string> = {
  "dental-chart": "/specialty/dental-charts",
};

export const IPD_NAV_ITEM: NavItem = {
  href: "/hospital/beds",
  icon: Bed,
  label: "Bed Management",
  accessTarget: APP_ACCESS_TARGETS.PAGE_HOSPITAL,
};
