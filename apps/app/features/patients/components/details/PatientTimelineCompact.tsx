"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Pill,
} from "lucide-react";
import { Appointment } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";

interface PatientTimelineCompactProps {
  appointments: Appointment[];
  onViewDetails?: (appointmentId: string) => void;
  onRepeatPrescription?: (appointmentId: string) => void;
}

export const PatientTimelineCompact: React.FC<PatientTimelineCompactProps> = ({
  appointments,
  onViewDetails,
  onRepeatPrescription,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (appointments.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mb-4 opacity-10" />
          <p className="text-lg font-medium">No visits recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground border-b mb-2">
        <div className="flex-1 md:w-32 md:flex-none">Date</div>
        <div className="flex-1 md:w-40 md:flex-none hidden md:block">Type</div>
        <div className="flex-2 hidden md:block">Diagnosis / Complaint</div>
        <div className="flex-1 md:w-32 md:flex-none text-right md:text-left">
          Status
        </div>
        <div className="w-10"></div>
      </div>
      {appointments.map((apt) => (
        <Card
          key={apt.id}
          className={`border transition-all duration-200 overflow-hidden ${
            expandedId === apt.id
              ? "shadow-md ring-1 ring-primary/20"
              : "hover:bg-accent/50"
          }`}
        >
          <div
            className="flex items-center px-4 py-3 cursor-pointer"
            onClick={() => apt.id && toggleExpand(apt.id)}
          >
            <div className="flex-1 md:w-32 md:flex-none flex flex-col">
              <span className="font-semibold text-foreground">
                {format(new Date(apt.startTime), "MMM d, yyyy")}
              </span>
              <span className="text-xs text-muted-foreground md:hidden">
                {apt.type} • {apt.doctor?.name}
              </span>
            </div>

            <div className="flex-1 md:w-40 md:flex-none hidden md:flex items-center gap-2 text-sm">
              <Badge variant="outline" className="font-normal">
                {apt.type}
              </Badge>
            </div>

            <div className="flex-2 min-w-0 hidden md:flex flex-col justify-center text-sm truncate px-4">
              <span className="font-medium truncate text-foreground">
                {apt.finalDiagnosis || apt.chiefComplaint || "No diagnosis"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                Dr. {apt.doctor?.name}
              </span>
            </div>

            <div className="flex-1 md:w-32 md:flex-none flex justify-end md:justify-start">
              <Badge
                variant={
                  apt.status === "completed"
                    ? "default"
                    : apt.status === "cancelled"
                      ? "destructive"
                      : "secondary"
                }
                className="capitalize h-6"
              >
                {apt.status}
              </Badge>
            </div>

            <div className="w-10 flex justify-end">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {expandedId === apt.id ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {expandedId === apt.id && (
            <div className="px-4 pb-4 bg-muted/20 border-t animate-in slide-in-from-top-2 duration-200">
              <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                      <FileText className="h-4 w-4" /> Clinical Summary
                    </h4>
                    <div className="text-sm space-y-2 bg-background p-3 rounded-md border">
                      {apt.chiefComplaint && (
                        <div>
                          <span className="font-medium text-xs text-muted-foreground uppercase">
                            Chief Complaint
                          </span>
                          <p>{apt.chiefComplaint}</p>
                        </div>
                      )}
                      {apt.finalDiagnosis && (
                        <div className="mt-2">
                          <span className="font-medium text-xs text-muted-foreground uppercase">
                            Diagnosis
                          </span>
                          <p>{apt.finalDiagnosis}</p>
                        </div>
                      )}
                      {apt.treatmentPlan && (
                        <div className="mt-2">
                          <span className="font-medium text-xs text-muted-foreground uppercase">
                            Plan
                          </span>
                          <p>{apt.treatmentPlan}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {apt.vitalSign && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                        <Activity className="h-4 w-4" /> Vitals
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm bg-background p-3 rounded-md border">
                        {apt.vitalSign.bloodPressure && (
                          <div>
                            <span className="text-muted-foreground">BP:</span>{" "}
                            {apt.vitalSign.bloodPressure}
                          </div>
                        )}
                        {apt.vitalSign.pulse && (
                          <div>
                            <span className="text-muted-foreground">HR:</span>{" "}
                            {apt.vitalSign.pulse}
                          </div>
                        )}
                        {apt.vitalSign.weight && (
                          <div>
                            <span className="text-muted-foreground">Wt:</span>{" "}
                            {apt.vitalSign.weight} kg
                          </div>
                        )}
                        {apt.vitalSign.temperature && (
                          <div>
                            <span className="text-muted-foreground">Temp:</span>{" "}
                            {apt.vitalSign.temperature}°C
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {apt.prescription && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                        <Pill className="h-4 w-4" /> Prescription
                      </h4>
                      <div className="bg-background p-3 rounded-md border text-sm">
                        <div className="space-y-1">
                          {apt.prescription.medications
                            ?.slice(0, 3)
                            .map((med, i) => (
                              <div
                                key={i}
                                className="flex justify-between items-center text-xs"
                              >
                                <span className="font-medium">{med.name}</span>
                                <span className="text-muted-foreground">
                                  {med.dosage}
                                </span>
                              </div>
                            ))}
                          {(apt.prescription.medications?.length || 0) > 3 && (
                            <div className="text-xs text-muted-foreground pt-1 italic">
                              +{" "}
                              {(apt.prescription.medications?.length || 0) - 3}{" "}
                              more
                            </div>
                          )}
                        </div>
                        {apt.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 h-7 text-xs"
                            onClick={() =>
                              apt.id && onRepeatPrescription?.(apt.id)
                            }
                          >
                            Repeat Prescription
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                      Actions
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => apt.id && onViewDetails?.(apt.id)}
                      >
                        View Details <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};
