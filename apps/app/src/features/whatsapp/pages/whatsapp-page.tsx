import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { WhatsappOperationsPageContent } from "@/features/whatsapp";

export function WhatsAppPage() {
  const { t } = useTranslation("WhatsApp");
  return (
    <>
      <PageMeta title={t("pageTitle")} description={t("pageDescription")} />
      <WhatsappOperationsPageContent />
    </>
  );
}
