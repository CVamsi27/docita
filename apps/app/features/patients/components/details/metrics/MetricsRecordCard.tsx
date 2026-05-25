import { Button } from "@workspace/ui/components/form/button";
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
import { Settings2 } from "lucide-react";

interface FlatDefinition {
  id: string;
  label: string;
  valueType: string;
}

interface MetricsRecordCardProps {
  categoryKey?: string;
  flatDefinitions: FlatDefinition[];
  valueDefinitionId: string;
  valueInput: string;
  isPending: boolean;
  onValueDefinitionIdChange: (id: string) => void;
  onValueInputChange: (value: string) => void;
  onRecordValue: () => void;
}

export function MetricsRecordCard({
  categoryKey,
  flatDefinitions,
  valueDefinitionId,
  valueInput,
  isPending,
  onValueDefinitionIdChange,
  onValueInputChange,
  onRecordValue,
}: MetricsRecordCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5 text-primary" />
          {categoryKey === "vitals" ? "Record Vitals Value" : "Record Metric Value"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] items-end">
        <div className="space-y-2">
          <Label>Metric</Label>
          <Select value={valueDefinitionId} onValueChange={onValueDefinitionIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              {flatDefinitions.length === 0 ? (
                <SelectItem value="__empty" disabled>
                  No metrics available yet
                </SelectItem>
              ) : (
                flatDefinitions.map((definition) => (
                  <SelectItem key={definition.id} value={definition.id}>
                    {definition.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            placeholder="Value"
            value={valueInput}
            onChange={(event) => onValueInputChange(event.target.value)}
          />
        </div>
        <Button type="button" onClick={onRecordValue} disabled={isPending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
