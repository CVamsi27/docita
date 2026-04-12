"use client";

import { AlertCircle, Baby } from "lucide-react";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

export default function PrenatalCarePage() {
  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Baby className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Prenatal Care</h1>
          <p className="text-muted-foreground">
            Pregnancy tracking and obstetric management
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is currently under development. Prenatal care
          functionality will be available soon.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>GTPAL Assessment</CardTitle>
            <CardDescription>Obstetric history</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Record gravida, term, preterm, abortions, and living children for
              comprehensive obstetric history.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LMP & EDD Calculator</CardTitle>
            <CardDescription>Due date estimation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Calculate expected delivery date from last menstrual period with
              gestational age tracking.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Antenatal Visits</CardTitle>
            <CardDescription>Prenatal monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track fundal height, fetal heart rate, blood pressure, and
              schedule regular antenatal checkups.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    </FeatureGate>
  );
}
