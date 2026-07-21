"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Database, FileSpreadsheet, ScanLine, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppPageScaffold, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@workspace/ui/components";
import { BulletStepList } from "@/components/bullet-step-list";
import { FeatureGate, FeatureTierBadge, TierBadge } from "@/components/auth/feature-gate";
import { BulkImportDialog } from "@/features/import/components/BulkImportDialogContainer";
import { Feature, Tier } from "@/lib/stores/permission-store";

/**
 * Phase 3 (per-feature): apps/app Import > Page content
 * (3 import method cards + tips card). 7 literals converted to
 * useTranslations("Import.page").
 */
function useImportPageTranslations() {
  return useTranslations("Import.page");
}

export function ImportPageContent() {
  const [showBulkImport, setShowBulkImport] = useState(false);
  const t = useImportPageTranslations();

  return (
    <AppPageScaffold
      className="max-w-5xl"
      header={
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
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
            <CardTitle className="mt-4">{t("excelTitle")}</CardTitle>
            <CardDescription>
              {t("excelDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulletStepList
              bulletClassName="bg-success"
              items={[
                t("excelStep1"),
                t("excelStep2"),
                t("excelStep3"),
                t("excelStep4"),
              ]}
            />
            <Link href="/import/excel">
              <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                {t("excelButton")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
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
            <CardTitle className="mt-4">{t("ocrTitle")}</CardTitle>
            <CardDescription>
              {t("ocrDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulletStepList
              bulletClassName="bg-primary"
              items={[
                t("ocrStep1"),
                t("ocrStep2"),
                t("ocrStep3"),
                t("ocrStep4"),
              ]}
            />
            <FeatureGate
              feature={Feature.OCR_BASIC}
              fallback={
                <Button className="w-full" variant="secondary" disabled>
                  <ScanLine className="mr-2 h-4 w-4" />
                  {t("ocrUpgradeButton")}
                </Button>
              }
            >
              <Link href="/import/ocr">
                <Button className="w-full" variant="secondary">
                  <ScanLine className="mr-2 h-4 w-4" />
                  {t("ocrScanButton")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
          <CardTitle className="mt-4">{t("bulkTitle")}</CardTitle>
          <CardDescription>
            {t("bulkDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BulletStepList
            bulletClassName="bg-info"
            items={[
              t("bulkStep1"),
              t("bulkStep2"),
              t("bulkStep3"),
              t("bulkStep4"),
            ]}
          />
          <Button onClick={() => setShowBulkImport(true)} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {t("bulkButton")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>{t("tipsExcelLabel")}</strong> {t("tipsExcelBody")}
          </p>
          <p>
            <strong>{t("tipsPhoneLabel")}</strong> {t("tipsPhoneBody")}
          </p>
          <p>
            <strong>{t("tipsDuplicatesLabel")}</strong> {t("tipsDuplicatesBody")}
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
