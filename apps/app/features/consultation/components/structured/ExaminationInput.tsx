import React from "react";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
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
    cvs: string; // Cardiovascular System
    rs: string; // Respiratory System
    pa: string; // Per Abdomen
    cns: string; // Central Nervous System
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
  // Merge with default to ensure all fields exist
  const data = {
    general: { ...DEFAULT_VALUE.general, ...(value?.general || {}) },
    systemic: { ...DEFAULT_VALUE.systemic, ...(value?.systemic || {}) },
  };

  const updateGeneral = (
    field: keyof typeof data.general,
    checked: boolean | string
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

  return (
    <div className="space-y-6">
      {/* General Examination */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            General Examination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "pallor", label: "Pallor" },
              { key: "icterus", label: "Icterus" },
              { key: "cyanosis", label: "Cyanosis" },
              { key: "clubbing", label: "Clubbing" },
              { key: "lymphadenopathy", label: "Lymphadenopathy" },
              { key: "edema", label: "Edema" },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center space-x-2 border p-3 rounded-md bg-muted/10"
              >
                <Switch
                  id={`exam-${item.key}`}
                  checked={
                    data.general[
                      item.key as keyof typeof data.general
                    ] as boolean
                  }
                  onCheckedChange={(checked) =>
                    updateGeneral(
                      item.key as keyof typeof data.general,
                      checked
                    )
                  }
                  disabled={readOnly}
                />
                <Label
                  htmlFor={`exam-${item.key}`}
                  className="cursor-pointer font-medium"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">
              General Notes
            </Label>
            <Textarea
              value={data.general.notes}
              onChange={(e) => updateGeneral("notes", e.target.value)}
              placeholder="Additional general examination findings..."
              readOnly={readOnly}
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Systemic Examination */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Systemic Examination
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion
            type="multiple"
            defaultValue={["cvs", "rs", "pa", "cns"]}
            className="w-full"
          >
            <AccordionItem value="cvs" className="px-6 border-b">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Heart className="h-4 w-4 text-rose-500" /> CVS
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  placeholder="Cardiovascular System findings (e.g. S1S2 heard, no murmurs)"
                  value={data.systemic.cvs}
                  onChange={(e) => updateSystemic("cvs", e.target.value)}
                  readOnly={readOnly}
                  className="min-h-20"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rs" className="px-6 border-b">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wind className="h-4 w-4 text-blue-500" /> Respiratory System
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  placeholder="Respiratory System findings (e.g. B/L air entry clear)"
                  value={data.systemic.rs}
                  onChange={(e) => updateSystemic("rs", e.target.value)}
                  readOnly={readOnly}
                  className="min-h-20"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pa" className="px-6 border-b">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-orange-500" /> Per Abdomen
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  placeholder="Per Abdomen findings (e.g. Soft, non-tender, no organomegaly)"
                  value={data.systemic.pa}
                  onChange={(e) => updateSystemic("pa", e.target.value)}
                  readOnly={readOnly}
                  className="min-h-20"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cns" className="px-6">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-purple-500" /> CNS & Other
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  placeholder="CNS findings & other notes"
                  value={data.systemic.cns}
                  onChange={(e) => updateSystemic("cns", e.target.value)}
                  readOnly={readOnly}
                  className="min-h-20"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
