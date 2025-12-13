"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  ArrowRight,
  Database,
  FileSpreadsheet,
  ScanLine,
  Upload,
} from "lucide-react";
import {
  FeatureGate,
  FeatureTierBadge,
  TierBadge,
} from "@/components/common/feature-gate";
import { Feature, Tier } from "@/lib/stores/permission-store";
import { BulkImportDialog } from "@/components/dialogs/bulk-import-dialog";

export default function ImportPage() {
  const [showBulkImport, setShowBulkImport] = useState(false);
  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Digitize your clinic records by importing from Excel or scanning
          documents.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Excel Import - Tier 0 */}
        <Card className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <TierBadge tier={Tier.CAPTURE} />
            </div>
            <CardTitle className="mt-4">Excel Import</CardTitle>
            <CardDescription>
              Import patient data from Excel or CSV files with smart column
              mapping and duplicate detection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Auto-detect column mappings
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Clean phone numbers & names
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Duplicate detection by phone & name
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Preview before importing
              </li>
            </ul>
            <Link href="/import/excel">
              <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Import Excel File
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* OCR Scanner - Uses feature tier from permission store */}
        <Card className="relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                <ScanLine className="h-6 w-6 text-purple-600 dark:text-purple-300" />
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
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                AI handwriting recognition
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Extract medications & dosages
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Auto-enhance scanned images
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Review & correct extracted data
              </li>
            </ul>
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

      {/* Bulk Import Card */}
      <Card className="relative overflow-hidden border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-200 dark:bg-blue-800">
              <Database className="h-6 w-6 text-blue-700 dark:text-blue-200" />
            </div>
            <TierBadge tier={Tier.PRO} />
          </div>
          <CardTitle className="mt-4">Bulk Entity Import</CardTitle>
          <CardDescription>
            Import multiple entities (patients, prescriptions, doctors, lab
            tests, inventory) with AI-powered validation and batch processing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Import 5 entity types (patient, prescription, doctor, lab-test,
              inventory)
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Batch processing with error collection
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Download CSV templates per entity type
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Real-time progress tracking
            </li>
          </ul>
          <Button onClick={() => setShowBulkImport(true)} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Start Bulk Import
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Excel Import:</strong> Make sure your file has headers in
            the first row. Common column names like &quot;First Name&quot;,
            &quot;Phone Number&quot;, etc. will be automatically detected.
          </p>
          <p>
            <strong>Phone Numbers:</strong> We automatically clean and normalize
            phone numbers, removing country codes and formatting.
          </p>
          <p>
            <strong>Duplicates:</strong> Patients with matching phone numbers or
            matching name + date of birth will be flagged as duplicates and
            skipped.
          </p>
        </CardContent>
      </Card>

      {/* Bulk Import Dialog */}
      {showBulkImport && (
        <BulkImportDialog
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
        />
      )}
    </div>
  );
}
