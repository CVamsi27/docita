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
import { Network, Send } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

/**
 * Referrals — patient referrals to specialists (Doctor-focused).
 *
 * Note: this is NOT the subscription referral-credit program (that lives in
 * subscriptions/core/services/referral.service.ts). This is a clinical
 * workflow: generate a letter, send via WhatsApp/print, track closed-loop
 * vs awaiting visit.
 *
 * Visual prototype: docita-design-system/project/ui_kits/clinic-os/ReferralScreen.jsx
 *
 * Data wiring TODO:
 *   - New Prisma model PatientReferral (additive — schema is locked per
 *     project_db_schema_locked memory; verify migration is safe)
 *     Fields: id, patientId, fromDoctorId, toSpecialist (name + facility +
 *     phone + speciality), reason, clinicalContext, status (DRAFT/SENT/
 *     ACKNOWLEDGED/CLOSED), sentAt, closedAt, createdAt
 *   - Add apps/api/src/domains/referrals/ domain (application + core +
 *     infrastructure + presentation)
 *   - Add usePatientReferrals + useCreateReferral + useCloseReferral hooks
 *   - Replace the EmptyState with the 3-tab UI from the prototype: New
 *     referral (editable Georgia-serif letter) / Outgoing (closed-loop
 *     status) / Network (specialist directory)
 */
export function ReferralsPageContent() {
  return (
    <FeatureGate feature={Feature.DIGITAL_PRESCRIPTIONS} showLockedCard>
      <AppPageScaffold
        header={
          <PageHeader
            title="Referrals"
            description="Generate referral letters to specialists, track closed-loop status, and manage your network."
          />
        }
      >
        <Card className="ui-card-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="size-4 text-muted-foreground" aria-hidden />
              New referral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Network}
              title="Referrals backend pending"
              description="Patient-to-specialist referrals need a new PatientReferral model and a referrals domain in the API. The schema is locked, so the migration must be reviewed before landing. UI will mirror the bundle's editable letter format, closed-loop tracking, and specialist network directory."
              action={{
                label: "Back to patients",
                href: "/patients",
              }}
            />
          </CardContent>
        </Card>
      </AppPageScaffold>
    </FeatureGate>
  );
}
