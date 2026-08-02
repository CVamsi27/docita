import { useTranslation } from "react-i18next";
import { PageMeta } from "@/components/layout/page-meta";
import { LockKeyhole } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@workspace/ui/components/indicators/card";
import { DocitaLogo } from "@workspace/ui/components/indicators/docita-logo";
import { SupportContact } from "@/components/support-contact/support-contact";

export function BillingLockedPage() {
  const { t } = useTranslation("Billing");
  return (
    <>
      <PageMeta title={t("locked.title")} noSuffix />
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-12">
        <DocitaLogo />
        <Card className="w-full max-w-lg border-destructive/30">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <LockKeyhole className="h-6 w-6 shrink-0" aria-hidden />
              <h1 className="ui-section-title text-xl">
                {t("locked.workspaceAccessPaused")}
              </h1>
            </div>
            <CardDescription className="text-base">
              {t("locked.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              {t("locked.contactAdmin")}
            </p>
            <p className="text-xs text-foreground">
              {t("locked.mistakeNote")}
            </p>
            <SupportContact layout="stack" variant="footer" className="text-xs" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
