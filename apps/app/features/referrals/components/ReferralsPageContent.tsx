"use client";

// jscpd:ignore-start
import { AppPageScaffold, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { Network, Send } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

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
{/* jscpd:ignore-end */}
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
