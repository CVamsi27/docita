/* eslint-disable @next/next/no-img-element */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Upload, Scan, CheckCircle2, AlertCircle, Loader2, User, FileText, Activity, ArrowLeft, Smartphone } from "lucide-react"
import { API_URL } from "@/lib/api"
import { QRCodeSVG } from "qrcode.react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@workspace/ui/components/dialog"
import Link from "next/link"
import { apiHooks } from "@/lib/api-hooks"
import { toast } from "sonner"

export default function OCRPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)
  
  // QR Code State
  const [showQr, setShowQr] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  // Mutations
  const processOCRMutation = apiHooks.useProcessOCR()
  const createPatientMutation = apiHooks.useCreatePatient()
  const createAppointmentMutation = apiHooks.useCreateAppointment()

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "MALE",
    phoneNumber: "",
    diagnosis: "",
    vitals: {
      bp: "",
      temp: "",
      pulse: ""
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setScanned(false)
    }
  }

  const startMobileUpload = async () => {
    try {
      const res = await fetch(`${API_URL}/uploads/session`, { method: "POST" })
      const data = await res.json()
      // In dev, use localhost. In prod, use actual domain.
      // For now, we assume the user is on the same network or using a tunnel if testing on mobile.
      const origin = window.location.origin
      setQrUrl(`${origin}/mobile-upload/${data.id}`)
      setShowQr(true)
      pollSession(data.id)
    } catch (error) {
      console.error("Failed to start session", error)
      alert("Could not start mobile session")
    }
  }

  const pollSession = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/uploads/session/${id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === "uploaded" && data.fileUrl) {
            clearInterval(interval)
            setShowQr(false)
            
            // Construct the full URL. 
            // In dev, the backend returns a relative path like "uploads/temp/file.jpg".
            // We need to prepend the API base URL if it's served from there, or just use the relative path if proxied.
            // Since we set up ServeStatic at '/uploads', and the fileUrl stored is likely the file system path,
            // we need to clean it up.
            // The backend stores "uploads/temp/filename.ext".
            // We want "http://localhost:3001/uploads/temp/filename.ext".
            
            const filename = data.fileUrl.split('/').pop();
            const realUrl = `${API_URL}/uploads/temp/${filename}`;
            
            setPreviewUrl(realUrl) 
            
            // Convert URL to File object for the form
            fetch(realUrl)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], filename, { type: blob.type })
                setFile(file)
                setScanned(false)
              })
          }
        }
      } catch (e) {
        console.error("Polling error", e)
      }
    }, 2000)

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  const handleScan = async () => {
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const result = await processOCRMutation.mutateAsync(formData as any)
      
      setFormData({
        firstName: result.firstName || "",
        lastName: result.lastName || "",
        age: result.age || "",
        gender: result.gender || "MALE",
        phoneNumber: result.phoneNumber || "",
        diagnosis: result.diagnosis || "",
        vitals: {
          bp: result.vitals?.bp || "",
          temp: result.vitals?.temp || "",
          pulse: result.vitals?.pulse || ""
        }
      })
      
      setScanned(true)
      toast.success("Document scanned successfully")
    } catch (error) {
      toast.error("Failed to scan document")
    }
  }

  const handleSave = async () => {
    try {
      // 1. Create Patient
      const patient = await createPatientMutation.mutateAsync({
        firstName: formData.firstName || "Unknown",
        lastName: formData.lastName || "",
        phoneNumber: formData.phoneNumber || "0000000000",
        gender: formData.gender as "MALE" | "FEMALE" | "OTHER",
        dateOfBirth: new Date(new Date().getFullYear() - parseInt(formData.age)).toISOString(),
        medicalHistory: [formData.diagnosis]
      })

      // 2. Create Appointment (Visit)
      await createAppointmentMutation.mutateAsync({
        patientId: patient.id!,
        clinicId: "default-clinic-id", // Should come from auth context
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60000).toISOString(),
        type: "consultation",
        status: "confirmed",
        observations: formData.diagnosis,
        vitalSign: {
          bloodPressure: formData.vitals.bp,
          temperature: parseFloat(formData.vitals.temp),
          pulse: parseInt(formData.vitals.pulse)
        }
      })

      toast.success("Patient and visit created successfully")
      router.push(`/patients/${patient.id}`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to save record. Please try again.")
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/import">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Import
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Smart OCR Digitization</h1>
        <p className="text-muted-foreground">
          Upload a photo of a prescription or case sheet to auto-extract details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Upload & Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Upload Document</CardTitle>
              <CardDescription>Take a photo or upload an image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 hover:bg-muted/50 transition-colors relative overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2 text-center">
                      Click to upload or drag and drop
                    </p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline"
                  onClick={startMobileUpload}
                  disabled={processOCRMutation.isPending || scanned}
                >
                  <Smartphone className="mr-2 h-4 w-4" /> Scan with Phone
                </Button>
                <Button 
                  onClick={handleScan} 
                  disabled={!file || processOCRMutation.isPending || scanned}
                >
                  {processOCRMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-4 w-4" /> {scanned ? "Rescan" : "Scan Image"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Tips for best results:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Ensure good lighting and clear handwriting.</li>
                  <li>Capture the entire page including headers.</li>
                  <li>Avoid shadows and blur.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Correction Panel */}
        <div className="space-y-6">
          <Card className={!scanned ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle>2. Staff Correction Panel</CardTitle>
              <CardDescription>Verify and correct the extracted information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <User className="h-4 w-4" /> Patient Information
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input 
                      value={formData.firstName} 
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input 
                      value={formData.lastName} 
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input 
                      value={formData.age} 
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={formData.phoneNumber} 
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border my-4"></div>

              {/* Clinical Data */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <FileText className="h-4 w-4" /> Clinical Findings
                </div>
                <div className="space-y-2">
                  <Label>Diagnosis / Symptoms</Label>
                  <Textarea 
                    value={formData.diagnosis} 
                    onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>

              <div className="border-t border-border my-4"></div>

              {/* Vitals */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Activity className="h-4 w-4" /> Vitals
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>BP</Label>
                    <Input 
                      value={formData.vitals.bp} 
                      onChange={(e) => setFormData({...formData, vitals: {...formData.vitals, bp: e.target.value}})}
                      placeholder="120/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temp (°F)</Label>
                    <Input 
                      value={formData.vitals.temp} 
                      onChange={(e) => setFormData({...formData, vitals: {...formData.vitals, temp: e.target.value}})}
                      placeholder="98.6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pulse</Label>
                    <Input 
                      value={formData.vitals.pulse} 
                      onChange={(e) => setFormData({...formData, vitals: {...formData.vitals, pulse: e.target.value}})}
                      placeholder="72"
                    />
                  </div>
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                onClick={handleSave} 
                disabled={createPatientMutation.isPending || createAppointmentMutation.isPending}
              >
                {(createPatientMutation.isPending || createAppointmentMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Record...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Create Patient & Visit
                  </>
                )}
              </Button>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan with Phone</DialogTitle>
            <DialogDescription>
              Scan this QR code with your mobile camera to upload a document directly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              {qrUrl && <QRCodeSVG value={qrUrl} size={200} />}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Waiting for upload... <Loader2 className="inline h-3 w-3 animate-spin" />
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
