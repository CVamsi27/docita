import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@workspace/ui/components";
import { Feature } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { Network, Send } from "lucide-react";
import { FeatureGate } from "@/components/auth/feature-gate";

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
  const { t } = useTranslation("Patients.referralsTab");
  return (
    <FeatureGate feature={Feature.DIGITAL_PRESCRIPTIONS}>
      <Card className="ui-card-surface" data-patient-id={patientId}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-muted-foreground" aria-hidden />
            {t("cardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Network}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
