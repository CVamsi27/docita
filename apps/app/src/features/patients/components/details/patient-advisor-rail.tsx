import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button, RightRailCard, RightRailCardStack } from "@workspace/ui/components";
import type { Patient } from "@workspace/types";

interface PatientAdvisorRailProps {
  patient: Patient;
  /** Total unpaid invoice amount for this patient, in INR. */
  outstandingBalance?: number;
  /** True when consent records are absent / out of date. */
  consentMissing?: boolean;
  /** Pre-computed drug-interaction warnings (string list). */
  drugInteractions?: ReadonlyArray<string>;
}

interface AdvisorCard {
  id: string;
  category: string;
  headline: string;
  description?: string;
  tone?: "default" | "info" | "success" | "warning" | "destructive";
  actionLabel?: string;
  onAction?: () => void;
}

const formatINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * Origin-style right-rail advisor cards on patient detail. Cards are
 * dismissible per session (state lives in component), gated by the presence
 * of upstream data (the Next rollout flag was dropped during the port —
 * data-driven gating covers the same behavior once providers are wired).
 */
export function PatientAdvisorRail({
  patient,
  outstandingBalance,
  consentMissing,
  drugInteractions,
}: PatientAdvisorRailProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const cards = useMemo<AdvisorCard[]>(() => {
    const list: AdvisorCard[] = [];

    if (drugInteractions && drugInteractions.length > 0) {
      list.push({
        id: "drug-interactions",
        category: "DRUG INTERACTION",
        headline: `${drugInteractions.length} potential interaction${
          drugInteractions.length === 1 ? "" : "s"
        } detected`,
        description: drugInteractions.slice(0, 2).join("; "),
        tone: "warning",
        actionLabel: "Review prescriptions",
        onAction: () =>
          navigate(
            `/patients/${patient.id}?tab=records&subtab=prescriptions`,
          ),
      });
    }

    if (consentMissing) {
      list.push({
        id: "missing-consent",
        category: "CONSENT",
        headline: "Patient consent is missing or expired",
        description:
          "Capture an updated consent before sharing records or starting a new procedure.",
        tone: "info",
        actionLabel: "Capture consent",
        onAction: () =>
          navigate(`/patients/${patient.id}?tab=records&subtab=documents`),
      });
    }

    if (typeof outstandingBalance === "number" && outstandingBalance > 0) {
      list.push({
        id: "payments-due",
        category: "PAYMENTS",
        headline: `${formatINR(outstandingBalance)} unpaid`,
        description: "Outstanding invoices for this patient.",
        tone: "destructive",
        actionLabel: "Open billing",
        onAction: () => navigate(`/patients/${patient.id}?tab=billing`),
      });
    }

    return list.filter((card) => !dismissed.has(card.id));
  }, [
    consentMissing,
    dismissed,
    drugInteractions,
    outstandingBalance,
    patient.id,
    navigate,
  ]);

  if (cards.length === 0) return null;

  return (
    <div
      data-testid="patient-advisor-rail"
      className="hidden w-full max-w-full shrink-0 lg:block lg:w-80 xl:sticky xl:top-4"
    >
      <RightRailCardStack
        ariaLabel="Patient advisor"
        className="w-full max-w-full"
      >
        {cards.map((card) => (
          <RightRailCard
            key={card.id}
            category={card.category}
            headline={card.headline}
            description={card.description}
            tone={card.tone}
            onDismiss={() => dismiss(card.id)}
            dismissLabel={`Dismiss ${card.category.toLowerCase()} card`}
            action={
              card.actionLabel && card.onAction ? (
                <Button
                  size="sm"
                  onClick={card.onAction}
                  data-testid={`patient-advisor-${card.id}-action`}
                >
                  {card.actionLabel}
                </Button>
              ) : undefined
            }
          />
        ))}
      </RightRailCardStack>
    </div>
  );
}
