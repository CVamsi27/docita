"use client";

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

/**
 * Vaccines — IAP-style immunization timeline across a clinic's pediatric panel
 * (Doctor-focused).
 *
 * Visual prototype: docita-design-system/project/ui_kits/clinic-os/VaccinationScreen.jsx
 *
 * Data layer state:
 *   - Immunization model already exists in packages/db/prisma/schema.prisma:2436
 *   - Already feeds the patient timeline via prisma-patient-timeline-sources.ts
 *
 * Data wiring TODO:
 *   - Add apps/api/src/domains/immunizations/ domain (application + core +
 *     infrastructure + presentation layers per AGENTS §15.1)
 *   - Expose ImmunizationController with list + create + administer endpoints
 *   - Add useImmunizationsForPatient(patientId) + useDueImmunizations() hooks
 *     to packages/data-access
 *   - Replace the EmptyState with the IAP-timeline rail + due-visit batch
 *     fields + parent-counselling panel from the prototype
 */
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
