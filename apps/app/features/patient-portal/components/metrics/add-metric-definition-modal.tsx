"use client";

import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
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
import { getUserFacingErrorMessage } from "@workspace/types";
import { Loader2 } from "lucide-react";
import { useCreatePortalMetricDefinition } from "@/hooks/api/use-patient-portal";

interface MetricCategory {
  id: string;
  name: string;
}

interface AddMetricDefinitionModalProps {
  categories: MetricCategory[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const VALUE_TYPES = [
  { value: "NUMBER", label: "Number" },
  { value: "DECIMAL", label: "Decimal" },
  { value: "TEXT", label: "Text" },
  { value: "BOOLEAN", label: "Yes/No" },
];

export function AddMetricDefinitionModal({
  categories,
  open,
  onClose,
  onSuccess,
}: AddMetricDefinitionModalProps) {
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [valueType, setValueType] = useState("NUMBER");
  const [unit, setUnit] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useCreatePortalMetricDefinition();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!label.trim()) {
      setLocalError("Enter a metric name.");
      return;
    }
    if (!categoryId) {
      setLocalError("Choose a category.");
      return;
    }

    try {
      await mutateAsync({
        categoryId,
        key: label.trim().toLowerCase().replace(/\s+/g, "_"),
        label: label.trim(),
        valueType,
        unit: unit.trim() || undefined,
        isTrackedByDefault: true,
      });
      setLabel("");
      setCategoryId("");
      setValueType("NUMBER");
      setUnit("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setLocalError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not create this metric. Please try again.",
          context: "save",
        }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Metric</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metric-label">Metric Name</Label>
            <Input
              id="metric-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isPending}
              placeholder="e.g., Blood Sugar, Sleep Hours"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metric-category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={isPending}
            >
              <SelectTrigger id="metric-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metric-type">Value Type</Label>
              <Select
                value={valueType}
                onValueChange={setValueType}
                disabled={isPending}
              >
                <SelectTrigger id="metric-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-unit">Unit (optional)</Label>
              <Input
                id="metric-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                disabled={isPending}
                placeholder="e.g., kg, mmHg"
              />
            </div>
          </div>
          {localError && (
            <p className="text-sm text-destructive">{localError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Metric"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
