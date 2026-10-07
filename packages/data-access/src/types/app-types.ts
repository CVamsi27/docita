export interface AppConstants {
  followUpTypes: Array<{ value: string; label: string }>;
  reminderDays: Array<{ value: number; label: string }>;
  inventoryCategories: Array<{ value: string; label: string }>;
  queueStatuses: Array<{ value: string; label: string }>;
  wardTypes: Array<{ value: string; label: string }>;
  availableBeds: Array<{ value: string; label: string }>;
  teethQuadrants: Record<string, number[]>;
  toothConditions: Array<{ value: string; label: string; color: string }>;
}

