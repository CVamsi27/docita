"use client";

// jscpd:ignore-start
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Feature } from "@workspace/types";
import { Activity, Syringe } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

export function VaccinesPageContent() {
  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            title="Vaccines"
            description="IAP-style timeline from birth to 18 months, with batch tracking and parent counselling."
          />
        }
      >
        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" aria-hidden />
// jscpd:ignore-end
              Immunization schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Syringe}
              title="Vaccines view pending domain endpoints"
              description="The Immunization data model is already in the database and surfaces inside each patient's timeline. A dedicated cross-patient vaccines view will land once an immunizations domain is added to the API and useImmunizations hooks are exposed."
              action={{
                label: "Open patient list",
                href: "/patients",
              }}
            />
          </CardContent>
        </Card>
      </AppPageScaffold>
    </FeatureGate>
  );
}
