"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { ArrowLeft, Printer, Share2, Edit } from "lucide-react"
import { API_URL } from "@/lib/api"
import { format } from "date-fns"

export default function PrescriptionViewPage() {
  const params = useParams()
  const router = useRouter()
  const prescriptionId = params.id as string
  
  const [prescription, setPrescription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrescription()
  }, [prescriptionId])

  const loadPrescription = async () => {
    try {
      const token = localStorage.getItem("docita_token")
      const response = await fetch(`${API_URL}/prescriptions/${prescriptionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setPrescription(data)
      }
    } catch (error) {
      console.error("Failed to load prescription:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    if (prescription?.appointmentId) {
      router.push(`/consultation/${prescription.appointmentId}?tab=prescription`)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShareWhatsApp = () => {
    if (!prescription) return

    const patientName = prescription.patient 
      ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
      : "Patient"
    
    const doctorName = prescription.doctor?.name || "Doctor"
    const date = format(new Date(prescription.createdAt), "dd/MM/yyyy")
    
    let message = `*Prescription for ${patientName}*\n\n`
    message += `Date: ${date}\n`
    message += `Doctor: ${doctorName}\n\n`
    message += `*Medications:*\n`
    
    prescription.medications?.forEach((med: any, index: number) => {
      message += `${index + 1}. ${med.name}\n`
      message += `   Dosage: ${med.dosage}\n`
      message += `   Frequency: ${med.frequency}\n`
      message += `   Duration: ${med.duration}\n\n`
    })
    
    if (prescription.instructions) {
      message += `*Instructions:*\n${prescription.instructions}\n`
    }

    const phoneNumber = prescription.patient?.phoneNumber?.replace(/[^0-9]/g, '')
    const whatsappUrl = phoneNumber 
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading prescription...</p>
        </div>
      </div>
    )
  }

  if (!prescription) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Prescription not found</p>
        <Button onClick={() => router.push("/records")}>Back to Records</Button>
      </div>
    )
  }

  const patientName = prescription.patient 
    ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
    : "Patient"
  
  const doctorName = prescription.doctor?.name || "Doctor"

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prescription</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(prescription.createdAt), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Prescription Content */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Prescription</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Date: {format(new Date(prescription.createdAt), "dd MMMM yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{doctorName}</p>
              <p className="text-sm text-muted-foreground">Physician</p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Patient Name</p>
            <p className="font-semibold text-lg">{patientName}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Medications */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Medications</h3>
            <div className="space-y-4">
              {prescription.medications?.map((med: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg bg-muted/20">
                  <p className="font-semibold text-base">{index + 1}. {med.name}</p>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Dosage</p>
                      <p className="font-medium">{med.dosage}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium">{med.frequency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{med.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          {prescription.instructions && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Instructions</h3>
              <p className="text-sm bg-muted/20 p-4 rounded-lg whitespace-pre-wrap">
                {prescription.instructions}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t text-center text-sm text-muted-foreground">
            <p>This is a digitally generated prescription</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
