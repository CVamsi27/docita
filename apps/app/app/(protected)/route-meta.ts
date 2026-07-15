// Hand-maintained route metadata for breadcrumbs in desktop-top-bar.tsx
// and similar nav surfaces. When you add a new page under app/(protected)/,
// add a matching entry below. `scripts/checks/check-route-meta-coverage.mjs`
// is a blocking check that flags missing entries.
//
// Phase 6.3: `labelKey` replaces the previous hardcoded `label` so the
// consumer can resolve the human label through next-intl's t() against
// messages/en.json (namespace: Routes). The English label is kept as
// `label` for fallback when the key is missing — this preserves
// behavior for any code path that still reads the static label and
// also gives the JSX literal density ratchet a known-safe fallback to
// scan.
export interface RouteMeta {
  labelKey: string;
  label: string;
  parentPath?: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  "/today": { labelKey: "today", label: "Today" },
  "/dashboard": { labelKey: "today", label: "Today" },
  "/billing-locked": { labelKey: "billingLocked", label: "Billing locked" },
  "/patients": { labelKey: "patients", label: "Patients" },
  "/patients/[id]": {
    labelKey: "patient",
    label: "Patient",
    parentPath: "/patients",
  },
  "/appointments": { labelKey: "appointments", label: "Appointments" },
  "/follow-ups": { labelKey: "followUps", label: "Follow-ups" },
  "/coding-queue": { labelKey: "codingQueue", label: "Coding queue" },
  "/consultation": { labelKey: "consultation", label: "Consultation" },
  "/consultation/[id]": {
    labelKey: "consultation",
    label: "Consultation",
    parentPath: "/appointments",
  },
  "/prescriptions": { labelKey: "prescriptions", label: "Prescriptions" },
  "/prescriptions/[id]": {
    labelKey: "prescription",
    label: "Prescription",
    parentPath: "/prescriptions",
  },
  "/lab-tests": { labelKey: "labTests", label: "Lab tests" },
  "/invoices": { labelKey: "invoices", label: "Invoices" },
  "/invoices/new": {
    labelKey: "newInvoice",
    label: "New invoice",
    parentPath: "/invoices",
  },
  "/invoices/[id]": {
    labelKey: "invoice",
    label: "Invoice",
    parentPath: "/invoices",
  },
  "/invoices/[id]/edit": {
    labelKey: "edit",
    label: "Edit",
    parentPath: "/invoices/[id]",
  },
  "/daybook": { labelKey: "daybook", label: "Daybook" },
  "/desk/collect-payment": {
    labelKey: "collectPayment",
    label: "Collect payment",
  },
  "/desk/floor": { labelKey: "deskFloor", label: "Desk floor" },
  "/insurance-claims": {
    labelKey: "insuranceClaims",
    label: "Insurance claims",
  },
  "/insurance-claims/new": {
    labelKey: "newClaim",
    label: "New claim",
    parentPath: "/insurance-claims",
  },
  "/insurance-claims/[id]": {
    labelKey: "claim",
    label: "Claim",
    parentPath: "/insurance-claims",
  },
  "/insurance-claims/[id]/edit": {
    labelKey: "edit",
    label: "Edit",
    parentPath: "/insurance-claims/[id]",
  },
  "/inventory": { labelKey: "inventory", label: "Inventory" },
  "/documents": { labelKey: "documents", label: "Documents" },
  "/analytics": { labelKey: "analytics", label: "Analytics" },
  "/reports": { labelKey: "reports", label: "Reports" },
  "/import": { labelKey: "import", label: "Import" },
  "/import/ocr": { labelKey: "ocr", label: "OCR", parentPath: "/import" },
  "/import/excel": {
    labelKey: "excel",
    label: "Excel",
    parentPath: "/import",
  },
  "/ai-assistant": { labelKey: "aiAssistant", label: "AI assistant" },
  "/whatsapp": { labelKey: "whatsapp", label: "WhatsApp" },
  "/inbox": { labelKey: "inbox", label: "Inbox" },
  "/templates": { labelKey: "templates", label: "Templates" },
  "/hospital/beds": {
    labelKey: "hospitalBeds",
    label: "Hospital beds",
    parentPath: "/hospital",
  },
  "/hospital": { labelKey: "hospital", label: "Hospital" },
  "/specialty/dental-charts": {
    labelKey: "dentalCharts",
    label: "Dental charts",
    parentPath: "/specialty",
  },
  "/specialty": { labelKey: "specialty", label: "Specialty" },
  "/settings": { labelKey: "settings", label: "Settings" },
  "/settings/team": {
    labelKey: "teamManagement",
    label: "Team Management",
    parentPath: "/settings",
  },
  "/settings/team/join-requests": {
    labelKey: "joinRequests",
    label: "Join requests",
    parentPath: "/settings",
  },
  "/settings/whatsapp-sender": {
    labelKey: "whatsappSender",
    label: "WhatsApp sender",
    parentPath: "/settings",
  },
  "/settings/compliance": {
    labelKey: "compliance",
    label: "Compliance",
    parentPath: "/settings",
  },
  "/settings/compliance/consent-template": {
    labelKey: "consentTemplate",
    label: "Consent template",
    parentPath: "/settings/compliance",
  },
  "/profile": { labelKey: "profile", label: "Profile" },
  "/help": { labelKey: "help", label: "Help" },
  "/upgrade": { labelKey: "upgrade", label: "Upgrade" },
  "/referrals": { labelKey: "referrals", label: "Referrals" },
};

interface Crumb {
  label: string;
  labelKey?: string;
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
      labelKey: meta.labelKey,
      href: currentKey === normalized ? undefined : currentKey,
    });
    currentKey = meta.parentPath;
  }

  const firstCrumb = crumbs[0];
  if (crumbs.length && firstCrumb && firstCrumb.label !== "Today") {
    // The "Today" root crumb has a stable i18n key but we also keep the
    // literal here as the static fallback for any code path that
    // renders without the IntlProvider.
    crumbs.unshift({ label: "Today", labelKey: "today", href: "/today" });
  }

  return crumbs;
}
