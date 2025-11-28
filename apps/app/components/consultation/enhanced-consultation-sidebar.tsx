"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Activity,
  CalendarPlus,
  AlertTriangle,
  Mic,
  Pill,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";

// Import new enhanced components
import { ConsultationTimer } from "@/components/consultation/consultation-timer";
import { QuickFollowUp } from "@/components/appointments/follow-up-scheduler";
import { AllergyAlert } from "@/components/consultation/patient-summary-card";
import { VoiceRecorder } from "@/components/common/voice-recorder";
import { DrugInteractionCheckerDynamic } from "@/lib/dynamic-imports";

interface PatientInfo {
  id?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string | Date;
  phoneNumber?: string;
  email?: string;
  address?: string;
  medicalHistory?: string | string[];
  allergies?: string | string[];
  bloodGroup?: string;
}

interface DoctorInfo {
  name: string;
}

interface AppointmentData {
  id?: string;
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  startTime: string | Date;
  endTime: string | Date;
  type: string;
}

interface EnhancedConsultationSidebarProps {
  appointment: AppointmentData;
  currentMedications?: string[];
  onAddObservation?: (text: string) => void;
  onFollowUpScheduled?: (days: number) => void;
}

const calculateAge = (dateOfBirth: string | Date): number => {
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

export function EnhancedConsultationSidebar({
  appointment,
  currentMedications = [],
  onAddObservation,
  onFollowUpScheduled,
}: EnhancedConsultationSidebarProps) {
  const patient = appointment?.patient;
  const doctor = appointment?.doctor;
  const [showDrugChecker, setShowDrugChecker] = React.useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = React.useState(false);

  if (!patient) {
    return null;
  }

  const initials =
    `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase();
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : "N/A";
  const patientName =
    `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

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

  // Convert allergies to expected format
  const formattedAllergies = allergiesArray.map((allergy, index) => ({
    id: `allergy-${index}`,
    allergen: allergy,
    severity: "moderate" as const,
  }));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-muted/30">
      {/* Allergy Alert Banner - Always on top if present */}
      {allergiesArray.length > 0 && (
        <AllergyAlert allergies={formattedAllergies} />
      )}

      {/* Consultation Timer */}
      <ConsultationTimer appointmentId={appointment.id || ""} autoStart />

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
              <p className="font-semibold">{patientName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="h-5 px-2">
                  {patient.gender}
                </Badge>
                <span>{age} years</span>
                {patient.bloodGroup && (
                  <Badge variant="secondary" className="h-5 px-2">
                    {patient.bloodGroup}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {patient.phoneNumber && (
              <a
                href={`tel:${patient.phoneNumber}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>{patient.phoneNumber}</span>
              </a>
            )}
            {patient.email && (
              <a
                href={`mailto:${patient.email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="truncate">{patient.email}</span>
              </a>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Voice Dictation Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          >
            <Mic className="h-4 w-4" />
            {showVoiceRecorder ? "Hide Voice Recorder" : "Voice Dictation"}
          </Button>

          {showVoiceRecorder && onAddObservation && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <VoiceRecorder onTranscript={onAddObservation} />
            </div>
          )}

          {/* Drug Interaction Checker Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setShowDrugChecker(!showDrugChecker)}
          >
            <Pill className="h-4 w-4" />
            {showDrugChecker ? "Hide Drug Checker" : "Check Drug Interactions"}
          </Button>

          {showDrugChecker && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <DrugInteractionCheckerDynamic
                medications={currentMedications.map((name) => ({
                  name,
                  dosage: "",
                  frequency: "",
                }))}
                patientAllergies={allergiesArray}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Follow-up */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Schedule Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickFollowUp onScheduled={onFollowUpScheduled} />
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
              {medicalHistoryArray.length > 5 && (
                <li className="text-xs text-muted-foreground">
                  +{medicalHistoryArray.length - 5} more items
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Allergies Card - Detailed view */}
      {allergiesArray.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Known Allergies
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

      {/* Keyboard Shortcuts Hint */}
      <div className="text-xs text-muted-foreground text-center pt-2">
        Press{" "}
        <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px]">
          ⌘K
        </kbd>{" "}
        for quick actions
      </div>
    </div>
  );
}
