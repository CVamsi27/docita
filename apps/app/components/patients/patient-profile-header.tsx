"use client"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  Edit,
  Shield
} from "lucide-react"
import { format } from "date-fns"
import type { Patient } from "@workspace/types"

interface PatientProfileHeaderProps {
  patient: Patient
  initials: string
  age: string | number
  onEdit?: () => void
}

export function PatientProfileHeader({ patient, initials, age, onEdit }: PatientProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-background/60 p-8 backdrop-blur-xl shadow-sm transition-all hover:shadow-md">
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-6 md:flex-row">
          <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
            <AvatarFallback className="text-4xl bg-primary/10 text-primary font-light">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {patient.firstName} {patient.lastName}
                </h1>
                <Badge variant={patient.gender === 'MALE' ? 'default' : 'secondary'} className="rounded-full px-3">
                  {patient.gender}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3">
                  {age} years
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 opacity-70" />
                  <span>DOB: {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "MMM d, yyyy") : "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 opacity-70" />
                  <span>ID: {patient.id?.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {patient.email && (
                <Badge variant="secondary" className="gap-1.5 py-1.5 pl-2 pr-3 font-normal">
                  <Mail className="h-3.5 w-3.5 opacity-70" />
                  {patient.email}
                </Badge>
              )}
              {patient.phoneNumber && (
                <Badge variant="secondary" className="gap-1.5 py-1.5 pl-2 pr-3 font-normal">
                  <Phone className="h-3.5 w-3.5 opacity-70" />
                  {patient.phoneNumber}
                </Badge>
              )}
              {patient.address && (
                <Badge variant="secondary" className="gap-1.5 py-1.5 pl-2 pr-3 font-normal">
                  <MapPin className="h-3.5 w-3.5 opacity-70" />
                  {patient.address}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full" onClick={onEdit}>
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>
    </div>
  )
}
