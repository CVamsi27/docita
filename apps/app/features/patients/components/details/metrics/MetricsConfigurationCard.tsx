import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import type { MetricCategoryResponse } from "@workspace/types";
import { Plus } from "lucide-react";
import { metricValueTypeSchema, type MetricValueType } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

interface MetricsConfigurationCardProps {
  categories: MetricCategoryResponse[];
  newCategoryKey: string;
  newCategoryName: string;
  definitionCategoryId: string;
  newDefinitionKey: string;
  newDefinitionLabel: string;
  newDefinitionType: MetricValueType;
  newDefinitionUnit: string;
  newDefinitionTracked: boolean;
  createCategoryPending: boolean;
  createDefinitionPending: boolean;
  onNewCategoryKeyChange: (v: string) => void;
  onNewCategoryNameChange: (v: string) => void;
  onDefinitionCategoryIdChange: (v: string) => void;
  onNewDefinitionKeyChange: (v: string) => void;
  onNewDefinitionLabelChange: (v: string) => void;
  onNewDefinitionTypeChange: (v: MetricValueType) => void;
  onNewDefinitionUnitChange: (v: string) => void;
  onNewDefinitionTrackedChange: (v: boolean) => void;
  onAddCategory: () => void;
  onAddDefinition: () => void;
}

export function MetricsConfigurationCard({
  categories,
  newCategoryKey,
  newCategoryName,
  definitionCategoryId,
  newDefinitionKey,
  newDefinitionLabel,
  newDefinitionType,
  newDefinitionUnit,
  newDefinitionTracked,
  createCategoryPending,
  createDefinitionPending,
  onNewCategoryKeyChange,
  onNewCategoryNameChange,
  onDefinitionCategoryIdChange,
  onNewDefinitionKeyChange,
  onNewDefinitionLabelChange,
  onNewDefinitionTypeChange,
  onNewDefinitionUnitChange,
  onNewDefinitionTrackedChange,
  onAddCategory,
  onAddDefinition,
}: MetricsConfigurationCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5 text-primary" />
          Add Category / Custom Metric Field
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-sm">New Category</Label>
          <Input
            placeholder="Category key"
            value={newCategoryKey}
            onChange={(event) => onNewCategoryKeyChange(event.target.value)}
          />
          <Input
            placeholder="Category name"
            value={newCategoryName}
            onChange={(event) => onNewCategoryNameChange(event.target.value)}
          />
          <Button
            onClick={onAddCategory}
            disabled={createCategoryPending}
            type="button"
          >
            Add Category
          </Button>
        </div>

        <div className="space-y-3">
          <Label className="text-sm">New Custom Metric Field</Label>
          <Select
            value={definitionCategoryId}
            onValueChange={onDefinitionCategoryIdChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                >
                  {category.name || "Unnamed Category"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Field key"
            value={newDefinitionKey}
            onChange={(event) => onNewDefinitionKeyChange(event.target.value)}
          />
          <Input
            placeholder="Field label"
            value={newDefinitionLabel}
            onChange={(event) => onNewDefinitionLabelChange(event.target.value)}
          />
          <Select
            value={newDefinitionType}
            onValueChange={(value) => {
              const nextType = parseStringEnumMember(
                metricValueTypeSchema.options,
                value,
              );
              if (nextType) onNewDefinitionTypeChange(nextType);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Value type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">Text</SelectItem>
              <SelectItem value="NUMBER">Number</SelectItem>
              <SelectItem value="BOOLEAN">Boolean</SelectItem>
              <SelectItem value="DATE">Date</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Unit"
            value={newDefinitionUnit}
            onChange={(event) => onNewDefinitionUnitChange(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={newDefinitionTracked}
              onCheckedChange={(value) =>
                onNewDefinitionTrackedChange(Boolean(value))
              }
            />
            Track by default
          </label>
          <Button
            onClick={onAddDefinition}
            disabled={createDefinitionPending}
            type="button"
          >
            Add Custom Field
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
