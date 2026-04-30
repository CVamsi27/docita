import React, { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { MicButton } from "@workspace/ui/components/mic-button";
import { useSpeechToText } from "@workspace/hooks";
import { Activity, Plus, Trash2 } from "lucide-react";

export interface ChiefComplaintItem {
  id: string;
  complaint: string;
  durationValue: string;
  durationUnit: string;
  severity: string;
  notes?: string;
}

interface ChiefComplaintInputProps {
  value: ChiefComplaintItem[];
  onChange: (items: ChiefComplaintItem[]) => void;
  readOnly?: boolean;
}

export function ChiefComplaintInput({
  value = [],
  onChange,
  readOnly = false,
}: ChiefComplaintInputProps) {
  const items = value.length > 0 ? value : [];
  const [listeningIndex, setListeningIndex] = useState<number | null>(null);

  const { isListening, isSupported, start, stop } = useSpeechToText({
    language: "en-IN",
    onResult: (text) => {
      if (listeningIndex === null) return;
      const newItems = [...items];
      const current = newItems[listeningIndex];
      if (!current) return;
      newItems[listeningIndex] = {
        ...current,
        complaint: current.complaint
          ? `${current.complaint} ${text}`.trim()
          : text,
      };
      onChange(newItems);
    },
  });

  const handleMicToggle = (index: number) => {
    if (isListening) {
      stop();
      setListeningIndex(null);
      return;
    }

    setListeningIndex(index);
    start();
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        complaint: "",
        durationValue: "1",
        durationUnit: "days",
        severity: "moderate",
        notes: "",
      },
    ]);
  };

  const updateItem = (
    index: number,
    field: keyof ChiefComplaintItem,
    fieldValue: string,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: fieldValue };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-1.5 text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold">
                Capture the patient concern clearly
              </h3>
              <p className="text-xs text-muted-foreground">
                Start with the main symptom, then add duration, severity, and
                any useful clinical context.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, index) => {
          const isPrimary = index === 0;
          const hasComplaint = item.complaint.trim().length > 0;
          const durationNumber = Number(item.durationValue);
          const hasDurationValue = item.durationValue.trim().length > 0;
          const isDurationValid = !hasComplaint
            ? true
            : hasDurationValue && Number.isFinite(durationNumber) && durationNumber > 0;

          return (
            <div
              key={item.id || index}
              className={`space-y-3 rounded-lg border p-3 transition-colors ${
                isPrimary
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card hover:bg-muted/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-background p-1.5 text-primary shadow-sm">
                      <Activity className="h-4 w-4" />
                    </div>
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
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`chief-complaint-${index}`}>
                    Symptom or concern
                  </Label>
                  {!readOnly && (
                    <MicButton
                      isListening={isListening && listeningIndex === index}
                      isSupported={isSupported}
                      onClick={() => handleMicToggle(index)}
                    />
                  )}
                </div>
                <Input
                  id={`chief-complaint-${index}`}
                  placeholder="e.g. Fever with chills, headache, abdominal pain"
                  value={item.complaint}
                  onChange={(e) =>
                    updateItem(index, "complaint", e.target.value)
                  }
                  readOnly={readOnly}
                  className="h-11 bg-background"
                />
                {!readOnly && !hasComplaint && (
                  <p className="text-sm text-warning">
                    Enter the main symptom or reason for visit.
                  </p>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`duration-value-${index}`}>Duration</Label>
                  <Input
                    id={`duration-value-${index}`}
                    type="number"
                    min="1"
                    placeholder="How long?"
                    value={item.durationValue}
                    onChange={(e) =>
                      updateItem(index, "durationValue", e.target.value)
                    }
                    readOnly={readOnly}
                    className="h-11 bg-background"
                  />
                  {!readOnly && hasComplaint && !isDurationValid && (
                    <p className="text-sm text-warning">
                      Duration must be greater than 0.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={item.durationUnit}
                    onValueChange={(val) =>
                      updateItem(index, "durationUnit", val)
                    }
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
                    onValueChange={(val) => updateItem(index, "severity", val)}
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
                <Label htmlFor={`complaint-notes-${index}`}>
                  Clinical notes
                </Label>
                <Textarea
                  id={`complaint-notes-${index}`}
                  placeholder="Optional context: progression, triggers, associated symptoms, or patient wording"
                  value={item.notes || ""}
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                  readOnly={readOnly}
                  className="min-h-[96px] bg-background"
                />
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <Button
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed py-3 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Complaint
        </Button>
      )}

      {items.length === 0 && readOnly && (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <p className="font-medium text-foreground">
            No chief complaints recorded
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This consultation does not have a documented presenting complaint
            yet.
          </p>
        </div>
      )}
    </div>
  );
}
