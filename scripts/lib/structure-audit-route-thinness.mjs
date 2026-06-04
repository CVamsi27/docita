import { collectFrontendAudit } from "./structure-audit-frontend.mjs";

export function collectRouteThinnessFindings() {
  return collectFrontendAudit().issues.filter((issue) =>
    issue.message.includes("route page"),
  );
}
