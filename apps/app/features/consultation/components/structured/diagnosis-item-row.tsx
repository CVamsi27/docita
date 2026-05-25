"use client";

import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Stethoscope, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { IcdSearchField } from "./icd-search-field";
import type { DiagnosisItem } from "./diagnosis-input-types";

export function DiagnosisItemRow({
  item,
  index,
  readOnly,
  medicalCodingEnabled,
  onUpdate,
  onSetIcdCode,
  onRemove,
}: {
  item: DiagnosisItem;
  index: number;
  readOnly: boolean;
  medicalCodingEnabled: boolean;
  onUpdate: (field: keyof DiagnosisItem, fieldValue: string) => void;
  onSetIcdCode: (code: DiagnosisItem["icdCode"]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-3 bg-muted/20 border rounded-lg space-y-2 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="badge-info p-1.5 rounded-full">
            <Stethoscope className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">Diagnosis #{index + 1}</span>
          {item.icdCode ? (
            <Badge variant="outline" className="font-mono text-xs text-primary">
              {item.icdCode.code}
            </Badge>
          ) : null}
          {item.type === "final" ? (
            <Badge variant="default" className="bg-success hover:bg-success">
              Final
            </Badge>
          ) : null}
          {item.type === "differential" ? (
            <Badge variant="outline" className="text-muted-foreground">
              Differential
            </Badge>
          ) : null}
        </div>
        {!readOnly ? (
          <SymbolTooltip label="Remove diagnosis">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              aria-label="Remove diagnosis"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="col-span-1 md:col-span-5">
          <Input
            placeholder="Condition name"
            value={item.condition}
            onChange={(e) => onUpdate("condition", e.target.value)}
            readOnly={readOnly}
            className="bg-background font-medium"
          />
        </div>
        <div className="col-span-1 md:col-span-3">
          <Select
            value={item.type}
            onValueChange={(val) => onUpdate("type", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="provisional">Provisional</SelectItem>
              <SelectItem value="differential">Differential</SelectItem>
              <SelectItem value="final">Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 md:col-span-3">
          <Select
            value={item.status}
            onValueChange={(val) => onUpdate("status", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="chronic">Chronic</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {medicalCodingEnabled ? (
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs text-muted-foreground mb-1 block">
              ICD-10 Code
            </label>
            <IcdSearchField
              value={item.icdCode}
              onSelect={(code) => onSetIcdCode(code)}
              onClear={() => onSetIcdCode(undefined)}
              readOnly={readOnly}
            />
          </div>
        ) : item.icdCode ? (
          <div className="col-span-1 md:col-span-6">
            <label className="text-xs text-muted-foreground mb-1 block">
              ICD-10 Code
            </label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="font-mono font-semibold text-primary">
                {item.icdCode.code}
              </span>
              <span className="text-muted-foreground">
                {" "}
                {item.icdCode.description}
              </span>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "col-span-1",
            medicalCodingEnabled || item.icdCode
              ? "md:col-span-6"
              : "md:col-span-12",
          )}
        >
          <label className="text-xs text-muted-foreground mb-1 block">
            Notes / Remarks
          </label>
          <Input
            placeholder="Notes"
            value={item.notes || ""}
            onChange={(e) => onUpdate("notes", e.target.value)}
            readOnly={readOnly}
            className="bg-background text-muted-foreground text-sm"
          />
        </div>
      </div>
    </div>
  );
}
