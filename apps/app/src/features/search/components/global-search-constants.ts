import { Calendar, FileText, User } from "lucide-react";

export const GLOBAL_SEARCH_INPUT_ID = "global-search-combobox-input";

export const typeIcons = {
  patient: User,
  appointment: Calendar,
  prescription: FileText,
} as const;

export const typeColors = {
  patient: "badge-info",
  appointment: "badge-success",
  prescription: "tier-intelligence",
} as const;

export const searchResultRoutes = {
  patient: (id: string) => `/patients/${id}`,
  appointment: (id: string) => `/appointments?id=${id}`,
  prescription: (id: string) => `/prescriptions/${id}`,
} as const;
