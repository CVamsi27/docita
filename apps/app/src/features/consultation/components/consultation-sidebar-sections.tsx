import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { ChevronDown, Clock, User, X } from "lucide-react";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { cn } from "@workspace/ui/lib/utils";
import {
  PatientFamilyHistory,
  PatientSurgicalHistory,
  PatientTimelineResponse,
} from "@workspace/types";
import { PatientTimeline } from "@/components/patient-history/PatientTimeline";
import { formatGenderLabel } from "@/lib/formatters";

function useConsultationSidebarTranslations() {
  const { t } = useTranslation("Consultation");
  return (key: string, params?: Record<string, unknown>) =>
    t(`sidebar.${key}`, params);
}

export function ConsultationSidebarEmptyState() {
  const t = useConsultationSidebarTranslations();
  return (
    <Card className="ui-card-surface h-full">
      <CardContent className="flex h-full items-center justify-center py-8 text-muted-foreground">
        <User className="h-6 w-6 mr-2 opacity-30" />
        <span>{t("emptyState")}</span>
      </CardContent>
    </Card>
  );
}

interface ConsultationSidebarHeaderProps {
  initials: string;
  patientName: string;
  age?: string;
  gender?: string | null;
  mrn?: string | null;
  onClose?: () => void;
}

export function ConsultationSidebarHeader({
  initials,
  patientName,
  age,
  gender,
  mrn,
  onClose,
}: ConsultationSidebarHeaderProps) {
  const t = useConsultationSidebarTranslations();
  return (
    <div className="ui-card-surface relative flex items-center gap-4 p-4 group">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-lg font-bold text-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold truncate">{patientName}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{age}</span>
          {gender && <span>&middot; {formatGenderLabel(gender)}</span>}
          {mrn && <span>&middot; {t("mrnLabel", { mrn: mrn ?? "" })}</span>}
        </div>
      </div>
      {onClose && (
        <SymbolTooltip label={t("closeSidebarTooltip")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label={t("closeSidebarAria")}
          >
            <X className="h-4 w-4" />
          </Button>
        </SymbolTooltip>
      )}
    </div>
  );
}

interface ConsultationSidebarHistoryTimelineProps {
  timelineData: PatientTimelineResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultationSidebarHistoryTimeline({
  timelineData,
  open,
  onOpenChange,
}: ConsultationSidebarHistoryTimelineProps) {
  const t = useConsultationSidebarTranslations();
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2 rounded py-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
        aria-label={open ? t("historyHideAria") : t("historyShowAria")}
      >
        <div className="h-px flex-1 bg-border/50 transition-colors group-hover:bg-border" />
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover:text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>
            {t("historyLabel", { count: timelineData.total })}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </span>
        <div className="h-px flex-1 bg-border/50 transition-colors group-hover:bg-border" />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2">
        {timelineData.events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            {t("noPreviousVisits")}
          </p>
        ) : (
          <PatientTimeline
            mode="compact"
            events={timelineData.events}
            summary={timelineData.summary}
            total={timelineData.total}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SurgicalHistoryListProps {
  items: PatientSurgicalHistory[];
}

function SurgicalHistoryList({ items }: SurgicalHistoryListProps) {
  const t = useConsultationSidebarTranslations();
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <MicroLabel className="text-muted-foreground">{t("surgicalHistoryLabel")}</MicroLabel>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-2">
            <span>{s.procedureName}</span>
            {s.procedureDate && (
              <span className="text-muted-foreground">
                {new Date(s.procedureDate).getFullYear()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface FamilyHistoryListProps {
  items: PatientFamilyHistory[];
}

function FamilyHistoryList({ items }: FamilyHistoryListProps) {
  const t = useConsultationSidebarTranslations();
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <MicroLabel className="text-muted-foreground">{t("familyHistoryLabel")}</MicroLabel>
      <ul className="space-y-1">
        {items.map((h, i) => (
          <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-2">
            <span>{h.condition}</span>
            <span className="text-muted-foreground italic">{h.relationship}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ConsultationSidebarStructuredHistoryProps {
  surgicalHistory: PatientSurgicalHistory[];
  familyHistory: PatientFamilyHistory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultationSidebarStructuredHistory({
  surgicalHistory,
  familyHistory,
  open,
  onOpenChange,
}: ConsultationSidebarStructuredHistoryProps) {
  const t = useConsultationSidebarTranslations();
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between text-xs font-semibold"
        >
          {t("fullStructuredHistoryLabel")}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-3">
        <SurgicalHistoryList items={surgicalHistory} />
        <FamilyHistoryList items={familyHistory} />
      </CollapsibleContent>
    </Collapsible>
  );
}
