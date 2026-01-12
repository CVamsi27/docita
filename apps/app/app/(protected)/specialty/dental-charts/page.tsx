"use client";

import { AlertCircle, Smile } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export default function DentalChartsPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Smile className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dental Charts</h1>
          <p className="text-muted-foreground">
            Interactive tooth charting and dental documentation
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is currently under development. Dental charting
          functionality will be available soon.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tooth Chart</CardTitle>
            <CardDescription>Interactive dental chart</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visual tooth-by-tooth documentation with procedures, conditions,
              and treatment notes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treatment Planning</CardTitle>
            <CardDescription>Procedure planning</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create comprehensive treatment plans for fillings, extractions,
              RCT, crowns, and more.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Periodontal Chart</CardTitle>
            <CardDescription>Gum health tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track pocket depths, bleeding points, and mobility for
              comprehensive periodontal assessment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
