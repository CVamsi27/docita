import { useState } from "react";
import {
  ArrowRight,
  Database,
  FileSpreadsheet,
  ScanLine,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { BulletStepList } from "@/components/bullet-step-list";
import {
  FeatureGate,
  FeatureTierBadge,
  TierBadge,
  Feature,
  Tier,
} from "@/components/auth/feature-gate";
import { BulkImportDialog } from "./BulkImportDialogContainer";

export function ImportPageContent() {
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { t } = useTranslation("Import");

  return (
    <AppPageScaffold
      className="max-w-5xl"
      header={
        <PageHeader
          title={t("page.pageTitle")}
          description={t("page.pageDescription")}
        />
      }
    >
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/15">
                <FileSpreadsheet className="h-6 w-6 text-info" />
              </div>
              <TierBadge tier={Tier.STARTER} />
            </div>
            <CardTitle className="mt-4">{t("page.excelTitle")}</CardTitle>
            <CardDescription>
              {t("page.excelDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulletStepList
              bulletClassName="bg-success"
              items={[
                t("page.excelStep1"),
                t("page.excelStep2"),
                t("page.excelStep3"),
                t("page.excelStep4"),
              ]}
            />
            <Button className="w-full" onClick={() => setShowBulkImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t("page.excelButton")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                <ScanLine className="h-6 w-6 text-primary" />
              </div>
              <FeatureTierBadge feature={Feature.OCR_BASIC} />
            </div>
            <CardTitle className="mt-4">{t("page.ocrTitle")}</CardTitle>
            <CardDescription>
              {t("page.ocrDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulletStepList
              bulletClassName="bg-primary"
              items={[
                t("page.ocrStep1"),
                t("page.ocrStep2"),
                t("page.ocrStep3"),
                t("page.ocrStep4"),
              ]}
            />
            <FeatureGate
              feature={Feature.OCR_BASIC}
              fallback={
                <Button className="w-full" variant="secondary" disabled>
                  <ScanLine className="mr-2 h-4 w-4" />
                  {t("page.ocrUpgradeButton")}
                </Button>
              }
            >
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => setShowBulkImport(true)}
              >
                <ScanLine className="mr-2 h-4 w-4" />
                {t("page.ocrScanButton")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </FeatureGate>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-info relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/20">
              <Database className="h-6 w-6 text-info" />
            </div>
            <TierBadge tier={Tier.PROFESSIONAL} />
          </div>
          <CardTitle className="mt-4">{t("page.bulkTitle")}</CardTitle>
          <CardDescription>
            {t("page.bulkDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BulletStepList
            bulletClassName="bg-info"
            items={[
              t("page.bulkStep1"),
              t("page.bulkStep2"),
              t("page.bulkStep3"),
              t("page.bulkStep4"),
            ]}
          />
          <Button onClick={() => setShowBulkImport(true)} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {t("page.bulkButton")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("page.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>{t("page.tipsExcelLabel")}</strong> {t("page.tipsExcelBody")}
          </p>
          <p>
            <strong>{t("page.tipsPhoneLabel")}</strong> {t("page.tipsPhoneBody")}
          </p>
          <p>
            <strong>{t("page.tipsDuplicatesLabel")}</strong> {t("page.tipsDuplicatesBody")}
          </p>
        </CardContent>
      </Card>

      {showBulkImport && (
        <BulkImportDialog
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
        />
      )}
    </AppPageScaffold>
  );
}
