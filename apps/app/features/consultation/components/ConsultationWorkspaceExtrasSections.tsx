"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";

interface PrimaryActionButtonsProps {
  canCreatePrescription: boolean;
  canViewPrescriptions: boolean;
  canViewInvoices: boolean;
  onGoToPlan: () => void;
}

export function PrimaryActionButtons({
  canCreatePrescription,
  canViewPrescriptions,
  canViewInvoices,
  onGoToPlan,
}: PrimaryActionButtonsProps) {
  const t = useTranslations("Consultation.workspaceActions");
  return (
    <>
      {(canCreatePrescription || canViewPrescriptions) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoToPlan}
        >
          {t("planAndRx")}
        </Button>
      )}
      {canViewInvoices ? (
        <Button variant="outline" size="sm" asChild>
          <Link href="/desk/collect-payment">{t("collectPayment")}</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link href="/follow-ups">{t("scheduleFollowUp")}</Link>
      </Button>
    </>
  );
}

interface ViewActionsProps {
  patientId: string;
  canViewPrescriptions: boolean;
  canViewInvoices: boolean;
  canLab: boolean;
  canWhatsapp: boolean;
  completed: boolean;
  canCodingQueue: boolean;
}

export function ViewActionsInline({
  patientId,
  canViewPrescriptions,
  canViewInvoices,
  canLab,
  canWhatsapp,
  completed,
  canCodingQueue,
}: ViewActionsProps) {
  const t = useTranslations("Consultation.workspaceActions");
  return (
    <>
      {canViewPrescriptions ? <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild><Link href={`/prescriptions?patientId=${encodeURIComponent(patientId)}`}>{t("viewPrescriptions")}</Link></Button> : null}
      {canViewInvoices ? <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild><Link href={`/patients/${patientId}?tab=billing`}>{t("viewInvoices")}</Link></Button> : null}
      {canLab ? <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild><Link href={`/patients/${patientId}?tab=records&subtab=labs`}>{t("viewLabTests")}</Link></Button> : null}
      {canWhatsapp ? <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild><Link href={`/patients/${patientId}?tab=communication`}>{t("viewMessages")}</Link></Button> : null}
      {completed && canCodingQueue ? <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild><Link href="/coding-queue">{t("codingQueue")}</Link></Button> : null}
    </>
  );
}

export function ViewActionsOverflow({
  patientId,
  canViewPrescriptions,
  canViewInvoices,
  canLab,
  canWhatsapp,
  completed,
  canCodingQueue,
}: ViewActionsProps) {
  const t = useTranslations("Consultation.workspaceActions");
  const hasAny = canViewPrescriptions || canViewInvoices || canLab || canWhatsapp || (completed && canCodingQueue);
  if (!hasAny) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden gap-1.5" aria-label={t("moreOptionsAriaLabel")}>
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {t("moreButton")}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t("patientRecordsLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canViewPrescriptions ? <DropdownMenuItem asChild><Link href={`/prescriptions?patientId=${encodeURIComponent(patientId)}`}>{t("viewPrescriptions")}</Link></DropdownMenuItem> : null}
        {canViewInvoices ? <DropdownMenuItem asChild><Link href={`/patients/${patientId}?tab=billing`}>{t("viewInvoices")}</Link></DropdownMenuItem> : null}
        {canLab ? <DropdownMenuItem asChild><Link href={`/patients/${patientId}?tab=records&subtab=labs`}>{t("viewLabTests")}</Link></DropdownMenuItem> : null}
        {canWhatsapp ? <DropdownMenuItem asChild><Link href={`/patients/${patientId}?tab=communication`}>{t("viewMessages")}</Link></DropdownMenuItem> : null}
        {completed && canCodingQueue ? <DropdownMenuItem asChild><Link href="/coding-queue">{t("codingQueue")}</Link></DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
