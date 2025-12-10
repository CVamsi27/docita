"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Badge } from "@workspace/ui/components/badge";
import { ChevronDown, Clock, Stethoscope } from "lucide-react";
import { useObservationsForm } from "@/hooks/use-observations-form";
import { apiHooks } from "@/lib/api-hooks";
import { format } from "date-fns";

interface ConsultationNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  patientName?: string;
  onSaved?: () => void;
}

interface PastConsultation {
  id: string;
  date: Date;
  type: string;
  doctorName?: string;
  observations?: string;
  chiefComplaint?: string;
}

export function ConsultationNotesModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patientName,
  onSaved,
}: ConsultationNotesModalProps) {
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  // Fetch patient's previous appointments for history
  const { data: appointments = [] } =
    apiHooks.usePatientAppointments(patientId);

  // Filter past consultations (exclude current appointment)
  const pastConsultations: PastConsultation[] = appointments
    .filter((apt) => apt.id !== appointmentId && apt.status === "completed")
    .map((apt) => ({
      id: apt.id || "",
      date: new Date(apt.startTime),
      type: apt.type,
      doctorName: apt.doctor?.name,
      observations: apt.observations,
      chiefComplaint: apt.chiefComplaint,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5); // Show last 5 consultations

  const { loading, observations, setObservations, handleSubmit } =
    useObservationsForm({
      appointmentId,
      onObservationsSaved: () => {
        onSaved?.();
        onOpenChange(false);
      },
    });

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleNotesSubmit = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Consultation Notes${patientName ? ` - ${patientName}` : ""}`}
      isLoading={loading}
      onSubmit={handleNotesSubmit}
      submitLabel={loading ? "Saving..." : "Save Notes"}
      contentClassName="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6 py-4">
        {/* Previous Consultation History */}
        {pastConsultations.length > 0 && (
          <Collapsible open={historyExpanded} onOpenChange={setHistoryExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    Previous Consultations ({pastConsultations.length})
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    historyExpanded ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {pastConsultations.map((consultation) => (
                  <Collapsible
                    key={consultation.id}
                    open={expandedItems[consultation.id]}
                    onOpenChange={() => toggleItem(consultation.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {format(consultation.date, "MMM d, yyyy")}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {consultation.type}
                                </Badge>
                              </div>
                              {consultation.doctorName && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Stethoscope className="h-3 w-3" />
                                  {consultation.doctorName}
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedItems[consultation.id] ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 pt-0 border-t bg-muted/10">
                          {consultation.chiefComplaint && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Chief Complaint:
                              </span>
                              <p className="text-sm mt-1">
                                {consultation.chiefComplaint}
                              </p>
                            </div>
                          )}
                          {consultation.observations && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Observations:
                              </span>
                              <p className="text-sm mt-1 whitespace-pre-wrap">
                                {consultation.observations}
                              </p>
                            </div>
                          )}
                          {!consultation.observations &&
                            !consultation.chiefComplaint && (
                              <p className="text-sm text-muted-foreground italic">
                                No notes recorded
                              </p>
                            )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Current Notes Form */}
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="observations" className="text-base font-medium">
              Clinical Notes & Observations
            </Label>
            <Textarea
              id="observations"
              placeholder="Enter clinical observations, examination findings, diagnosis notes..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="min-h-[200px] font-mono text-sm resize-none"
            />
          </div>
        </form>
      </div>
    </CRUDDialog>
  );
}
