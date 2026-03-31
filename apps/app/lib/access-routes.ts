import { APP_ACCESS_TARGETS, type AppAccessTarget } from "@workspace/types";

interface RouteAccessRule {
  pathPrefix: string;
  target: AppAccessTarget;
}

const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  { pathPrefix: "/dashboard", target: APP_ACCESS_TARGETS.PAGE_DASHBOARD },
  { pathPrefix: "/patients", target: APP_ACCESS_TARGETS.PAGE_PATIENTS },
  { pathPrefix: "/appointments", target: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS },
  { pathPrefix: "/prescriptions", target: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS },
  { pathPrefix: "/lab-tests", target: APP_ACCESS_TARGETS.PAGE_LAB_TESTS },
  { pathPrefix: "/invoices", target: APP_ACCESS_TARGETS.PAGE_INVOICES },
  { pathPrefix: "/inventory", target: APP_ACCESS_TARGETS.PAGE_INVENTORY },
  { pathPrefix: "/documents", target: APP_ACCESS_TARGETS.PAGE_DOCUMENTS },
  { pathPrefix: "/analytics", target: APP_ACCESS_TARGETS.PAGE_ANALYTICS },
  { pathPrefix: "/coding-queue", target: APP_ACCESS_TARGETS.PAGE_CODING_QUEUE },
  { pathPrefix: "/import", target: APP_ACCESS_TARGETS.PAGE_IMPORT },
  { pathPrefix: "/whatsapp", target: APP_ACCESS_TARGETS.PAGE_WHATSAPP },
  { pathPrefix: "/upgrade", target: APP_ACCESS_TARGETS.PAGE_UPGRADE },
];

export function getAccessTargetForPath(pathname?: string | null): AppAccessTarget | null {
  if (!pathname) return null;

  const rule = ROUTE_ACCESS_RULES.find(
    ({ pathPrefix }) =>
      pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`),
  );

  return rule?.target ?? null;
}
