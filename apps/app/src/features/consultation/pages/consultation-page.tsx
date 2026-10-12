import { ConsultationDashboardUI } from "../components/ConsultationDashboardUI";
import { PageMeta } from "@/components/layout/page-meta";

export function ConsultationListPage() {
  return (
    <>
      <PageMeta
        title="Consultation"
        description="Manage patient consultations"
      />
      <ConsultationDashboardUI />
    </>
  );
}
