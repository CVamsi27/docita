import { Label } from "@workspace/ui/components/form/label";
import { Switch } from "@workspace/ui/components/form/switch";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/overlay/accordion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { cn } from "@workspace/ui/lib/utils";
import { Activity, FileText, Heart, Stethoscope, Wind } from "lucide-react";

export const GENERAL_FINDINGS = [
  { key: "pallor", label: "Pallor" },
  { key: "icterus", label: "Icterus" },
  { key: "cyanosis", label: "Cyanosis" },
  { key: "clubbing", label: "Clubbing" },
  { key: "lymphadenopathy", label: "Lymphadenopathy" },
  { key: "edema", label: "Edema" },
] as const;

export function GeneralExaminationCard({
  general,
  onUpdateGeneral,
  readOnly,
// jscpd:ignore-start
}: {
  general: {
    pallor: boolean;
    icterus: boolean;
    cyanosis: boolean;
    clubbing: boolean;
    lymphadenopathy: boolean;
    edema: boolean;
    notes?: string;
  };
  onUpdateGeneral: (field: string, value: boolean | string) => void;
// jscpd:ignore-end
  readOnly: boolean;
}) {
  const positiveGeneralCount = GENERAL_FINDINGS.reduce(
    (count, item) => (general[item.key] ? count + 1 : count),
    0,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/30 px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          General examination
        </CardTitle>
        <Badge
          variant="outline"
          className={cn(
            "text-[var(--fs-2xs)] font-medium",
            positiveGeneralCount > 0
              ? "border-success/40 bg-success/10 text-success"
              : "border-border/70 bg-muted/40 text-muted-foreground",
          )}
        >
          {positiveGeneralCount > 0
            ? `${positiveGeneralCount} positive`
            : "All negative"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GENERAL_FINDINGS.map((item) => {
            const value = general[item.key];
            const checked = typeof value === "boolean" ? value : false;
            return (
              <Label
                key={item.key}
                htmlFor={`exam-${item.key}`}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150",
                  checked
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40",
                  readOnly ? "cursor-not-allowed" : "cursor-pointer",
                )}
              >
                <span className="truncate">{item.label}</span>
                <Switch
                  id={`exam-${item.key}`}
                  checked={checked}
                  onCheckedChange={(next) =>
                    onUpdateGeneral(item.key, next)
                  }
                  disabled={readOnly}
                />
              </Label>
            );
          })}
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="exam-general-notes"
            className="text-xs font-medium text-muted-foreground"
          >
            General notes
          </Label>
          <Textarea
            id="exam-general-notes"
            value={general.notes}
            onChange={(e) => onUpdateGeneral("notes", e.target.value)}
            placeholder="Other general findings"
            readOnly={readOnly}
            className="min-h-16 resize-y"
          />
        </div>
      </CardContent>
    </Card>
  );
}

type SystemicField = "cvs" | "rs" | "pa" | "cns" | "musculoskeletal" | "notes";

export function SystemicExaminationCard({
  systemic,
  onUpdateSystemic,
  readOnly,
}: {
  systemic: Partial<Record<SystemicField, string | undefined>>;
  onUpdateSystemic: (field: string, value: string) => void;
  readOnly: boolean;
}) {
  const systemicSections: Array<{
    id: SystemicField;
    label: string;
    short: string;
    icon: React.ReactNode;
    placeholder: string;
    value: string | undefined;
  }> = [
    {
      id: "cvs",
      label: "Cardiovascular",
      short: "CVS",
      icon: <Heart className="h-4 w-4 text-destructive" />,
      placeholder: "e.g. S1 S2 heard, no murmurs",
      value: systemic.cvs,
    },
    {
      id: "rs",
      label: "Respiratory",
      short: "RS",
      icon: <Wind className="h-4 w-4 text-info" />,
      placeholder: "e.g. bilateral air entry, no added sounds",
      value: systemic.rs,
    },
    {
      id: "pa",
      label: "Per Abdomen",
      short: "P/A",
      icon: <Activity className="h-4 w-4 text-warning" />,
      placeholder: "e.g. soft, non-tender, no organomegaly",
      value: systemic.pa,
    },
    {
      id: "cns",
      label: "CNS & Other",
      short: "CNS",
      icon: <FileText className="h-4 w-4 text-primary" />,
      placeholder: "e.g. conscious, oriented, no focal deficit",
      value: systemic.cns,
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          Systemic examination
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion
          type="multiple"
          defaultValue={systemicSections.map((s) => s.id)}
          className="w-full"
        >
          {systemicSections.map((section, index) => {
            const hasContent = Boolean(section.value?.trim());
            return (
              <AccordionItem
                key={section.id}
                value={section.id}
                className={cn(
                  "px-4",
                  index < systemicSections.length - 1
                    ? "border-b"
                    : "border-b-0",
                )}
              >
                <AccordionTrigger className="py-2.5 hover:no-underline">
                  <div className="flex flex-1 items-center justify-between gap-2 pr-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {section.icon}
                      <span>{section.label}</span>
                      <span className="text-[var(--fs-2xs)] font-normal text-muted-foreground">
                        ({section.short})
                      </span>
                    </div>
                    {hasContent && (
                      <Badge
                        variant="secondary"
                        className="text-[var(--fs-2xs)] font-normal"
                      >
                        Recorded
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <Textarea
                    placeholder={section.placeholder}
                    value={section.value}
                    onChange={(e) =>
                      onUpdateSystemic(section.id, e.target.value)
                    }
                    readOnly={readOnly}
                    className="min-h-20 resize-y"
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
