// Hand-maintained route metadata for breadcrumbs in desktop-top-bar.tsx
// and similar nav surfaces. When you add a new page under app/(protected)/,
// add a matching entry below. `scripts/checks/check-route-meta-coverage.mjs`
// is an advisory check that flags missing entries.
// SYSTEM_DESIGN_AND_PATTERNS.md §56 item 44 tracks a future codegen.
export interface RouteMeta {
  label: string;
  parentPath?: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": { label: "Dashboard" },
  "/patients": { label: "Patients" },
  "/patients/[id]": { label: "Patient", parentPath: "/patients" },
  "/appointments": { label: "Appointments" },
  "/follow-ups": { label: "Follow-ups" },
  "/consultation": { label: "Consultation" },
  "/consultation/[id]": { label: "Consultation", parentPath: "/appointments" },
  "/prescriptions": { label: "Prescriptions" },
  "/prescriptions/[id]": { label: "Prescription", parentPath: "/prescriptions" },
  "/lab-tests": { label: "Lab tests" },
  "/invoices": { label: "Invoices" },
  "/invoices/new": { label: "New invoice", parentPath: "/invoices" },
  "/invoices/[id]": { label: "Invoice", parentPath: "/invoices" },
  "/invoices/[id]/edit": { label: "Edit", parentPath: "/invoices/[id]" },
  "/daybook": { label: "Daybook" },
  "/inventory": { label: "Inventory" },
  "/pharmacy": { label: "Pharmacy" },
  "/vaccines": { label: "Vaccines" },
  "/referrals": { label: "Referrals" },
  "/documents": { label: "Documents" },
  "/analytics": { label: "Analytics" },
  "/import": { label: "Import" },
  "/import/ocr": { label: "OCR", parentPath: "/import" },
  "/import/excel": { label: "Excel", parentPath: "/import" },
  "/ai-assistant": { label: "AI assistant" },
  "/whatsapp": { label: "WhatsApp", parentPath: "/inbox" },
  "/hospital/beds": { label: "Hospital beds", parentPath: "/hospital" },
  "/hospital": { label: "Hospital" },
  "/specialty/dental-charts": { label: "Dental charts", parentPath: "/specialty" },
  "/specialty": { label: "Specialty" },
  "/settings": { label: "Settings" },
  "/settings/compliance": { label: "Compliance", parentPath: "/settings" },
  "/profile": { label: "Profile" },
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
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
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
        crumbs.unshift({ label, href: currentKey === normalized ? undefined : currentKey });
      }
      break;
    }
    crumbs.unshift({ label: meta.label, href: currentKey === normalized ? undefined : currentKey });
    currentKey = meta.parentPath;
  }

  const firstCrumb = crumbs[0];
  if (crumbs.length && firstCrumb && firstCrumb.label !== "Dashboard") {
    crumbs.unshift({ label: "Dashboard", href: "/dashboard" });
  }

  return crumbs;
}
