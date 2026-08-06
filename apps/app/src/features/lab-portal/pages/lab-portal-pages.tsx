import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { LabPortalWorkspacePage } from "@/features/lab-portal/components/lab-portal-workspace-page";
import { LabPortalLoginUI } from "@/features/lab-portal/components/auth/lab-portal-login-ui";

/** Lab portal home — the signed-in lab workspace (guard handled by the layout shell). */
export function LabPortalHomePage() {
  const { t } = useTranslation("LabPortal");
  return (
    <>
      <PageMeta title={t("pageTitle")} noSuffix />
      <LabPortalWorkspacePage />
    </>
  );
}

/** Lab portal login — real credential form; redirects to the workspace on success. */
export function LabPortalLoginPage() {
  const { t } = useTranslation("LabPortal");
  return (
    <>
      <PageMeta title={t("loginPageTitle")} noSuffix />
      <LabPortalLoginUI />
    </>
  );
}
