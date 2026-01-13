"use client";

import React, { FC, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { FileText } from "lucide-react";

export const SubscriptionSettingsDynamic: FC<{ clinicId?: string }> = () => {
  const plans = [
    {
      name: "Basic",
      price: "₹999/mo",
      features: ["Up to 100 patients", "Basic reports", "Email support"],
    },
    {
      name: "Pro",
      price: "₹2,499/mo",
      features: [
        "Unlimited patients",
        "Advanced analytics",
        "Priority support",
        "API access",
      ],
      current: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      features: [
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
        "On-premise option",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>You are currently on the Pro plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <p className="font-bold text-lg">Pro Plan</p>
              <p className="text-sm text-muted-foreground">
                ₹2,499/month • Billed monthly
              </p>
            </div>
            <Badge className="bg-primary">Active</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`border-none shadow-lg ${plan.current ? "ring-2 ring-primary" : ""}`}
          >
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <p className="text-2xl font-bold">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-4"
                variant={plan.current ? "outline" : "default"}
                disabled={plan.current}
              >
                {plan.current ? "Current Plan" : "Upgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const DoctorAvailabilitySettingsDynamic: FC<{
  doctorId?: string;
}> = () => {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const [schedule, setSchedule] = useState(
    days.reduce(
      (acc, day) => ({
        ...acc,
        [day]: { enabled: day !== "Sunday", start: "09:00", end: "17:00" },
      }),
      {} as Record<string, { enabled: boolean; start: string; end: string }>,
    ),
  );

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Doctor Availability</CardTitle>
        <CardDescription>
          Configure working hours for consultations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {days.map((day) => (
          <div
            key={day}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
          >
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={schedule[day]?.enabled}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  [day]: { ...schedule[day]!, enabled: e.target.checked },
                })
              }
            />
            <span className="w-24 font-medium">{day}</span>
            <input
              type="time"
              className="p-2 rounded border bg-background"
              value={schedule[day]?.start}
              disabled={!schedule[day]?.enabled}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  [day]: { ...schedule[day]!, start: e.target.value },
                })
              }
            />
            <span>to</span>
            <input
              type="time"
              className="p-2 rounded border bg-background"
              value={schedule[day]?.end}
              disabled={!schedule[day]?.enabled}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  [day]: { ...schedule[day]!, end: e.target.value },
                })
              }
            />
          </div>
        ))}
        <Button className="w-full mt-4">Save Availability</Button>
      </CardContent>
    </Card>
  );
};

export const TemplatesSettingsDynamic: FC<{ clinicId?: string }> = () => {
  const templates = [
    {
      name: "Standard Prescription",
      speciality: "Prescription",
      lastUsed: "2 days ago",
    },
    {
      name: "Follow-up Visit",
      speciality: "Consultation",
      lastUsed: "1 week ago",
    },
    {
      name: "Lab Request Form",
      speciality: "Investigation",
      lastUsed: "3 days ago",
    },
    { name: "Discharge Summary", speciality: "Report", lastUsed: "Never" },
  ];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Manage prescription and document templates
          </CardDescription>
        </div>
        <Button size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          New Template
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templates.map((template, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.speciality} • Last used {template.lastUsed}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
                <Button variant="ghost" size="sm">
                  Use
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// STUBS - To be implemented
// ============================================

type FlexibleModalProps = Record<string, unknown>;

export const DrugInteractionCheckerDynamic: FC<FlexibleModalProps> = () => null;
export const FeedbackFormDynamic: FC<FlexibleModalProps> = () => null;
export const FeedbackDialogDynamic: FC<FlexibleModalProps> = () => null;
export const PatientBadgeDynamic: FC<FlexibleModalProps> = () => null;
export const FollowUpSchedulerDynamic: FC<FlexibleModalProps> = () => null;
export const ConsultationContentDynamic: FC<FlexibleModalProps> = () => null;
export const PrescriptionTemplateManagerDynamic: FC<FlexibleModalProps> = () =>
  null;
export const AddAppointmentDialogDynamic: FC<FlexibleModalProps> = () => null;
export const PatientFormDialogDynamic: FC<FlexibleModalProps> = () => null;
export const BulkImportDialogDynamic: FC<FlexibleModalProps> = () => null;
export const FhirExportDialogDynamic: FC<FlexibleModalProps> = () => null;
export const QueueSettingsDialogDynamic: FC<FlexibleModalProps> = () => null;
export const AddWalkInDialogDynamic: FC<FlexibleModalProps> = () => null;
export const WhatsAppSettingsDialogDynamic: FC<FlexibleModalProps> = () => null;
export const WhatsAppBroadcastDialogDynamic: FC<FlexibleModalProps> = () =>
  null;
export const AdmissionModalDynamic: FC<FlexibleModalProps> = () => null;
export const OnboardingTourDynamic: FC<FlexibleModalProps> = () => null;
