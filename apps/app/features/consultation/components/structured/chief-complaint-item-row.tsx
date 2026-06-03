"use client";

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
import { MicButton } from "@workspace/ui/components/form/mic-button";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { Activity, Trash2 } from "lucide-react";
import type { ChiefComplaintItem } from "./chief-complaint.types";

export function ChiefComplaintItemRow({
  item,
  index,
  readOnly,
  isListening,
  isSupported,
  onMicToggle,
  onUpdate,
  onRemove,
}: {
  item: ChiefComplaintItem;
  index: number;
  readOnly: boolean;
  isListening: boolean;
  isSupported: boolean;
  onMicToggle: () => void;
  onUpdate: (field: keyof ChiefComplaintItem, value: string) => void;
  onRemove: () => void;
}) {
  const isPrimary = index === 0;
  const hasComplaint = item.complaint.trim().length > 0;
  const durationNumber = Number(item.durationValue);
  const hasDurationValue = item.durationValue.trim().length > 0;
  const isDurationValid = !hasComplaint
    ? true
    : hasDurationValue && Number.isFinite(durationNumber) && durationNumber > 0;

  return (
    <div
      className={`space-y-3 rounded-[var(--radius-md)] border p-3 transition-colors duration-150 ${
        isPrimary
          ? "border-primary/30 bg-primary/5"
          : "border-border/70 bg-card hover:bg-muted/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CategoryAvatar
              icon={<Activity />}
              tone="primary"
              size="sm"
              aria-label="Complaint"
            />
            <span className="text-sm font-semibold">
              {isPrimary
                ? "Primary complaint"
                : `Additional complaint ${index}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPrimary
              ? "What is the main reason for this consultation?"
              : "Add another symptom or concern if it is clinically relevant"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              hasComplaint ? "badge-success" : "badge-warning"
            }`}
          >
            {hasComplaint ? "Recorded" : "Needs symptom"}
          </span>
          {!readOnly ? (
            <SymbolTooltip
              label={
                isPrimary
                  ? "Remove primary complaint"
                  : "Remove additional complaint"
              }
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={onRemove}
                aria-label="Remove complaint"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`chief-complaint-${index}`}>Symptom or concern</Label>
          {!readOnly ? (
            <MicButton
              isListening={isListening}
              isSupported={isSupported}
              onClick={onMicToggle}
              withLabel
            />
          ) : null}
        </div>
        <Input
          id={`chief-complaint-${index}`}
          placeholder="Symptom or concern"
          value={item.complaint}
          onChange={(e) => onUpdate("complaint", e.target.value)}
          readOnly={readOnly}
          className="h-11 bg-background"
        />
        {!readOnly && !hasComplaint ? (
          <p className="text-sm text-warning">
            Enter the main symptom or reason for visit.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`duration-value-${index}`}>Duration</Label>
          <Input
            id={`duration-value-${index}`}
            type="number"
            min="1"
            placeholder="Duration"
            value={item.durationValue}
            onChange={(e) => onUpdate("durationValue", e.target.value)}
            readOnly={readOnly}
            className="h-11 bg-background"
          />
          {!readOnly && hasComplaint && !isDurationValid ? (
            <p className="text-sm text-warning">
              Duration must be greater than 0.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Unit</Label>
          <Select
            value={item.durationUnit}
            onValueChange={(val) => onUpdate("durationUnit", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
              <SelectItem value="years">Years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Severity</Label>
          <Select
            value={item.severity}
            onValueChange={(val) => onUpdate("severity", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">Mild</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`complaint-notes-${index}`}>Clinical notes</Label>
        <Textarea
          id={`complaint-notes-${index}`}
          placeholder="Clinical notes"
          value={item.notes || ""}
          onChange={(e) => onUpdate("notes", e.target.value)}
          readOnly={readOnly}
          className="min-h-[96px] bg-background"
        />
      </div>
    </div>
  );
}
