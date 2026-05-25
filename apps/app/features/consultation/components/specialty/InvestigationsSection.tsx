"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { SectionContainer } from "@/features/consultation/workspace/chrome/SectionContainer";
import { useConsultationSectionSubtitle } from "@/features/consultation/workspace/consultation-workspace-context";
import { type ClinicalInvestigation } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

const INVESTIGATION_CATEGORIES = [
  "LABORATORY",
  "IMAGING",
  "SPECIAL",
  "OTHER",
] as const;
const INVESTIGATION_STATUSES = [
  "ORDERED",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;

interface InvestigationsSectionProps {
  readOnly?: boolean;
  sectionRef?: React.Ref<HTMLElement>;
}

function newInvestigation(): ClinicalInvestigation {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "IMAGING",
    status: "ORDERED",
    notes: "",
  };
}

export function InvestigationsSection({
  readOnly,
  sectionRef,
}: InvestigationsSectionProps) {
  const subtitle = useConsultationSectionSubtitle("specialty-investigations");
  const investigations = useConsultationDraft((s) => s.investigations);
  const setInvestigations = useConsultationDraft((s) => s.setInvestigations);

  const updateAt = (index: number, patch: Partial<ClinicalInvestigation>) => {
    setInvestigations((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeAt = (index: number) => {
    setInvestigations((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SectionContainer
      ref={sectionRef}
      id="specialty-investigations"
      letter="I"
      title="Investigations"
      subtitle={subtitle}
      description="Laboratory and imaging orders with status tracking."
      actions={
        !readOnly ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              setInvestigations((prev) => [...prev, newInvestigation()])
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add
          </Button>
        ) : null
      }
    >
      {investigations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No investigations recorded. Add imaging or labs when needed.
        </p>
      ) : (
        <ul className="space-y-4">
          {investigations.map((row, index) => (
            <li
              key={row.id ?? `inv-${index}`}
              className="rounded-lg border border-border/70 bg-muted/5 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  <Label htmlFor={`inv-name-${index}`} className="text-xs">
                    Name
                  </Label>
                  <Input
                    id={`inv-name-${index}`}
                    readOnly={readOnly}
                    placeholder="Study or test name"
                    value={row.name}
                    onChange={(e) => updateAt(index, { name: e.target.value })}
                  />
                </div>
                <div className="w-[140px] space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select
                    disabled={readOnly}
                    value={row.category ?? "OTHER"}
                    onValueChange={(category) => {
                      const parsed = parseStringEnumMember(
                        INVESTIGATION_CATEGORIES,
                        category,
                      );
                      if (parsed) updateAt(index, { category: parsed });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LABORATORY">Laboratory</SelectItem>
                      <SelectItem value="IMAGING">Imaging</SelectItem>
                      <SelectItem value="SPECIAL">Special</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[140px] space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select
                    disabled={readOnly}
                    value={row.status ?? "ORDERED"}
                    onValueChange={(status) => {
                      const parsed = parseStringEnumMember(
                        INVESTIGATION_STATUSES,
                        status,
                      );
                      if (parsed) updateAt(index, { status: parsed });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORDERED">Ordered</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!readOnly ? (
                  <SymbolTooltip label="Remove investigation">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remove investigation"
                      onClick={() => removeAt(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </SymbolTooltip>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`inv-notes-${index}`} className="text-xs">
                  Notes / results
                </Label>
                <Textarea
                  id={`inv-notes-${index}`}
                  readOnly={readOnly}
                  className="min-h-[72px]"
                  placeholder="Findings"
                  value={row.notes ?? ""}
                  onChange={(e) => updateAt(index, { notes: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionContainer>
  );
}
