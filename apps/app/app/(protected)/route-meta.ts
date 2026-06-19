// Hand-maintained route metadata for breadcrumbs in desktop-top-bar.tsx
// and similar nav surfaces. When you add a new page under app/(protected)/,
// add a matching entry below. `scripts/checks/check-route-meta-coverage.mjs`
// is a blocking check that flags missing entries.
export interface RouteMeta {
  label: string;
  parentPath?: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  "/today": { label: "Today" },
  "/dashboard": { label: "Today" },
  "/billing-locked": { label: "Billing locked" },
  "/patients": { label: "Patients" },
  "/patients/[id]": { label: "Patient", parentPath: "/patients" },
  "/appointments": { label: "Appointments" },
  "/follow-ups": { label: "Follow-ups" },
  "/coding-queue": { label: "Coding queue" },
  "/consultation": { label: "Consultation" },
  "/consultation/[id]": { label: "Consultation", parentPath: "/appointments" },
  "/prescriptions": { label: "Prescriptions" },
  "/prescriptions/[id]": {
    label: "Prescription",
    parentPath: "/prescriptions",
  },
  "/lab-tests": { label: "Lab tests" },
  "/invoices": { label: "Invoices" },
  "/invoices/new": { label: "New invoice", parentPath: "/invoices" },
  "/invoices/[id]": { label: "Invoice", parentPath: "/invoices" },
  "/invoices/[id]/edit": { label: "Edit", parentPath: "/invoices/[id]" },
  "/daybook": { label: "Daybook" },
  "/desk/collect-payment": { label: "Collect payment" },
  "/desk/floor": { label: "Desk floor" },
  "/insurance-claims": { label: "Insurance claims" },
  "/insurance-claims/new": {
    label: "New claim",
    parentPath: "/insurance-claims",
  },
  "/insurance-claims/[id]": {
    label: "Claim",
    parentPath: "/insurance-claims",
  },
  "/insurance-claims/[id]/edit": {
    label: "Edit",
    parentPath: "/insurance-claims/[id]",
  },
  "/inventory": { label: "Inventory" },
  "/pharmacy": { label: "Pharmacy" },
  "/vaccines": { label: "Vaccines" },
  "/referrals": { label: "Referrals" },
  "/documents": { label: "Documents" },
  "/analytics": { label: "Analytics" },
  "/reports": { label: "Reports" },
  "/import": { label: "Import" },
  "/import/ocr": { label: "OCR", parentPath: "/import" },
  "/import/excel": { label: "Excel", parentPath: "/import" },
  "/ai-assistant": { label: "AI assistant" },
  "/whatsapp": { label: "WhatsApp" },
  "/inbox": { label: "Inbox" },
  "/templates": { label: "Templates" },
  "/hospital/beds": { label: "Hospital beds", parentPath: "/hospital" },
  "/hospital": { label: "Hospital" },
  "/specialty/dental-charts": {
    label: "Dental charts",
    parentPath: "/specialty",
  },
  "/specialty": { label: "Specialty" },
  "/settings": { label: "Settings" },
  "/settings/team": { label: "Team Management", parentPath: "/settings" },
  "/settings/team/join-requests": {
    label: "Join requests",
    parentPath: "/settings",
  },
  "/settings/whatsapp-sender": {
    label: "WhatsApp sender",
    parentPath: "/settings",
  },
  "/settings/compliance": { label: "Compliance", parentPath: "/settings" },
  "/settings/compliance/consent-template": {
    label: "Consent template",
    parentPath: "/settings/compliance",
  },
  "/profile": { label: "Profile" },
  "/help": { label: "Help" },
  "/upgrade": { label: "Upgrade" },
};

interface Crumb {
  label: string;
  href?: string;
}

function normalize(path: string): string {
  return path
    .split("/")
    .map((segment, idx) => {
      if (idx === 0) return segment;
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          segment,
        )
      ) {
        return "[id]";
      }
      if (/^\d+$/.test(segment)) return "[id]";
      if (segment.length > 20 && !segment.includes("-")) return segment;
      return segment;
    })
    .join("/");
}

export function breadcrumbsFor(pathname: string): Crumb[] {
  if (!pathname || pathname === "/") return [];
  const normalized = normalize(pathname);

  const crumbs: Crumb[] = [];
  let currentKey: string | undefined = normalized;
  const visited = new Set<string>();

  while (currentKey && !visited.has(currentKey)) {
    visited.add(currentKey);
    const meta: RouteMeta | undefined = ROUTE_META[currentKey];
    if (!meta) {
      const segments = currentKey.split("/").filter(Boolean);
      const label =
        segments[segments.length - 1]
          ?.replace(/\[|\]/g, "")
          .replace(/-/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase()) ?? "";
      if (label) {
        crumbs.unshift({
          label,
          href: currentKey === normalized ? undefined : currentKey,
        });
      }
      break;
    }
    crumbs.unshift({
      label: meta.label,
      href: currentKey === normalized ? undefined : currentKey,
    });
    currentKey = meta.parentPath;
  }

  const firstCrumb = crumbs[0];
  if (crumbs.length && firstCrumb && firstCrumb.label !== "Today") {
    crumbs.unshift({ label: "Today", href: "/today" });
  }

  return crumbs;
}
