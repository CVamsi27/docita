interface RouteMeta {
  labelKey: string;
  label: string;
  parentPath?: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  "/today": { labelKey: "today", label: "Today" },
  "/dashboard": { labelKey: "today", label: "Today" },
  "/patients": { labelKey: "patients", label: "Patients" },
  "/patients/[id]": { labelKey: "patient", label: "Patient", parentPath: "/patients" },
  "/appointments": { labelKey: "appointments", label: "Appointments" },
  "/consultation": { labelKey: "consultation", label: "Consultation" },
  "/consultation/[id]": { labelKey: "consultation", label: "Consultation", parentPath: "/appointments" },
  "/prescriptions": { labelKey: "prescriptions", label: "Prescriptions" },
  "/invoices": { labelKey: "invoices", label: "Invoices" },
  "/settings": { labelKey: "settings", label: "Settings" },
};

interface Crumb {
  label: string;
  labelKey?: string;
  href?: string;
}

function normalize(path: string): string {
  return path.split("/").map((segment, idx) => {
    if (idx === 0) return segment;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return "[id]";
    if (/^\d+$/.test(segment)) return "[id]";
    return segment;
  }).join("/");
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
    if (!meta) break;
    crumbs.unshift({ label: meta.label, labelKey: meta.labelKey, href: currentKey === normalized ? undefined : currentKey });
    currentKey = meta.parentPath;
  }
  if (crumbs.length && crumbs[0].label !== "Today") {
    crumbs.unshift({ label: "Today", labelKey: "today", href: "/today" });
  }
  return crumbs;
}
