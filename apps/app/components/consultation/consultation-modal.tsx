"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Stethoscope, Maximize2 } from "lucide-react"
import Link from "next/link"
import { ConsultationContent } from "./consultation-content"

interface ConsultationModalProps {
  appointmentId: string
  patientId: string
  doctorId: string
  patientName: string
  trigger?: React.ReactNode
  defaultTab?: "observations" | "vitals" | "prescription" | "invoice"
}

export function ConsultationModal({ 
  appointmentId, 
  patientId, 
  doctorId, 
  patientName,
  trigger,
  defaultTab = "observations"
}: ConsultationModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Stethoscope className="h-4 w-4" />
            Start Consultation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="p-6 border-b border-border bg-muted/10 flex justify-between items-start">
          <DialogHeader>
            <DialogTitle className="text-2xl">Consultation: {patientName}</DialogTitle>
            <DialogDescription>
              Manage clinical notes, vitals, prescriptions, and billing for this visit.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/consultation/${appointmentId}`}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Focused View
            </Link>
          </Button>
        </div>

        <ConsultationContent 
          appointmentId={appointmentId}
          patientId={patientId}
          doctorId={doctorId}
          defaultTab={defaultTab}
        />
      </DialogContent>
    </Dialog>
  )
}
