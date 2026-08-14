import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";

export function NotFoundPage() {
  const { t } = useTranslation("Errors");
  return (
    <>
      <PageMeta title={t("notFound.title")} noSuffix />
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">{t("notFound.message")}</p>
        <Link to="/today" className="mt-4 text-primary hover:underline">
          {t("notFound.goToToday")}
        </Link>
      </div>
    </>
  );
}