import { ConsultationDashboardUI } from "../components/ConsultationDashboardUI";
import { lazy } from "react";

const ConsultationDetailPageContent = lazy(() =>
  import("../components/ConsultationDetailPageContent").then((m) => ({ default: m.default })),
);

import { PageMeta } from "@/components/layout/page-meta";

export function ConsultationListPage() {
  return (
    <>
      <PageMeta title="Consultation" description="Manage patient consultations" />
      <ConsultationDashboardUI />
    </>
  );
}

export { ConsultationDetailPageContent as ConsultationDetailPage };
