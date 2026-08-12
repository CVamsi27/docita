import { getConsultationSectionsForClinic } from "@/features/consultation/workspace/consultation-section-registry";

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
  CARDIOLOGY: "cardiology-exam",
  DERMATOLOGY: "dermatology-exam",
  GYNECOLOGY: "gynecology-exam",
  PSYCHIATRY: "mental-status-exam",
};

const LEGACY_TAB_MAPPING: Record<string, string> = {
  observations: "chief-complaint",
  vitals: "examination",
  prescription: "treatment",
  invoice: "treatment",
};

/** Maps normalized legacy `tab` query values to workspace `section` ids (SOAP + specialty). */
const LEGACY_TAB_TO_SECTION_ID: Record<string, string> = {
  "chief-complaint": "subjective",
  history: "subjective",
  examination: "objective",
  diagnosis: "assessment",
  treatment: "plan",
  "dental-chart": "specialty-dental",
  "vision-exam": "specialty-vision",
  "growth-chart": "specialty-growth",
  "cardiology-exam": "specialty-cardiology",
  "dermatology-exam": "specialty-dermatology",
  "gynecology-exam": "specialty-gynecology",
  "mental-status-exam": "specialty-psychiatry",
  "psychiatry-exam": "specialty-psychiatry",
  investigations: "specialty-investigations",
  "labs-imaging": "specialty-investigations",
};

export function legacyTabToSectionId(
  rawTab?: string | null,
  clinicType?: string | null,
): string | undefined {
  const tab = normalizeConsultationTab(rawTab, clinicType);
  return LEGACY_TAB_TO_SECTION_ID[tab];
}

/** Resolve workspace section from URL: prefers `section`, falls back to mapped legacy `tab`. */
export function resolveConsultationSectionFromUrl(
  sectionParam?: string | null,
  tabParam?: string | null,
  clinicType?: string | null,
): string | undefined {
  const trimmed = sectionParam?.trim();
  if (trimmed) return trimmed;
  return legacyTabToSectionId(tabParam, clinicType);
}

function normalizeRawTab(rawTab?: string | null): string {
  if (!rawTab) return "chief-complaint";
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
  const mappedSection = LEGACY_TAB_TO_SECTION_ID[tab];
  if (mappedSection) {
    const sections = getConsultationSectionsForClinic(clinicType);
    if (sections.some((s) => s.id === mappedSection)) {
      return tab;
    }
  }
  const validTabs = getConsultationTabIds(clinicType);
  return validTabs.includes(tab) ? tab : "chief-complaint";
}

export function buildConsultationRoute(
  appointmentId: string,
  options?: {
    tab?: string;
    section?: string;
    from?: string;
    clinicType?: string | null;
  },
): string {
  const params = new URLSearchParams();

  let sectionId = options?.section?.trim();
  if (!sectionId && options?.tab != null) {
    sectionId = legacyTabToSectionId(options.tab, options?.clinicType);
  }

  if (sectionId && sectionId !== "subjective") {
    params.set("section", sectionId);
  }

  if (options?.from) {
    params.set("from", options.from);
  }

  const query = params.toString();
  return query
    ? `/consultation/${appointmentId}?${query}`
    : `/consultation/${appointmentId}`;
}
