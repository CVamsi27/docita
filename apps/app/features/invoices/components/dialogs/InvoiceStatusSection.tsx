import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";

interface InvoiceStatusSectionProps {
  status: string;
  statusOptions: Array<{ value: string; label: string }>;
  onStatusChange: (value: string) => void;
}

export function InvoiceStatusSection({
  status,
  statusOptions,
  onStatusChange,
}: InvoiceStatusSectionProps) {
  return (
    <div className="space-y-2">
      <Label>Status</Label>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
