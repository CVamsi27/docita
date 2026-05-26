"use client";

import { CalendarDays, Clock3, FileText, Stethoscope, UserRound } from "lucide-react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Progress } from "@workspace/ui/components/feedback/progress";

export default function DoctorWorkflowVisualTestPage() {
  return (
    <div className="space-y-8 p-6 md:p-8" data-testid="doctor-workflow-page">
      <section data-testid="doctor-dashboard-zone">
        <AppPageScaffold
          header={
            <PageHeader
              title="Doctor dashboard"
              description="Current queue context and top actions"
              actions={
                <Button size="sm" className="gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Start Consultation
                </Button>
              }
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Current patient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Asha Kumar</p>
                  <Badge>In progress</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Follow-up consultation · 10:30 AM
                </p>
                <Progress value={62} />
                <p className="text-xs text-muted-foreground">
                  Consultation note completion: 62%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Queue status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Waiting</span>
                  <span className="font-semibold">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-semibold">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-semibold">7</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </AppPageScaffold>
      </section>

      <section data-testid="doctor-appointments-zone">
        <AppPageScaffold
          header={
            <PageHeader
              title="Appointments"
              description="Fast actions for same-screen scheduling and consult starts"
            />
          }
        >
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium">09:30 AM · New Visit</p>
                  <p className="text-sm text-muted-foreground">Ravi Menon</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Check in</Button>
                  <Button size="sm">Start</Button>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="font-medium">10:00 AM · Follow-up</p>
                  <p className="text-sm text-muted-foreground">Neha Singh</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">No show</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </AppPageScaffold>
      </section>

      <section data-testid="doctor-consultation-zone">
        <AppPageScaffold
          header={
            <PageHeader
              title="Consultation"
              description="Sticky clinical context with save and progress visibility"
            />
          }
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                SOAP Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Autosave</span>
                <Badge variant="secondary">Saved 20s ago</Badge>
              </div>
              <Progress value={78} />
              <p className="text-muted-foreground">
                Assessment and plan in progress with highlighted clinical alerts.
              </p>
            </CardContent>
          </Card>
        </AppPageScaffold>
      </section>

      <section data-testid="doctor-patients-zone">
        <AppPageScaffold
          header={
            <PageHeader
              title="Patients"
              description="Consistent list + detail treatment across records and documents"
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="h-4 w-4" />
                  Patient Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">Latha Reddy</p>
                <p className="text-muted-foreground">ID: PT-23091 · Female · 42 years</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>Next visit: Apr 11, 2026</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock3 className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="rounded-md border p-2">Consultation completed · Mar 29</p>
                <p className="rounded-md border p-2">Prescription issued · Mar 29</p>
                <p className="rounded-md border p-2">Lab order created · Mar 22</p>
              </CardContent>
            </Card>
          </div>
        </AppPageScaffold>
      </section>
    </div>
  );
}
