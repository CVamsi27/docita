export interface LabTestResult {
  testName: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  status?: "normal" | "low" | "high" | "critical";
}

export function getTestResultStatus(
  result: LabTestResult,
): LabTestResult["status"] {
  if (result.referenceMin === undefined || result.referenceMax === undefined) return undefined;

  const { value, referenceMin, referenceMax } = result;

  const criticalLow = referenceMin - (referenceMax - referenceMin) * 0.2;
  const criticalHigh = referenceMax + (referenceMax - referenceMin) * 0.2;

  if (value <= criticalLow || value >= criticalHigh) return "critical";
  if (value < referenceMin) return "low";
  if (value > referenceMax) return "high";
  return "normal";
}

export function formatLabValue(value: number, unit: string): string {
  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2);
  return `${formatted} ${unit}`;
}

export function getStatusColor(status: LabTestResult["status"]): string {
  switch (status) {
    case "critical":
      return "text-destructive";
    case "high":
      return "text-warning";
    case "low":
      return "text-info";
    case "normal":
      return "text-success";
    default:
      return "text-muted-foreground";
  }
}

export function hasAbnormalResults(results: LabTestResult[]): boolean {
  return results.some(
    (r) => r.status === "high" || r.status === "low" || r.status === "critical",
  );
}

export function hasCriticalResults(results: LabTestResult[]): boolean {
  return results.some((r) => r.status === "critical");
}

