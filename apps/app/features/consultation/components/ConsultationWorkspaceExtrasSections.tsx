"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
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
  return (
    <>
      {(canCreatePrescription || canViewPrescriptions) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoToPlan}
        >
          Plan &amp; Rx
        </Button>
      )}
      {canViewInvoices ? (
        <Button variant="outline" size="sm" asChild>
          <Link href="/desk/collect-payment">Collect payment</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link href="/follow-ups">Schedule follow-up</Link>
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
  return (
    <>
      {canViewPrescriptions ? <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild><Link href={`/prescriptions?patientId=${encodeURIComponent(patientId)}`}>View prescriptions</Link></Button> : null}
      {canViewInvoices ? <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild><Link href={`/patients/${patientId}?tab=billing`}>View invoices</Link></Button> : null}
      {canLab ? <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild><Link href={`/patients/${patientId}?tab=records&subtab=labs`}>View lab tests</Link></Button> : null}
      {canWhatsapp ? <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild><Link href={`/patients/${patientId}?tab=communication`}>View messages</Link></Button> : null}
      {completed && canCodingQueue ? <Button variant="outline" size="sm" className="hidden lg:inline-flex" asChild><Link href="/coding-queue">Coding queue</Link></Button> : null}
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
  const hasAny = canViewPrescriptions || canViewInvoices || canLab || canWhatsapp || (completed && canCodingQueue);
  if (!hasAny) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden gap-1.5" aria-label="More options">
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Patient records</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canViewPrescriptions ? <DropdownMenuItem asChild><Link href={`/prescriptions?patientId=${encodeURIComponent(patientId)}`}>View prescriptions</Link></DropdownMenuItem> : null}
        {canViewInvoices ? <DropdownMenuItem asChild><Link href={`/patients/${patientId}?tab=billing`}>View invoices</Link></DropdownMenuItem> : null}
        {canLab ? <DropdownMenuItem asChild><Link href={`/patients/${patientId}?tab=records&subtab=labs`}>View lab tests</Link></DropdownMenuItem> : null}
        {canWhatsapp ? <DropdownMenuItem asChild><Link href={`/patients/${patientId}?tab=communication`}>View messages</Link></DropdownMenuItem> : null}
        {completed && canCodingQueue ? <DropdownMenuItem asChild><Link href="/coding-queue">Coding queue</Link></DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
