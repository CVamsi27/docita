"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { Feature } from "@workspace/types";
import { Network, Send } from "lucide-react";
import { TierGate } from "@/components/auth/access-gates";

interface ReferralsTabProps {
  patientId: string;
}

/**
 * Per-patient specialist referrals (referral letters, closed-loop status,
 * specialist directory). This is the canonical home for referrals (M2): they
 * are patient-centric clinical documents, so they live in the patient record
 * alongside prescriptions, labs, and documents — not as a standalone nav page.
 *
 * The backend is pending: a `PatientReferral` model + referrals API domain need
 * a reviewed migration (schema is locked). Until then this renders the intended
 * placeholder in the correct location so the IA is right when the backend lands.
 */
export function ReferralsTab({ patientId }: ReferralsTabProps) {
  return (
    <TierGate feature={Feature.DIGITAL_PRESCRIPTIONS}>
      <Card className="ui-card-surface" data-patient-id={patientId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-muted-foreground" aria-hidden />
            Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Network}
            title="Referrals backend pending"
            description="Specialist referral letters for this patient — editable letter format, closed-loop tracking, and specialist network directory. Needs a new PatientReferral model and referrals API domain; the schema is locked, so the migration must be reviewed before landing."
          />
        </CardContent>
      </Card>
    </TierGate>
  );
}
