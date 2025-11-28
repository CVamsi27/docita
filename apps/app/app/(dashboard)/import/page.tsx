"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Upload, Check, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { FeatureGuard } from "@/components/auth/feature-guard"
import { Feature } from "@/lib/stores/permission-store"
import { apiHooks } from "@/lib/api-hooks"

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [step, setStep] = useState<"upload" | "verify">("upload")

  const processOCRMutation = apiHooks.useProcessOCR()
  const createPatientMutation = apiHooks.useCreatePatient()
  const createAppointmentMutation = apiHooks.useCreateAppointment()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      
      // Create preview URL
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreview(objectUrl)
    }
  }

  const handleProcess = async () => {
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await processOCRMutation.mutateAsync(formData as any)
      
      setExtractedData(result)
      setStep("verify")
      toast.success("Data extracted successfully")
    } catch (error) {
      toast.error("Failed to process document")
    }
  }

  const handleSave = async () => {
    try {
      // Create patient
      const patient = await createPatientMutation.mutateAsync({
        firstName: extractedData.patientName?.split(' ')[0] || extractedData.firstName || "Unknown",
        lastName: extractedData.patientName?.split(' ').slice(1).join(' ') || extractedData.lastName || "",
        phoneNumber: extractedData.phoneNumber || "0000000000",
        gender: extractedData.gender || "MALE",
        dateOfBirth: extractedData.dateOfBirth || new Date(new Date().getFullYear() - (parseInt(extractedData.age) || 30)).toISOString(),
        medicalHistory: extractedData.diagnosis ? [extractedData.diagnosis] : []
      })

      // Create appointment
      await createAppointmentMutation.mutateAsync({
        patientId: patient.id!,
        clinicId: "default-clinic-id", // Should come from auth context
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60000).toISOString(),
        type: "consultation",
        status: "confirmed",
        observations: extractedData.diagnosis,
        vitalSign: extractedData.vitals ? {
          bloodPressure: extractedData.vitals.bp,
          temperature: parseFloat(extractedData.vitals.temp),
          pulse: parseInt(extractedData.vitals.pulse)
        } : undefined
      })
      
      toast.success("Record saved successfully")
      router.push("/documents")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save record")
    }
  }

  return (
    <FeatureGuard feature={Feature.EXCEL_IMPORT}>
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
          <p className="text-muted-foreground">
            Upload handwritten prescriptions or reports to extract data automatically.
          </p>
        </div>

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>Select an image or PDF file to process.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="document">Document</Label>
                <Input id="document" type="file" accept="image/*,.pdf" onChange={handleFileChange} />
              </div>

              {preview && (
                <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <Button onClick={handleProcess} disabled={!file || processOCRMutation.isPending}>
                {processOCRMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Extract Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "verify" && extractedData && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Original Document</CardTitle>
              </CardHeader>
              <CardContent>
                {preview && (
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={preview}
                      alt="Original"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verify & Edit Data</CardTitle>
                <CardDescription>Please review the extracted information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>AI Extraction</AlertTitle>
                  <AlertDescription>
                    Please verify all fields carefully against the original document.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input 
                    id="patientName" 
                    value={extractedData.patientName} 
                    onChange={(e) => setExtractedData({...extractedData, patientName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date"
                    value={extractedData.date} 
                    onChange={(e) => setExtractedData({...extractedData, date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis</Label>
                  <Input 
                    id="diagnosis" 
                    value={extractedData.diagnosis} 
                    onChange={(e) => setExtractedData({...extractedData, diagnosis: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Medications</Label>
                  <Textarea 
                    id="medications" 
                    value={extractedData.medications} 
                    onChange={(e) => setExtractedData({...extractedData, medications: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    value={extractedData.notes} 
                    onChange={(e) => setExtractedData({...extractedData, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSave} 
                    className="flex-1"
                    disabled={createPatientMutation.isPending || createAppointmentMutation.isPending}
                  >
                    {(createPatientMutation.isPending || createAppointmentMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Record
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </FeatureGuard>
  )
}
