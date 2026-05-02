import React from "react";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Activity, FileText, Heart, Stethoscope, Wind } from "lucide-react";

export interface ExaminationData {
  general: {
    pallor: boolean;
    icterus: boolean;
    cyanosis: boolean;
    clubbing: boolean;
    lymphadenopathy: boolean;
    edema: boolean;
    notes?: string;
  };
  systemic: {
    cvs: string; 
    rs: string; 
    pa: string; 
    cns: string; 
    musculoskeletal?: string;
    notes?: string;
  };
}

interface ExaminationInputProps {
  value: ExaminationData;
  onChange: (data: ExaminationData) => void;
  readOnly?: boolean;
}

const DEFAULT_VALUE: ExaminationData = {
  general: {
    pallor: false,
    icterus: false,
    cyanosis: false,
    clubbing: false,
    lymphadenopathy: false,
    edema: false,
    notes: "",
  },
  systemic: {
    cvs: "",
    rs: "",
    pa: "",
    cns: "",
    musculoskeletal: "",
    notes: "",
  },
};

export function ExaminationInput({
  value,
  onChange,
  readOnly = false,
}: ExaminationInputProps) {

  const data = {
    general: { ...DEFAULT_VALUE.general, ...(value?.general || {}) },
    systemic: { ...DEFAULT_VALUE.systemic, ...(value?.systemic || {}) },
  };

  const updateGeneral = (
    field: keyof typeof data.general,
    checked: boolean | string,
  ) => {
    onChange({
      ...data,
      general: { ...data.general, [field]: checked },
    });
  };

  const updateSystemic = (field: keyof typeof data.systemic, text: string) => {
    onChange({
      ...data,
      systemic: { ...data.systemic, [field]: text },
    });
  };

  const generalFindings = [
    { key: "pallor", label: "Pallor" },
    { key: "icterus", label: "Icterus" },
    { key: "cyanosis", label: "Cyanosis" },
    { key: "clubbing", label: "Clubbing" },
    { key: "lymphadenopathy", label: "Lymphadenopathy" },
    { key: "edema", label: "Edema" },
  ] as const;

  const positiveGeneralCount = generalFindings.reduce(
    (count, item) => (data.general[item.key] ? count + 1 : count),
    0,
  );

  const systemicSections = [
    {
      id: "cvs",
      label: "Cardiovascular",
      short: "CVS",
      icon: <Heart className="h-4 w-4 text-destructive" />,
      placeholder: "Cardiovascular",
      value: data.systemic.cvs,
    },
    {
      id: "rs",
      label: "Respiratory",
      short: "RS",
      icon: <Wind className="h-4 w-4 text-info" />,
      placeholder: "Respiratory",
      value: data.systemic.rs,
    },
    {
      id: "pa",
      label: "Per Abdomen",
      short: "P/A",
      icon: <Activity className="h-4 w-4 text-warning" />,
      placeholder: "Per abdomen",
      value: data.systemic.pa,
    },
    {
      id: "cns",
      label: "CNS & Other",
      short: "CNS",
      icon: <FileText className="h-4 w-4 text-primary" />,
      placeholder: "CNS findings",
      value: data.systemic.cns,
    },
  ] as const;

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b bg-muted/30 px-4 py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            General Examination
          </CardTitle>
          <Badge
            variant={positiveGeneralCount > 0 ? "default" : "secondary"}
            className="text-[var(--fs-2xs)] font-medium"
          >
            {positiveGeneralCount > 0
              ? `${positiveGeneralCount} positive`
              : "All negative"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {generalFindings.map((item) => {
              const checked = data.general[item.key] as boolean;
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
                      updateGeneral(item.key, next)
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
              General Notes
            </Label>
            <Textarea
              id="exam-general-notes"
              value={data.general.notes}
              onChange={(e) => updateGeneral("notes", e.target.value)}
              placeholder="Examination findings"
              readOnly={readOnly}
              className="min-h-16 resize-y"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 py-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Systemic Examination
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
                        updateSystemic(
                          section.id as keyof typeof data.systemic,
                          e.target.value,
                        )
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
    </div>
  );
}
