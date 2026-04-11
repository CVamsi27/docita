"use client";

import { AlertCircle, Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { useClinic } from "@/lib/clinic-context";

export default function ECGMonitoringPage() {
  const { clinic } = useClinic();

  if (clinic?.type && clinic.type !== "CARDIOLOGY") {
    return (
      <div className="container mx-auto py-8 max-w-2xl text-center space-y-4">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">ECG Monitoring</h1>
        <p className="text-muted-foreground">
          ECG monitoring is only available for cardiology clinics. Your clinic
          is configured as <strong>{clinic.type}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Heart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ECG Monitoring</h1>
          <p className="text-muted-foreground">
            Cardiac rhythm analysis and vital tracking
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is currently under development. ECG monitoring
          functionality will be available soon.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>ECG Documentation</CardTitle>
            <CardDescription>Rhythm analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload, annotate, and store ECG tracings with automated rhythm
              interpretation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cardiac Vitals</CardTitle>
            <CardDescription>Trend monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track blood pressure, heart rate, and oxygen saturation trends
              over time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holter Review</CardTitle>
            <CardDescription>24-hour monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Review and annotate 24-hour Holter monitoring results with
              arrhythmia detection.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
