/**
 * Virtualized Patients List - UI Component
 * Pure presentational component for rendering virtualized patient list
 */

import { Card } from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Calendar, Mail, Phone } from "lucide-react";
import type { Patient } from "@workspace/types";

interface VirtualizedPatientsListUIProps {
  patients: Patient[];
  loading: boolean;
  onPatientClick: (patient: Patient) => void;
  getPatientInitials: (patient: Patient) => string;
  getPatientAge: (patient: Patient) => string;
}

export function VirtualizedPatientsListUI({
  patients,
  loading,
  onPatientClick,
  getPatientInitials,
  getPatientAge,
}: VirtualizedPatientsListUIProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No patients found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((patient) => (
        <Card
          key={patient.id}
          className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => onPatientClick(patient)}
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getPatientInitials(patient)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">
                  {patient.firstName} {patient.lastName}
                </h3>
                {patient.gender && (
                  <Badge variant="outline" className="text-xs">
                    {patient.gender}
                  </Badge>
                )}
                {patient.bloodGroup && (
                  <Badge variant="secondary" className="text-xs">
                    {patient.bloodGroup}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {patient.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {getPatientAge(patient)}
                  </span>
                )}
                {patient.phoneNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {patient.phoneNumber}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    {patient.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
