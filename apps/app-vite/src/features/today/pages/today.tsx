import { useTranslation } from "react-i18next";
import { TodayPageContent } from "@/features/dashboard";

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