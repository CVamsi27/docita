"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  FileSpreadsheet,
  ScanLine,
  Upload,
} from "lucide-react";
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
} from "@/components/auth/feature-gate";
import { BulkImportDialog } from "@/features/import/components/BulkImportDialogContainer";
import { Feature, Tier } from "@/lib/stores/permission-store";

export function ImportPageContent() {
  const [showBulkImport, setShowBulkImport] = useState(false);

  return (
    <AppPageScaffold
      className="max-w-5xl"
      header={
        <PageHeader
          title="Import data"
          description="Digitize your facility records by importing from Excel or scanning documents."
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
            <CardTitle className="mt-4">Excel import</CardTitle>
            <CardDescription>
              Import patient data from Excel or CSV files with smart column
              mapping and duplicate detection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulletStepList
              bulletClassName="bg-success"
              items={[
                "Auto-detect column mappings",
                "Clean phone numbers & names",
                "Duplicate detection by phone & name",
                "Preview before importing",
              ]}
            />
            <Link href="/import/excel">
              <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Import Excel File
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
            <CardTitle className="mt-4">OCR Scanner</CardTitle>
            <CardDescription>
              Scan handwritten prescriptions and documents to extract patient
              data using AI-powered OCR.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BulletStepList
              bulletClassName="bg-primary"
              items={[
                "AI handwriting recognition",
                "Extract medications & dosages",
                "Auto-enhance scanned images",
                "Review & correct extracted data",
              ]}
            />
            <FeatureGate
              feature={Feature.OCR_BASIC}
              fallback={
                <Button className="w-full" variant="secondary" disabled>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Upgrade to Plus for OCR
                </Button>
              }
            >
              <Link href="/import/ocr">
                <Button className="w-full" variant="secondary">
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan Documents
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
          <CardTitle className="mt-4">Bulk Entity Import</CardTitle>
          <CardDescription>
            Import multiple entities (patients, prescriptions, doctors, lab
            tests, inventory) with AI-powered validation and batch processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BulletStepList
            bulletClassName="bg-info"
            items={[
              "Import 5 entity types (patient, prescription, doctor, lab-test, inventory)",
              "Batch processing with error collection",
              "Download CSV templates per entity type",
              "Real-time progress tracking",
            ]}
          />
          <Button onClick={() => setShowBulkImport(true)} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Start Bulk Import
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Excel Import: </strong> Make sure your file has headers in
            the first row. Common column names like &quot;First Name&quot;,
            &quot;Phone Number&quot;, etc. will be automatically detected.
          </p>
          <p>
            <strong>Phone Numbers:</strong> We automatically clean and normalize
            phone numbers, removing country codes and formatting.
          </p>
          <p>
            <strong>Duplicates:</strong> Patients with matching phone numbers or
            matching name + date of birth will be flagged duplicate and skipped.
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
