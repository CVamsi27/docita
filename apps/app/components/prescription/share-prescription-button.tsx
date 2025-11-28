"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { MessageCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

interface SharePrescriptionButtonProps {
  /** Unique identifier for the prescription */
  prescriptionId: string
  /** Patient's phone number (will be formatted for WhatsApp) */
  patientPhone: string
  /** Patient's name for personalized message */
  patientName: string
  /** Button variant style */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * SharePrescriptionButton Component
 * 
 * Allows sharing prescription PDFs via WhatsApp with a pre-filled message.
 * Handles phone number formatting and PDF URL generation.
 * 
 * @example
 * ```tsx
 * <SharePrescriptionButton
 *   prescriptionId="123"
 *   patientPhone="9876543210"
 *   patientName="John Doe"
 * />
 * ```
 */
export function SharePrescriptionButton({
  prescriptionId,
  patientPhone,
  patientName,
  variant = "outline",
  size = "sm"
}: SharePrescriptionButtonProps) {
  const [loading, setLoading] = useState(false)

  /**
   * Handles the WhatsApp share action
   * - Formats phone number for WhatsApp
   * - Generates PDF URL
   * - Creates pre-filled message
   * - Opens WhatsApp in new tab
   */
  const handleShare = async () => {
    try {
      setLoading(true)

      // Validate phone number
      if (!patientPhone || patientPhone.trim() === "") {
        toast.error("Patient phone number is required")
        return
      }
      
      // Get PDF URL
      const pdfUrl = `${API_URL}/prescriptions/${prescriptionId}/pdf`

      // Clean and format phone number for WhatsApp
      const cleanNumber = patientPhone.replace(/\D/g, "")
      if (cleanNumber.length < 10) {
        toast.error("Invalid phone number")
        return
      }
      const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber

      // Create personalized WhatsApp message
      const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'Docita Clinic'
      const message = `Hello ${patientName},\n\nYour prescription is ready. You can download it here:\n${pdfUrl}\n\nPlease save this link or download the PDF for your records.\n\nBest regards,\n${clinicName}`
      
      const encodedMessage = encodeURIComponent(message)
      const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`

      // Open WhatsApp in new tab
      window.open(whatsappUrl, "_blank")
      toast.success("Opening WhatsApp...")
    } catch (error) {
      console.error("Failed to share prescription:", error)
      toast.error("Failed to share prescription. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={loading}
      className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
      aria-label={`Share prescription with ${patientName} via WhatsApp`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>Share via WhatsApp</span>
        </>
      )}
    </Button>
  )
}
