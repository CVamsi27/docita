"use client";

import { use } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Calendar,
  FileText,
  Pill,
  Receipt,
  Activity,
  ArrowLeft,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { apiHooks } from "@/lib/api-hooks";
import { StatusBadge } from "@/components/ui/status-badge";

interface PatientHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default function PatientHistoryPage({
  params,
}: PatientHistoryPageProps) {
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const { data: patient, isLoading: patientLoading } =
    apiHooks.usePatient(patientId);
  const { data: appointments = [], isLoading: appointmentsLoading } =
    apiHooks.usePatientAppointments(patientId);

  const loading = patientLoading || appointmentsLoading;
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "";

  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  if (loading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/patients/${patientId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patient
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Medical History</h1>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {sortedAppointments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No appointment history</p>
              <p className="text-sm text-muted-foreground">
                This patient has no recorded appointments yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedAppointments.map((appointment, index) => (
            <Card key={appointment.id} className="relative overflow-hidden">
              {/* Timeline connector */}
              {index !== sortedAppointments.length - 1 && (
                <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-border -mb-6" />
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="relative shrink-0">
                      <div className="h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">
                          {new Date(appointment.startTime).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </CardTitle>
                        <StatusBadge status={appointment.status} />
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(appointment.startTime).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                        <span className="mx-1">•</span>
                        <span className="capitalize">{appointment.type}</span>
                        {appointment.doctor && (
                          <>
                            <span className="mx-1">•</span>
                            <span>{appointment.doctor.name}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pl-12 space-y-4">
                {/* Observations */}
                {appointment.observations && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      Clinical Observations
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap font-mono">
                        {appointment.observations}
                      </p>
                    </div>
                  </div>
                )}

                {/* Vital Signs */}
                {appointment.vitalSign && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Activity className="h-4 w-4 text-green-600" />
                      Vital Signs
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {appointment.vitalSign.height && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">
                            Height
                          </p>
                          <p className="text-sm font-medium">
                            {appointment.vitalSign.height} cm
                          </p>
                        </div>
                      )}
                      {appointment.vitalSign.weight && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">
                            Weight
                          </p>
                          <p className="text-sm font-medium">
                            {appointment.vitalSign.weight} kg
                          </p>
                        </div>
                      )}
                      {appointment.vitalSign.bloodPressure && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">BP</p>
                          <p className="text-sm font-medium">
                            {appointment.vitalSign.bloodPressure}
                          </p>
                        </div>
                      )}
                      {appointment.vitalSign.pulse && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Pulse</p>
                          <p className="text-sm font-medium">
                            {appointment.vitalSign.pulse} bpm
                          </p>
                        </div>
                      )}
                      {appointment.vitalSign.temperature && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Temp</p>
                          <p className="text-sm font-medium">
                            {appointment.vitalSign.temperature}°F
                          </p>
                        </div>
                      )}
                      {appointment.vitalSign.spo2 && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">SpO2</p>
                          <p className="text-sm font-medium">
                            {appointment.vitalSign.spo2}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prescription */}
                {appointment.prescription && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Pill className="h-4 w-4 text-blue-600" />
                      Prescription
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      {appointment.prescription.medications?.map((med, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{med.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {med.dosage} • {med.frequency} • {med.duration}
                            </p>
                          </div>
                        </div>
                      ))}
                      {appointment.prescription.instructions && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">
                            Instructions:
                          </p>
                          <p className="text-sm">
                            {appointment.prescription.instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Invoice */}
                {appointment.invoice && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Receipt className="h-4 w-4 text-orange-600" />
                      Invoice
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Total Amount</p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.invoice.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ₹{appointment.invoice.total?.toFixed(2)}
                          </p>
                          <Badge
                            variant={
                              appointment.invoice.status === "paid"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {appointment.invoice.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {appointment.notes && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Appointment Notes
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {appointment.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
