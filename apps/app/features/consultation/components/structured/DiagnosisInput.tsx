"use client";

import React, { useState } from "react";
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
import { Plus, Search, Stethoscope, Trash2, X } from "lucide-react";
import { Feature } from "@workspace/types";
import { cn } from "@workspace/ui/lib/utils";
import { useSearchIcdCodes } from "@workspace/data-access";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useDebounce } from "@workspace/hooks/use-debounce";

export interface DiagnosisItem {
  id: string;
  condition: string;
  type: "provisional" | "final" | "differential";
  status: "active" | "resolved" | "chronic";
  notes?: string;
  icdCode?: {
    id: string;
    code: string;
    description: string;
  };
}

interface DiagnosisInputProps {
  value: DiagnosisItem[];
  onChange: (items: DiagnosisItem[]) => void;
  readOnly?: boolean;
}

function IcdSearchField({
  value,
  onSelect,
  onClear,
  readOnly,
}: {
  value?: DiagnosisItem["icdCode"];
  onSelect: (code: { id: string; code: string; description: string }) => void;
  onClear: () => void;
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { data: results = [] } = useSearchIcdCodes(
    debouncedSearch.length >= 2 ? debouncedSearch : "",
  );

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 text-sm">
        <span className="font-mono font-semibold text-primary">{value.code}</span>
        <span className="text-muted-foreground truncate flex-1">{value.description}</span>
        {!readOnly && (
          <SymbolTooltip label="Clear ICD-10 code">
            <button
              type="button"
              onClick={onClear}
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label="Clear ICD-10 code"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </SymbolTooltip>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="px-3 py-2 rounded-md border bg-muted/10 text-sm text-muted-foreground">
        No ICD-10 code
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          placeholder="ICD-10 code"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`h-9 bg-background pl-8 text-sm${search.trim() ? " pr-9" : ""}`}
          aria-label="Search ICD-10 codes"
        />
        {search.trim() ? (
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <SymbolTooltip label="Clear search">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                  setSearch("");
                  setOpen(false);
                }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </Button>
            </SymbolTooltip>
          </div>
        ) : null}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-48 overflow-y-auto py-1">
            {results.map((icd) => (
              <li key={icd.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    onSelect({ id: icd.id, code: icd.code, description: icd.description });
                    setSearch("");
                    setOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                >
                  <span className="font-mono font-semibold text-primary shrink-0">{icd.code}</span>
                  <span className="text-muted-foreground truncate">{icd.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DiagnosisInput({
  value = [],
  onChange,
  readOnly = false,
}: DiagnosisInputProps) {
  const medicalCodingEnabled = usePermissionStore((s) =>
    s.canAccess(Feature.MEDICAL_CODING),
  );
  const items = value.length > 0 ? value : [];

  const addItem = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        condition: "",
        type: "provisional",
        status: "active",
        notes: "",
      },
    ]);
  };

  const updateItem = (
    index: number,
    field: keyof DiagnosisItem,
    fieldValue: string,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: fieldValue };
    onChange(newItems);
  };

  const setIcdCode = (index: number, code: DiagnosisItem["icdCode"]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], icdCode: code };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="p-3 bg-muted/20 border rounded-lg space-y-2 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="badge-info p-1.5 rounded-full">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">
                  Diagnosis #{index + 1}
                </span>
                {item.icdCode ? (
                  <Badge variant="outline" className="font-mono text-xs text-primary">
                    {item.icdCode.code}
                  </Badge>
                ) : null}
                {item.type === "final" && (
                  <Badge
                    variant="default"
                    className="bg-success hover:bg-success"
                  >
                    Final
                  </Badge>
                )}
                {item.type === "differential" && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Differential
                  </Badge>
                )}
              </div>
              {!readOnly && (
                <SymbolTooltip label="Remove diagnosis">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(index)}
                    aria-label="Remove diagnosis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </SymbolTooltip>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-5">
                <Input
                  placeholder="Condition name"
                  value={item.condition}
                  onChange={(e) =>
                    updateItem(index, "condition", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background font-medium"
                />
              </div>
              <div className="col-span-1 md:col-span-3">
                <Select
                  value={item.type}
                  onValueChange={(val) => updateItem(index, "type", val)}
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
                  onValueChange={(val) => updateItem(index, "status", val)}
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
                    onSelect={(code) => setIcdCode(index, code)}
                    onClear={() => setIcdCode(index, undefined)}
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
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                  readOnly={readOnly}
                  className="bg-background text-muted-foreground text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <Button
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed py-3 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Diagnosis
        </Button>
      )}

      {items.length === 0 && readOnly && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          No diagnosis recorded.
        </div>
      )}
    </div>
  );
}
