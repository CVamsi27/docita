"use client";

import { AlertCircle, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { useClinic } from "@/lib/clinic-context";

export default function VisionTestsPage() {
  const { clinic } = useClinic();

  if (clinic?.type && clinic.type !== "OPHTHALMOLOGY") {
    return (
      <div className="container mx-auto py-8 max-w-2xl text-center space-y-4">
        <Eye className="h-12 w-12 text-muted-foreground mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Vision Tests</h1>
        <p className="text-muted-foreground">
          Vision testing is only available for ophthalmology clinics. Your
          clinic is configured as <strong>{clinic.type}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vision Tests</h1>
          <p className="text-muted-foreground">
            Comprehensive eye examination and vision assessment
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is currently under development. Vision testing
          functionality will be available soon.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Visual Acuity</CardTitle>
            <CardDescription>Distance & near vision</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Snellen chart testing for both distance and near vision with
              automated scoring.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Refraction</CardTitle>
            <CardDescription>Prescription calculation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Record refraction results and generate eyeglass/contact lens
              prescriptions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Color Vision</CardTitle>
            <CardDescription>Ishihara testing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Digital Ishihara plates for color blindness screening and
              documentation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
