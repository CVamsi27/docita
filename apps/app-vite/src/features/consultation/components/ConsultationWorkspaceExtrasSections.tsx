import { Link } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("Consultation");
  return (
    <>
      {(canCreatePrescription || canViewPrescriptions) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoToPlan}
        >
          {t("workspaceActions.planAndRx")}
        </Button>
      )}
      {canViewInvoices ? (
        <Button variant="outline" size="sm" asChild>
          <Link to="/desk/collect-payment">{t("workspaceActions.collectPayment")}</Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" asChild>
        <Link to="/follow-ups">{t("workspaceActions.scheduleFollowUp")}</Link>
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

interface ViewActionDescriptor {
  key: string;
  labelKey: string;
  href: (patientId: string) => string;
  show: (props: ViewActionsProps) => boolean;
  /** Tailwind breakpoint class for the inline variant. Ignored by overflow. */
  breakpointClass: "md" | "lg";
}

const VIEW_ACTIONS: ReadonlyArray<ViewActionDescriptor> = [
  {
    key: "viewPrescriptions",
    labelKey: "viewPrescriptions",
    href: (pid) => `/prescriptions?patientId=${encodeURIComponent(pid)}`,
    show: (p) => p.canViewPrescriptions,
    breakpointClass: "md",
  },
  {
    key: "viewInvoices",
    labelKey: "viewInvoices",
    href: (pid) => `/patients/${pid}?tab=billing`,
    show: (p) => p.canViewInvoices,
    breakpointClass: "md",
  },
  {
    key: "viewLabTests",
    labelKey: "viewLabTests",
    href: (pid) => `/patients/${pid}?tab=records&subtab=labs`,
    show: (p) => p.canLab,
    breakpointClass: "lg",
  },
  {
    key: "viewMessages",
    labelKey: "viewMessages",
    href: (pid) => `/patients/${pid}?tab=communication`,
    show: (p) => p.canWhatsapp,
    breakpointClass: "lg",
  },
  {
    key: "codingQueue",
    labelKey: "codingQueue",
    href: () => "/coding-queue",
    show: (p) => p.completed && p.canCodingQueue,
    breakpointClass: "lg",
  },
];

export function ViewActionsInline(props: ViewActionsProps) {
  const { t } = useTranslation("Consultation");
  return (
    <>
      {VIEW_ACTIONS.filter((a) => a.show(props)).map((a) => (
        <Button
          key={a.key}
          variant="outline"
          size="sm"
          className={`hidden ${a.breakpointClass}:inline-flex`}
          asChild
        >
          <Link to={a.href(props.patientId)}>{t(`workspaceActions.${a.labelKey}`)}</Link>
        </Button>
      ))}
    </>
  );
}

export function ViewActionsOverflow(props: ViewActionsProps) {
  const { t } = useTranslation("Consultation");
  const hasAny = VIEW_ACTIONS.some((a) => a.show(props));
  if (!hasAny) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden gap-1.5" aria-label={t("workspaceActions.moreOptionsAriaLabel")}>
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {t("workspaceActions.moreButton")}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t("workspaceActions.patientRecordsLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {VIEW_ACTIONS.filter((a) => a.show(props)).map((a) => (
          <DropdownMenuItem key={a.key} asChild>
            <Link to={a.href(props.patientId)}>{t(`workspaceActions.${a.labelKey}`)}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
