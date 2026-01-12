/**
 * Infinite Patients List - UI Component
 * Pure presentational component for rendering patient list with infinite scroll
 */

import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Card } from "@workspace/ui/components/card";
import { Calendar, Phone, Mail } from "lucide-react";
import type { Patient } from "@workspace/types";

interface InfinitePatientsListUIProps {
  patients: Patient[];
  hasMore: boolean;
  loading: boolean;
  onPatientClick: (patient: Patient) => void;
  onLoadMore: () => void;
  getPatientInitials: (patient: Patient) => string;
  getPatientAge: (patient: Patient) => string;
}

export function InfinitePatientsListUI({
  patients,
  hasMore,
  loading,
  onPatientClick,
  onLoadMore,
  getPatientInitials,
  getPatientAge,
}: InfinitePatientsListUIProps) {
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

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {!loading && patients.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No patients found
        </div>
      )}
    </div>
  );
}
