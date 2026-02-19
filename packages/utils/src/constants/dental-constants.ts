// FDI Notation
// Quadrants: 1=UR, 2=UL, 3=LL, 4=LR (Permanent)
// 5=UR, 6=UL, 7=LL, 8=LR (Primary - omitted for MVP but can be added)

export const TEETH_QUADRANTS = {
  UR: [18, 17, 16, 15, 14, 13, 12, 11], // Upper Right
  UL: [21, 22, 23, 24, 25, 26, 27, 28], // Upper Left
  LL: [31, 32, 33, 34, 35, 36, 37, 38], // Lower Left
  LR: [48, 47, 46, 45, 44, 43, 42, 41], // Lower Right
} as const;

export const TOOTH_CONDITIONS = [
  { value: "HEALTHY", label: "Healthy", color: "bg-white border-slate-200" },
  { value: "CARIES", label: "Caries", color: "bg-red-100 border-red-300" },
  { value: "FILLED", label: "Filled", color: "bg-blue-100 border-blue-300" },
  {
    value: "MISSING",
    label: "Missing",
    color: "bg-slate-100 border-slate-200 opacity-50",
  },
  { value: "CROWN", label: "Crown", color: "bg-yellow-100 border-yellow-300" },
  {
    value: "ROOT_CANAL",
    label: "Root Canal",
    color: "bg-purple-100 border-purple-300",
  },
  {
    value: "IMPLANT",
    label: "Implant",
    color: "bg-green-100 border-green-300",
  },
] as const;
