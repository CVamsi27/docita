"use client"

import { API_URL } from "@/lib/api"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Scan, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Progress } from "@workspace/ui/components/progress"
import Link from "next/link"

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    total: number
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(10)

    const formData = new FormData()
    formData.append("file", file)

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`${API_URL}/imports/patients`, {
        method: "POST",
        body: formData,
      })

      clearInterval(interval)
      setProgress(100)

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Import failed:", error)
      setResult({
        total: 0,
        success: 0,
        failed: 1,
        errors: ["Network error or server failed to process file"],
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    // Create a dummy CSV for template
    const headers = ["First Name,Last Name,Phone Number,Gender,Date of Birth,Email,Address,Blood Group,Allergies,Medical History"]
    const example = ["John,Doe,9876543210,MALE,1990-01-01,john@example.com,123 Main St,O+,Peanuts,Hypertension"]
    const csvContent = "data:text/csv;charset=utf-8," + headers.join("\n") + "\n" + example.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "patient_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import patients from Excel or CSV files.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Upload your patient data file here. Supported formats: .xlsx, .csv
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/import/ocr'}>
              <Scan className="mr-2 h-4 w-4" />
              Switch to Handwritten OCR (Beta)
            </Button>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 hover:bg-muted/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2 text-center">
                Drag and drop your file here, or click to select
              </p>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                id="file-upload"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button variant="secondary" asChild className="cursor-pointer">
                  <span>Select File</span>
                </Button>
              </label>
              {file && (
                <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={downloadTemplate}>
                Download Template
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Importing..." : "Start Import"}
              </Button>
            </div>

            {uploading && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Status</CardTitle>
            <CardDescription>View the results of your import.</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !uploading && (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mb-4 opacity-20" />
                <p>No import results yet</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold">{result.total}</div>
                    <div className="text-xs text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded-lg text-green-600">
                    <div className="text-2xl font-bold">{result.success}</div>
                    <div className="text-xs">Successful</div>
                  </div>
                  <div className="bg-red-500/10 p-3 rounded-lg text-red-600">
                    <div className="text-2xl font-bold">{result.failed}</div>
                    <div className="text-xs">Failed</div>
                  </div>
                </div>

                {result.failed > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Import Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2 space-y-1 text-xs max-h-[150px] overflow-y-auto">
                        {result.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {result.failed === 0 && result.total > 0 && (
                  <Alert className="border-green-500/50 text-green-600 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                      All records imported successfully!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
