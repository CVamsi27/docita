"use client";

import { AlertCircle, Brain } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export default function MentalHealthPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mental Health</h1>
          <p className="text-muted-foreground">
            Psychiatric assessment and mental status examination
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is currently under development. Mental health assessment
          functionality will be available soon.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mental Status Exam</CardTitle>
            <CardDescription>Structured assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comprehensive mental status examination covering appearance,
              behavior, mood, thought, and cognition.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>Safety evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Suicide and violence risk assessment with safety planning and
              crisis intervention protocols.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treatment Tracking</CardTitle>
            <CardDescription>Therapy progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track therapy sessions, medication adjustments, and patient
              progress with standardized scales.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
