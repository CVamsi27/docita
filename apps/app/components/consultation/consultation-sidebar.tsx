"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Activity,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";

interface PatientInfo {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string | Date;
  phoneNumber?: string;
  email?: string;
  address?: string;
  medicalHistory?: string | string[];
  allergies?: string | string[];
}

interface DoctorInfo {
  name: string;
}

interface AppointmentData {
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  startTime: string | Date;
  endTime: string | Date;
  type: string;
}

interface ConsultationSidebarProps {
  appointment: AppointmentData;
}

const calculateAge = (dateOfBirth: string | Date): number => {
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

export function ConsultationSidebar({ appointment }: ConsultationSidebarProps) {
  const patient = appointment?.patient;
  const doctor = appointment?.doctor;

  if (!patient) {
    return null;
  }

  const initials =
    `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase();
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : "N/A";

  // Normalize medicalHistory and allergies to arrays
  const medicalHistoryArray = patient.medicalHistory
    ? Array.isArray(patient.medicalHistory)
      ? patient.medicalHistory
      : [patient.medicalHistory]
    : [];
  const allergiesArray = patient.allergies
    ? Array.isArray(patient.allergies)
      ? patient.allergies
      : [patient.allergies]
    : [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-muted/30">
      {/* Patient Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">
                {patient.firstName} {patient.lastName}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="h-5 px-2">
                  {patient.gender}
                </Badge>
                <span>{age} years</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {patient.phoneNumber && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{patient.phoneNumber}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{patient.email}</span>
              </div>
            )}
            {patient.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-xs">{patient.address}</span>
              </div>
            )}
          </div>

          {patient.dateOfBirth && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  DOB: {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(appointment.startTime), "EEEE, MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(appointment.startTime), "h:mm a")} -{" "}
              {format(new Date(appointment.endTime), "h:mm a")}
            </span>
          </div>
          {doctor && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{doctor.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="capitalize">
              {appointment.type}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Medical History Card */}
      {medicalHistoryArray.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {medicalHistoryArray
                .slice(0, 5)
                .map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Allergies Card */}
      {allergiesArray.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive">
              Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {allergiesArray.map((allergy: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-destructive mt-1">⚠</span>
                  <span>{allergy}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
