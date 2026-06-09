import type { MetricRecordValueResponse } from "@workspace/types";
import { formatDate } from "@/lib/formatters";

export function extractValue(values: MetricRecordValueResponse[]): string {
  if (!values || values.length === 0) return "—";

  return values
    .map((value) => {
      if (typeof value.valueString === "string") return value.valueString;
      if (typeof value.valueNumber === "number")
        return String(value.valueNumber);
      if (typeof value.valueBoolean === "boolean")
        return value.valueBoolean ? "Yes" : "No";
      if (typeof value.valueDate === "string")
        return formatDate(value.valueDate);
      if (value.option) return value.option.label || value.option.value || "—";
      if (value.valueJson && typeof value.valueJson === "object") return JSON.stringify(value.valueJson);
      return "—";
    })
    .join(", ");
}
