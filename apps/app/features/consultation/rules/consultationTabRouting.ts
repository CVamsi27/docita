const BASE_CONSULTATION_TABS = [
  "chief-complaint",
  "history",
  "examination",
  "diagnosis",
  "treatment",
] as const;

const SPECIALTY_TAB_BY_CLINIC: Record<string, string> = {
  DENTAL: "dental-chart",
  OPHTHALMOLOGY: "vision-exam",
  PEDIATRIC: "growth-chart",
};

const LEGACY_TAB_MAPPING: Record<string, string> = {
  observations: "chief-complaint",
  vitals: "examination",
  prescription: "treatment",
  invoice: "treatment",
};

function normalizeRawTab(rawTab?: string | null): string {
  if (!rawTab) {
    return "chief-complaint";
  }
  const normalized = rawTab.trim().toLowerCase();
  return LEGACY_TAB_MAPPING[normalized] || normalized;
}

export function getConsultationTabIds(clinicType?: string | null): string[] {
  const tabs: string[] = [...BASE_CONSULTATION_TABS];
  const specialtyTab = clinicType
    ? SPECIALTY_TAB_BY_CLINIC[clinicType.toUpperCase()]
    : undefined;

  if (specialtyTab) {
    tabs.splice(3, 0, specialtyTab);
  }

  return tabs;
}

export function normalizeConsultationTab(
  rawTab?: string | null,
  clinicType?: string | null,
): string {
  const tab = normalizeRawTab(rawTab);
  const validTabs = getConsultationTabIds(clinicType);
  return validTabs.includes(tab) ? tab : "chief-complaint";
}

export function buildConsultationRoute(
  appointmentId: string,
  options?: {
    tab?: string;
    from?: string;
    clinicType?: string | null;
  },
): string {
  const params = new URLSearchParams();
  const normalizedTab = normalizeConsultationTab(options?.tab, options?.clinicType);

  if (normalizedTab !== "chief-complaint") {
    params.set("tab", normalizedTab);
  }
  if (options?.from) {
    params.set("from", options.from);
  }

  const query = params.toString();
  return query
    ? `/consultation/${appointmentId}?${query}`
    : `/consultation/${appointmentId}`;
}
