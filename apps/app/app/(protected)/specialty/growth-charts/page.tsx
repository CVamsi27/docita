"use client";

import { AlertCircle, Baby } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export default function GrowthChartsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Baby className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Growth Charts</h1>
          <p className="text-muted-foreground">
            Pediatric growth tracking and developmental milestones
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is currently under development. Growth charting
          functionality will be available soon.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Height & Weight</CardTitle>
            <CardDescription>Growth percentiles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track height, weight, and BMI with WHO/CDC growth charts and
              percentile calculations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Head Circumference</CardTitle>
            <CardDescription>Infant monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor head circumference growth for infants and detect
              developmental concerns early.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>Development tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Record and track age-appropriate developmental milestones and
              immunization schedules.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
