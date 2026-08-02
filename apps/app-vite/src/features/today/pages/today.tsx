import { useTranslation } from "react-i18next";
import { TodayPageContent } from "@/features/dashboard/components/today/today-page-content";

import { PageMeta } from "@/components/layout/page-meta";

export function TodayPage() {
  const { t } = useTranslation("Dashboard");
  return (
    <>
      <PageMeta title={t("today.pageTitle")} description={t("today.pageDescription")} />
      <TodayPageContent />
    </>
  );
}