export function getConditionColor(code: string): string {
  switch (code) {
    case "CARIES":
      return "bg-destructive";
    case "FILLED":
      return "bg-info";
    case "CROWN":
      return "bg-warning";
    case "ROOT_CANAL":
      return "bg-primary";
    case "IMPLANT":
      return "bg-success";
    case "MISSING":
      return "bg-muted-foreground/50";
    default:
      return "bg-muted";
  }
}

export function getToothData(
  value: Record<number, { condition: string; notes: string }>,
  toothId: number,
): { condition: string; notes: string } {
  return value?.[toothId] || { condition: "HEALTHY", notes: "" };
}
