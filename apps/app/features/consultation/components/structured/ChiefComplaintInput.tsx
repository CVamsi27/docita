"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { useSpeechToText } from "@workspace/hooks";
import { Activity, Plus } from "lucide-react";
import { ChiefComplaintItemRow } from "./chief-complaint-item-row";
import type { ChiefComplaintItem } from "./chief-complaint.types";

export type { ChiefComplaintItem };

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
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {!readOnly && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Start with the main symptom, then add duration, severity, and any
          useful context.
        </p>
      ) : null}

      <div className="space-y-3">
        {items.map((item, index) => (
          <ChiefComplaintItemRow
            key={item.id || index}
            item={item}
            index={index}
            readOnly={readOnly}
            isListening={isListening && listeningIndex === index}
            isSupported={isSupported}
            onMicToggle={() => handleMicToggle(index)}
            onUpdate={(field, fieldValue) =>
              updateItem(index, field, fieldValue)
            }
            onRemove={() => removeItem(index)}
          />
        ))}
      </div>

      {!readOnly ? (
        <Button
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed py-3 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another complaint
        </Button>
      ) : null}

      {items.length === 0 && readOnly ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-muted/10 px-6 py-10 text-center">
          <CategoryAvatar
            icon={<Activity />}
            tone="neutral"
            size="lg"
            aria-label="No complaints"
            className="mx-auto mb-3"
          />
          <p className="font-medium text-foreground">
            No chief complaints recorded
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This consultation does not have a documented presenting complaint
            yet.
          </p>
        </div>
      ) : null}
    </div>
  );
}
