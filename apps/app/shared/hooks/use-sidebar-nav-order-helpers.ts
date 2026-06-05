import { sidebarNavOrderSchema } from "@workspace/types";
import type { NavItem, NavSection, NavSectionId } from "@/components/navigation/nav-config";
import { FIXED_NAV_HREFS } from "@/components/navigation/nav-config";

export type SidebarNavOrder = Record<NavSectionId, string[]>;

const CLINIC_ORDER_KEY = "sidebar_nav_order_clinic";
const USER_ORDER_KEY = "sidebar_nav_order_user";

export function safeParseSidebarNavOrder(raw: string | null): SidebarNavOrder | null {
  if (!raw) return null;
  try {
    const parsed = sidebarNavOrderSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function normalizeOrderForSection(items: NavItem[], desiredHrefs: string[] | undefined): string[] {
  const allowed = new Set(items.map((i) => i.href));
  const out: string[] = [];

  for (const href of desiredHrefs ?? []) {
    if (allowed.has(href)) out.push(href);
  }
  for (const item of items) {
    if (!out.includes(item.href)) out.push(item.href);
  }

  // Ensure fixed items are always present.
  for (const item of items) {
    if (FIXED_NAV_HREFS.has(item.href) && !out.includes(item.href)) {
      out.unshift(item.href);
    }
  }

  return out;
}

export function buildDefaultOrder(sections: NavSection[]): SidebarNavOrder {
  return sections.reduce<SidebarNavOrder>(
    (order, section) => {
      order[section.id] = section.items.map((item) => item.href);
      return order;
    },
    { track: [], services: [] },
  );
}

export function getClinicStorageKey(clinicId: string) {
  return `${CLINIC_ORDER_KEY}_${clinicId}`;
}

export function getUserStorageKey(clinicId: string, userId: string) {
  return `${USER_ORDER_KEY}_${clinicId}_${userId}`;
}
