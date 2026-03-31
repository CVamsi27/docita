

export const TEETH_QUADRANTS = {
  UR: [18, 17, 16, 15, 14, 13, 12, 11], 
  UL: [21, 22, 23, 24, 25, 26, 27, 28], 
  LL: [31, 32, 33, 34, 35, 36, 37, 38], 
  LR: [48, 47, 46, 45, 44, 43, 42, 41], 
} as const;

export const TOOTH_CONDITIONS = [
  { value: "HEALTHY", label: "Healthy", color: "bg-background border-border" },
  { value: "CARIES", label: "Caries", color: "badge-danger" },
  { value: "FILLED", label: "Filled", color: "badge-info" },
  {
    value: "MISSING",
    label: "Missing",
    color: "bg-muted border-border opacity-50",
  },
  { value: "CROWN", label: "Crown", color: "badge-warning" },
  {
    value: "ROOT_CANAL",
    label: "Root Canal",
    color: "tier-pro",
  },
  {
    value: "IMPLANT",
    label: "Implant",
    color: "badge-success",
  },
] as const;
