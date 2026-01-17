import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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

  const addItem = () => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        complaint: "",
        durationValue: "",
        durationUnit: "days",
        severity: "moderate",
        notes: "",
      },
    ]);
  };

  const updateItem = (
    index: number,
    field: keyof ChiefComplaintItem,
    fieldValue: string
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
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="p-3 bg-muted/20 border rounded-lg space-y-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-full">
                  <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm font-medium">
                  Complaint #{index + 1}
                </span>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-5">
                <Input
                  placeholder="Symptom (e.g. Fever, Headache)"
                  value={item.complaint}
                  onChange={(e) =>
                    updateItem(index, "complaint", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Input
                  type="number"
                  placeholder="Duration"
                  value={item.durationValue}
                  onChange={(e) =>
                    updateItem(index, "durationValue", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Select
                  value={item.durationUnit}
                  onValueChange={(val) =>
                    updateItem(index, "durationUnit", val)
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="bg-background">
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
              <div className="col-span-1 md:col-span-3">
                <Select
                  value={item.severity}
                  onValueChange={(val) => updateItem(index, "severity", val)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="bg-background">
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
          </div>
        ))}
      </div>

      {!readOnly && (
        <Button
          variant="outline"
          onClick={addItem}
          className="w-full border-dashed py-6 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Complaint
        </Button>
      )}

      {items.length === 0 && readOnly && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          No chief complaints recorded.
        </div>
      )}
    </div>
  );
}
