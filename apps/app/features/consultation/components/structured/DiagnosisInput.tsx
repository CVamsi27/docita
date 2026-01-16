import React from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, X, Stethoscope, Trash2 } from "lucide-react";

export interface DiagnosisItem {
  id: string;
  condition: string;
  type: "provisional" | "final" | "differential";
  status: "active" | "resolved" | "chronic";
  notes?: string;
}

interface DiagnosisInputProps {
  value: DiagnosisItem[];
  onChange: (items: DiagnosisItem[]) => void;
  readOnly?: boolean;
}

export function DiagnosisInput({
  value = [],
  onChange,
  readOnly = false,
}: DiagnosisInputProps) {
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
                <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full">
                  <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium">
                  Diagnosis #{index + 1}
                </span>
                {item.type === "final" && (
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
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
                  placeholder="Condition / Disease Name"
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

              <div className="col-span-1 md:col-span-12">
                <Input
                  placeholder="Notes / Remarks"
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
          className="w-full border-dashed py-6 text-muted-foreground hover:text-primary"
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
