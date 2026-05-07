"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@workspace/ui/components/button";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  APP_ACCESS_TARGETS,
  Feature,
  type Appointment,
} from "@workspace/types";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { isConsultationReadOnlyStatus } from "@/features/appointments/rules/appointmentRules";

interface ConsultationAfterVisitStripProps {
  appointment: Appointment;
  onGoToPlan: () => void;
}

interface AfterVisitGroup {
  label: string;
  items: ReactNode[];
}

export function ConsultationAfterVisitStrip({
  appointment,
  onGoToPlan,
}: ConsultationAfterVisitStripProps) {
  const { user } = useAuth();
  const { canAccess, workspaceProfile } = usePermissionStore();
  const {
    canViewInvoices,
    canViewPrescriptions,
    canCreatePrescription,
  } = usePermissions();

  const patientId = appointment.patientId ?? "";
  const canWhatsapp = canAccess(Feature.WHATSAPP_MESSAGING);
  const canLab = canAccess(Feature.LAB_TESTS);

  const canCodingQueue = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      workspaceProfile,
    },
    "read",
  );

  const completed = isConsultationReadOnlyStatus(appointment.status);

  if (!patientId) {
    return null;
  }

  const careItems: ReactNode[] = [];
  if (canCreatePrescription || canViewPrescriptions) {
    careItems.push(
      <Button
        key="plan"
        type="button"
        variant="default"
        size="sm"
        onClick={onGoToPlan}
      >
        Plan &amp; Rx
      </Button>,
    );
  }
  if (canViewPrescriptions) {
    careItems.push(
      <Button key="rx" variant="outline" size="sm" asChild>
        <Link
          href={`/prescriptions?patientId=${encodeURIComponent(patientId)}`}
        >
          Prescriptions
        </Link>
      </Button>,
    );
  }
  if (canLab) {
    careItems.push(
      <Button key="labs" variant="outline" size="sm" asChild>
        <Link href={`/patients/${patientId}?tab=records&subtab=labs`}>
          Lab tests
        </Link>
      </Button>,
    );
  }
  careItems.push(
    <Button key="follow-ups" variant="outline" size="sm" asChild>
      <Link href="/follow-ups">Follow-ups</Link>
    </Button>,
  );

  const billingItems: ReactNode[] = [];
  if (canViewInvoices) {
    billingItems.push(
      <Button key="billing" variant="outline" size="sm" asChild>
        <Link href={`/patients/${patientId}?tab=billing`}>Billing</Link>
      </Button>,
      <Button key="payment-desk" variant="outline" size="sm" asChild>
        <Link href="/desk/collect-payment">Payment desk</Link>
      </Button>,
    );
  }
  if (completed && canCodingQueue) {
    billingItems.push(
      <Button key="coding" variant="outline" size="sm" asChild>
        <Link href="/coding-queue">Coding queue</Link>
      </Button>,
    );
  }

  const commsItems: ReactNode[] = [];
  if (canWhatsapp) {
    commsItems.push(
      <Button key="whatsapp" variant="outline" size="sm" asChild>
        <Link href={`/patients/${patientId}?tab=communication`}>
          WhatsApp
        </Link>
      </Button>,
    );
  }

  const groups: AfterVisitGroup[] = [
    { label: "Care", items: careItems },
    { label: "Billing", items: billingItems },
    { label: "Communication", items: commsItems },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-6 rounded-[var(--radius-lg)] border border-border/60 bg-card px-3 py-3 sm:px-4"
      aria-label="After this visit"
    >
      <MicroLabel className="mb-3 block">After this visit</MicroLabel>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <span className="text-[var(--fs-2xs)] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-2">{group.items}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
