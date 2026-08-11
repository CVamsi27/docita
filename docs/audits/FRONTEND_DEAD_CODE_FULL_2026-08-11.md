# Frontend Dead Code Complete Inventory — 2026-08-11

Every dead export in `apps/app/src` and `apps/internal/src`. **94 unused-in-production exports across 51 files.** For each, this document shows the export name, the file:line, the surrounding source context, and a recommended action.

This is the "document code that can be removed" companion to the useEffect pass.

## Summary

- **61 exports are tested but never imported by production code** — these are the safest deletions. The rules exist (often with thorough tests) but no consumer ever calls them.
- **33 exports are completely orphaned** — no production, no test usage.

| Group | Files | Exports | Risk |
|---|---|---|---|
| A — `features/*/rules/*.ts` business rules | 8 | 33 | Low (each has its own test) |
| B — `features/ipd/*` entire sub-feature unused | 4 | 6 | Low (no test consumers) |
| C — `features/patient-portal/*` unused | 2 | 2 | Low |
| D — `features/lab-tests/components/settings/*` | 2 | 2 | Low |
| E — `features/legal/*` consent modal | 3 | 5 | Low |
| F — `features/dashboard/*`, `features/daybook/*`, `features/consultation/components/*` helpers | 9 | 9 | Low |
| G — `features/auth/lib/auth-landing-path.ts` | 1 | 1 | Verify before delete |
| H — Settings / utilities orphaned | 14 | 22 | Verify a few before delete |
| I — `apps/internal` `resolveInternalApiUrl` | 1 | 1 | Verify before delete |
| **Total** | **51** | **94** | |

## Per-file inventory

Each entry shows:
- **File path**
- **Export name** and whether it's used only in tests or nowhere
- **Source context** (5 lines before, 10 after the export) for verification
- **Recommended action**



## `apps/app/src/components/loaders/page-skeleton.tsx` (177 lines total)


### `DashboardSkeleton` — only used in tests

**Line 15**

```ts

/* -------------------------------------------------------------------------- */
/*  Dashboard skeleton (stats cards + table)                                  */
/* -------------------------------------------------------------------------- */

export function DashboardSkeleton({ actionCount = 4 }: { actionCount?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-6 w-48" />
          <SkeletonBar className="h-4 w-72" />
        </div>
        <SkeletonBar className="h-9 w-32" />
      </div>

      {/* Stat cards */}
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


### `ListPageSkeleton` — only used in tests

**Line 56**

```ts

/* -------------------------------------------------------------------------- */
/*  List page skeleton (search + rows)                                        */
/* -------------------------------------------------------------------------- */

export function ListPageSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-6 w-40" />
          <SkeletonBar className="h-4 w-56" />
        </div>
        <SkeletonBar className="h-9 w-28" />
      </div>
      <SkeletonBar className="h-10 w-full max-w-sm" />
      <div className="rounded-lg border divide-y divide-border/60">
        {Array.from({ length: rowCount }).map((_, i) => (
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


### `DetailPageSkeleton` — only used in tests

**Line 87**

```ts

/* -------------------------------------------------------------------------- */
/*  Detail page skeleton (back button + cards)                                */
/* -------------------------------------------------------------------------- */

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonBar className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <SkeletonBar className="h-5 w-48" />
          <SkeletonBar className="h-3 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-5 space-y-4">
          <SkeletonBar className="h-5 w-32" />
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


### `StatCardsSkeleton` — only used in tests

**Line 119**

```ts

/* -------------------------------------------------------------------------- */
/*  Stats cards skeleton (for stat-grid-heavy pages like analytics, daybook)   */
/* -------------------------------------------------------------------------- */

export function StatCardsSkeleton({ cardCount = 4 }: { cardCount?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/components/navigation/nav-config-sections.tsx` (54 lines total)


### `NavSectionId` — no usage anywhere

**Line 14**

```ts
  labelKey?: string;
  feature?: Feature;
  accessTarget?: AppAccessTarget;
}

export type NavSectionId = "track" | "services";

export interface NavSection {
  id: NavSectionId;
  label: string;
  items: NavItem[];
}

const TRACK_ITEMS: NavItem[] = [
  { href: "/today", icon: CalendarClock, label: "Today", labelKey: "today", accessTarget: APP_ACCESS_TARGETS.PAGE_DASHBOARD },
  { href: "/consultation", icon: Stethoscope, label: "Consultation", labelKey: "consultation", accessTarget: APP_ACCESS_TARGETS.PAGE_CONSULTATION },
  { href: "/appointments", icon: CalendarDays, label: "Appointments", labelKey: "appointments", feature: Feature.CALENDAR_SLOTS, accessTarget: APP_ACCESS_TARGETS.PAGE_APPOINTMENTS },
  { href: "/patients", icon: Users, label: "Patients", labelKey: "patients", feature: Feature.BASIC_PATIENT_MANAGEMENT, accessTarget: APP_ACCESS_TARGETS.PAGE_PATIENTS },
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/features/appointments/lib/appointments-page-helpers.ts` (54 lines total)


### `AppointmentSummaryBreakdown` — no usage anywhere

**Line 7**

```ts
import type { AppointmentListItem } from "@workspace/data-access";
import type { StatusType } from "@workspace/ui/components/indicators/status-badge";

export const REQUESTS_PANEL_FOCUS_PARAM = "requestsPanel";

export interface AppointmentSummaryBreakdown {
  label: string;
  value: number;
  status: StatusType;
}

export interface AppointmentSummary {
  total: number;
  breakdown: AppointmentSummaryBreakdown[];
}

export function computeAppointmentSummary(
  appointments: AppointmentListItem[],
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/appointments/rules/appointment-rules.ts` (74 lines total)


### `isAppointmentPast` — only used in tests

**Line 10**

```ts
  isToday,
  startOfMinute,
  subMinutes,
} from "@workspace/utils";

export const isAppointmentPast = (appointment: Appointment): boolean => {
  return isPast(appointment.startTime);
};

export const isAppointmentToday = (appointment: Appointment): boolean => {
  return isToday(appointment.startTime);
};

/** Visit is finished: clinical record should not be edited in the consultation workspace. */
export const isConsultationReadOnlyStatus = (
  status: Appointment["status"] | string | undefined,
): boolean => status === "completed" || status === "no-show";

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `isAppointmentToday` — only used in tests

**Line 14**

```ts

export const isAppointmentPast = (appointment: Appointment): boolean => {
  return isPast(appointment.startTime);
};

export const isAppointmentToday = (appointment: Appointment): boolean => {
  return isToday(appointment.startTime);
};

/** Visit is finished: clinical record should not be edited in the consultation workspace. */
export const isConsultationReadOnlyStatus = (
  status: Appointment["status"] | string | undefined,
): boolean => status === "completed" || status === "no-show";

export { getAppointmentStatusDisplay } from "./appointment-status-display";
export { validateAppointmentData } from "./appointment-validation";

export const canCheckIn = (appointment: Appointment): boolean => {
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `canCheckIn` — only used in tests

**Line 26**

```ts
): boolean => status === "completed" || status === "no-show";

export { getAppointmentStatusDisplay } from "./appointment-status-display";
export { validateAppointmentData } from "./appointment-validation";

export const canCheckIn = (appointment: Appointment): boolean => {
  if (
    appointment.status === "checked-in" ||
    appointment.status === "in-progress"
  ) return false;

  const appointmentDate = startOfMinute(new Date(appointment.startTime));
  const now = startOfMinute(new Date());
  const earliestAllowedCheckInTime = subMinutes(appointmentDate, 60);
  const latestAllowedCheckInTime = addMinutes(appointmentDate, 15);

  return now >= earliestAllowedCheckInTime && now <= latestAllowedCheckInTime;
};
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `canCancel` — only used in tests

**Line 40**

```ts
  const latestAllowedCheckInTime = addMinutes(appointmentDate, 15);

  return now >= earliestAllowedCheckInTime && now <= latestAllowedCheckInTime;
};

export const canCancel = (appointment: Appointment): boolean => {
  return (
    appointment.status !== "completed" && appointment.status !== "cancelled"
  );
};

/**
 * True when the row should expose its primary "Start / Resume / View" action.
 *
 * - completed / no-show: always show (button reads "View"; lets the doctor
 *   reopen the past consultation record).
 * - in-progress: always show (button reads "Resume").
 * - scheduled / checked-in: only show once the start time has arrived;
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/auth/lib/auth-landing-path.ts` (41 lines total)


### `getPostAuthPath` — only used in tests

**Line 9**

```ts
import { parseUserRole } from "@/lib/access-control/parse-user-role";
import type { UserRole } from "@workspace/types";

const ROLES_LAND_ON_CONSULTATION = new Set<UserRole>(["DOCTOR", "ADMIN_DOCTOR"]);

export function getPostAuthPath(user: User): string {
  if (user.emailVerified === false) return "/verify-email-sent";

  if (!user.clinicId) {
    switch (user.onboardingStep) {
      case "JOINING_CLINIC":
        return "/join-request-status";
      case "CREATING_CLINIC":
        return "/onboarding";
      case "CHOOSE_PATH":
      case "NOT_STARTED":
      default:
        return "/choose-path";
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/features/consultation/components/consultation-page-header-helpers.ts` (53 lines total)


### `CONSULTATION_STATUS_STYLES` — only used in tests

**Line 4**

```ts
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { getInitials } from "@/lib/formatters";

export const CONSULTATION_STATUS_STYLES: Record<string, string> = {
  scheduled: "badge-info",
  in_progress: "badge-success",
  completed: "badge-muted",
  cancelled: "badge-danger",
  no_show: "badge-warning",
};

export interface ConsultationHeaderDisplay {
  statusKey: string;
  statusStyle: string;
  statusLabel: string | null;
  typeLabel: string | null;
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/consultation/components/follow-up-helpers.ts` (47 lines total)


### `parseFollowUpList` — only used in tests

**Line 22**

```ts
  }),
});

type FollowUp = z.infer<typeof followUpSchema>;

export function parseFollowUpList(data: unknown): FollowUp[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.flatMap((item) => {
    const parsed = followUpSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function isExpectedAccessFailure(err: unknown): boolean {
  if (!(err instanceof APIRequestError)) return false;
  const status = err.status;
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


### `isExpectedAccessFailure` — only used in tests

**Line 32**

```ts
    const parsed = followUpSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function isExpectedAccessFailure(err: unknown): boolean {
  if (!(err instanceof APIRequestError)) return false;
  const status = err.status;
  return status === 401 || status === 403 || status === 404;
}

export function logPayloadFromError(err: unknown): Record<string, unknown> {
  if (err instanceof APIRequestError) {
    return {
      status: err.status,
      code: err.code,
    };
  }
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/consultation/lib/opd-queue-display.ts` (24 lines total)


### `truncateOpdSummary` — only used in tests

**Line 7**

```ts
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatChiefComplaintSummary } from "@workspace/utils";

const MAX_SUMMARY_LEN = 120;

export function truncateOpdSummary(
  text: string,
  maxLen = MAX_SUMMARY_LEN,
): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/** One-line context for OPD queue rows: chief complaint, then visit type, then token type. */
export function getOpdQueueSummaryLine(item: QueueItem): string {
  const complaint = formatChiefComplaintSummary(item.appointment?.chiefComplaint);
  if (complaint) return truncateOpdSummary(complaint);
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/features/consultation/rules/consultation-rules.ts` (85 lines total)


### `getVitalRanges` — only used in tests

**Line 4**

```ts
import type { VitalSign } from "@workspace/types";
import { isVitalRangeKey } from "@/features/consultation/lib/consultation-vital-keys";

export const getVitalRanges = (age: number) => {
  if (age < 1) {
    return {
      heartRate: { min: 120, max: 160 },
      respiratoryRate: { min: 30, max: 60 },
      systolicBP: { min: 65, max: 85 },
      diastolicBP: { min: 45, max: 55 },
    };
  } else if (age < 12) {
    return {
      heartRate: { min: 70, max: 120 },
      respiratoryRate: { min: 20, max: 30 },
      systolicBP: { min: 90, max: 110 },
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `isVitalNormal` — only used in tests

**Line 29**

```ts
      diastolicBP: { min: 60, max: 80 },
    };
  }
};

export const isVitalNormal = (
  vital: string,
  value: number,
  age: number,
): boolean => {
  const ranges = getVitalRanges(age);
  const range = isVitalRangeKey(vital) ? ranges[vital] : undefined;
  if (!range) return true;
  return value >= range.min && value <= range.max;
};

export const requiresUrgentAttention = (vitals: VitalSign): boolean => {
  const bp = vitals.bloodPressure?.split("/");
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `requiresUrgentAttention` — only used in tests

**Line 40**

```ts
  const range = isVitalRangeKey(vital) ? ranges[vital] : undefined;
  if (!range) return true;
  return value >= range.min && value <= range.max;
};

export const requiresUrgentAttention = (vitals: VitalSign): boolean => {
  const bp = vitals.bloodPressure?.split("/");
  const systolic = bp?.[0] ? parseInt(bp[0]) : 0;
  const diastolic = bp?.[1] ? parseInt(bp[1]) : 0;

  return (
    systolic > 180 ||
    diastolic > 120 ||
    (vitals.spo2 !== undefined && vitals.spo2 < 90) ||
    (vitals.temperature !== undefined && vitals.temperature > 103)
  );
};

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/consultation/rules/consultationTabRouting.ts` (130 lines total)


### `legacyTabToSectionId` — only used in tests

**Line 47**

```ts
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
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `getConsultationTabIds` — only used in tests

**Line 72**

```ts
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

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `normalizeConsultationTab` — only used in tests

**Line 85**

```ts
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
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/consultation/state/consultation-draft.types.ts` (117 lines total)


### `SaveState` — no usage anywhere

**Line 16**

```ts
  GynecologyExamData,
  OphthalmologyExamData,
  PsychiatryExamData,
} from "@workspace/types";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface ConsultationDraftState {
  appointmentId: string | null;
  chiefComplaint: ChiefComplaintItem[];
  history: string;
  examination: ExaminationData;
  diagnosis: DiagnosisItem[];
  treatment: string;
  prescriptions: Medication[];
  dentalChart: DentalChartValue;
  eyeExam: OphthalmologyExamData;
  growthData: GrowthChartData;
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


### `ConsultationDraftActions` — no usage anywhere

**Line 42**

```ts
  lastSavedAt: number | null;
  lastError: string | null;
  diagnosesContentHash: string | null;
}

export interface ConsultationDraftActions {
  hydrate: (
    appointmentId: string,
    seed: Partial<Omit<ConsultationDraftState, "appointmentId">>,
  ) => void;
  setChiefComplaint: (
    updater:
      | ChiefComplaintItem[]
      | ((prev: ChiefComplaintItem[]) => ChiefComplaintItem[]),
  ) => void;
  setHistory: (updater: string | ((prev: string) => string)) => void;
  setExamination: (
    updater: ExaminationData | ((prev: ExaminationData) => ExaminationData),
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/features/consultation/workspace/consultation-section-registry.ts` (245 lines total)


### `ConsultationPersistKey` — no usage anywhere

**Line 18**

```ts
  Eye,
} from "lucide-react";
import type { ClinicTypeFeatures } from "@workspace/types";
import { resolveClinicTypeFeatures } from "@/features/consultation/lib/resolve-clinic-type-features";

export type ConsultationPersistKey =
  | "dentalChart"
  | "ophthalmologyExam"
  | "growthData"
  | "cardiologyExam"
  | "dermatologyExam"
  | "gynecologyExam"
  | "psychiatryExam"
  | "investigations";

export type ConsultationWorkspaceSectionId =
  | "subjective"
  | "objective"
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/features/dashboard/components/layout/dashboard-ui.tsx` (184 lines total)


### `DashboardUI` — only used in tests

**Line 51**

```ts
  onRetry?: () => void;
  canAccess: (feature: Feature) => boolean;
  headerActions?: ReactNode;
}

export function DashboardUI({
  stats,
  recentActivity,
  upcomingAppointments,
  recentPatients,
  todayAppointments,
  completedToday,
  inProgressToday,
  currentPatient,
  nextPatients,
  waitingCount,
  pendingJoinRequests,
  slotDurationMinutes = DEFAULT_SLOT_DURATION,
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/dashboard/components/patients/recent-patients-ui.tsx` (83 lines total)


### `RecentPatient` — only used in tests

**Line 9**

```ts
import { formatDistanceToNow, getPatientFullName } from "@workspace/utils";
import { Avatar, AvatarFallback, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@workspace/ui/components";
import { ViewAllLinkUI } from "@/features/dashboard/components/layout/view-all-link-ui";
import { getInitials } from "@/lib/formatters";

export interface RecentPatient {
  id: string;
  firstName: string;
  lastName: string;
  updatedAt?: string | Date;
  phoneNumber?: string;
}

interface RecentPatientsUIProps {
  patients: RecentPatient[];
}
export function RecentPatientsUI({ patients }: RecentPatientsUIProps) {
  const { t } = useTranslation("Dashboard");
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/dashboard/lib/upcoming-beyond-today.ts` (17 lines total)


### `startOfTomorrow` — only used in tests

**Line 3**

```ts
import type { DashboardStats } from "@workspace/types";

export function startOfTomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Upcoming API rows are same-day onward; keep only after local tomorrow 00:00 to avoid duplicating today's schedule. */
export function filterUpcomingBeyondToday(
  upcoming: DashboardStats["upcomingAppointments"],
): DashboardStats["upcomingAppointments"] {
  const cutoff = startOfTomorrow();
  return upcoming.filter((a) => new Date(a.startTime) >= cutoff);
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/daybook/lib/daybook-aggregate.ts` (129 lines total)


### `DaybookMethodTotal` — no usage anywhere

**Line 4**

```ts
import type { InvoiceListRow } from "@workspace/types";
import { formatInvoicePaymentMethodLabel } from "@/features/invoices";

export interface DaybookMethodTotal {
  /** Raw payment-method key (e.g. "cash"); "unknown" when not recorded. */
  method: string;
  label: string;
  count: number;
  total: number;
}

export interface DaybookLedgerRow {
  id: string;
  invoiceNumber: string | null;
  patientName: string;
  amount: number;
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


### `DaybookLedgerRow` — no usage anywhere

**Line 12**

```ts
  label: string;
  count: number;
  total: number;
}

export interface DaybookLedgerRow {
  id: string;
  invoiceNumber: string | null;
  patientName: string;
  amount: number;
  methodLabel: string | null;
  status: string;
  at: string | Date | undefined;
}

export interface DaybookSummary {
  /** Settled today (status PAID). */
  collected: number;
```

> **Action:** delete. Likely a type/object that was meant to be re-exported but never got a downstream consumer.


## `apps/app/src/features/documents/rules/document-rules.ts` (83 lines total)


### `isValidFileExtension` — only used in tests

**Line 18**

```ts
  | "insurance"
  | "consent_form"
  | "referral"
  | "other";

export function isValidFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function detectDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();

  if (
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `isValidFileSize` — only used in tests

**Line 23**

```ts
export function isValidFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function detectDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();

  if (
    lower.includes("lab") ||
    lower.includes("report") ||
    lower.includes("result")
  ) {
    return "lab_report";
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `detectDocumentType` — only used in tests

**Line 27**

```ts

export function isValidFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export function detectDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();

  if (
    lower.includes("lab") ||
    lower.includes("report") ||
    lower.includes("result")
  ) {
    return "lab_report";
  }
  if (lower.includes("prescription") || lower.includes("rx")) {
    return "prescription";
  }
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `formatFileSize` — only used in tests

**Line 68**

```ts
  }

  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(
  mimeType: string,
): "image" | "pdf" | "document" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "document";
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `getFileIcon` — only used in tests

**Line 74**

```ts
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(
  mimeType: string,
): "image" | "pdf" | "document" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "document";
  return "file";
}

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/invoices/rules/invoice-rules.ts` (40 lines total)


### `isInvoiceOverdue` — only used in tests

**Line 8**

```ts
  calculateInvoiceTotals,
  calculateTax,
  calculateTotal,
} from "@workspace/utils";

export const isInvoiceOverdue = (invoice: {
  status: string;
  dueDate?: string | Date;
}): boolean => {
  if (invoice.status === "PAID") return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
};

export const canEditInvoice = (invoice: { status: string }): boolean => {
  return invoice.status !== "PAID" && invoice.status !== "CANCELLED";
};

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `canEditInvoice` — only used in tests

**Line 17**

```ts
  if (invoice.status === "PAID") return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate) < new Date();
};

export const canEditInvoice = (invoice: { status: string }): boolean => {
  return invoice.status !== "PAID" && invoice.status !== "CANCELLED";
};

const DEFAULT_INVOICE_ITEM = {
  description: "",
  quantity: 1,
  price: 0,
  taxTreatment: "EXEMPT_HEALTHCARE" as const,
  taxRate: 0,
};

export function createDefaultInvoiceItems() {
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `validateInvoiceItems` — only used in tests

**Line 33**

```ts

export function createDefaultInvoiceItems() {
  return [{ ...DEFAULT_INVOICE_ITEM }];
}

export const validateInvoiceItems = (
  items: { description?: string; quantity: number; unitPrice: number }[],
): boolean => {
  return items.every(
    (item) => item.description && item.quantity > 0 && item.unitPrice >= 0,
  );
};

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/ipd/components/beds/bed-management-ui.tsx` (200 lines total)


### `BedManagementUI` — no usage anywhere

**Line 38**

```ts
  isAdmitting: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function BedManagementUI({
  wards,
  isLoading,
  isError,
  onRetry,
  stats,
  showAdmissionModal,
  setShowAdmissionModal,
  onAdmitPatient,
  isAdmitting,
  searchQuery,
  setSearchQuery,
}: BedManagementUIProps) {
```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


## `apps/app/src/features/ipd/components/dashboard/dashboard-view.tsx` (133 lines total)


### `IpdDashboard` — no usage anywhere

**Line 24**

```ts
export interface IpdDashboardProps {
  wards?: Ward[];
  beds?: Bed[];
}

export const IpdDashboard: FC<IpdDashboardProps> = ({
  wards = [],
  beds = [],
}) => {
  const { t } = useTranslation("Ipd");
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const dischargesCount = 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


### `IpdDashboardProps` — no usage anywhere

**Line 19**

```ts
  bedNumber: string;
  status: string;
  wardId: string;
}

export interface IpdDashboardProps {
  wards?: Ward[];
  beds?: Bed[];
}

export const IpdDashboard: FC<IpdDashboardProps> = ({
  wards = [],
  beds = [],
}) => {
  const { t } = useTranslation("Ipd");
  const occupiedCount = beds.filter((b) => b.status === "occupied").length;
  const dischargesCount = 0;

```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


## `apps/app/src/features/ipd/components/forms/admission-form.tsx` (237 lines total)


### `AdmissionForm` — no usage anywhere

**Line 105**

```ts
    { value: "bed-2", label: t("optionBed102") },
    { value: "bed-3", label: t("optionBed103") },
  ];
}

export const AdmissionForm: FC<AdmissionFormProps> = ({
  defaultValues,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation("Ipd.admissionForm");
  const form = useForm<IpdAdmissionFormValues>({
    resolver: zodResolver(ipdAdmissionFormSchema),
    defaultValues: {
      patientId: defaultValues?.patientId ?? "",
      wardId: defaultValues?.wardId ?? "",
      bedId: defaultValues?.bedId ?? "",
      attendingDoctorId: defaultValues?.attendingDoctorId ?? "",
```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


### `AdmissionFormData` — no usage anywhere

**Line 33**

```ts
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";export type AdmissionFormData = IpdAdmissionFormValues;
export interface AdmissionFormProps {
  defaultValues?: Partial<IpdAdmissionFormValues>;
  onSubmit?: (data: IpdAdmissionFormValues) => void;
  isSubmitting?: boolean;
}


interface AdmissionSelectFieldOption {
  value: string;
  label: string;
}

```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


### `AdmissionFormProps` — no usage anywhere

**Line 34**

```ts
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";export type AdmissionFormData = IpdAdmissionFormValues;
export interface AdmissionFormProps {
  defaultValues?: Partial<IpdAdmissionFormValues>;
  onSubmit?: (data: IpdAdmissionFormValues) => void;
  isSubmitting?: boolean;
}


interface AdmissionSelectFieldOption {
  value: string;
  label: string;
}

interface AdmissionSelectFieldProps {
```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


## `apps/app/src/features/ipd/hooks/use-ipd-logic.ts` (105 lines total)


### `useIpdLogic` — no usage anywhere

**Line 21**

```ts
  type WardWithRooms,
} from "../lib/ipd-stats-helpers";

export type { WardWithRooms } from "../lib/ipd-stats-helpers";

export const useIpdLogic = () => {
  const ipdOk = useTierFeatureEnabled(Feature.FULL_EHR);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);

  const {
    data: wards,
    isLoading,
    isError,
    refetch: refetchWards,
  } = useQuery<WardWithRooms[]>({
```

> **Action:** delete the file (or the whole IPD feature if no other file uses it).


## `apps/app/src/features/ipd/lib/ipd-stats-helpers.ts` (77 lines total)


### `countBedsByStatus` — only used in tests

**Line 7**

```ts

export interface WardWithRooms extends Ward {
  rooms: (Room & { beds: Bed[] })[];
}

export function countBedsByStatus(
  wards: WardWithRooms[] | undefined,
  status: string,
): number {
  if (!wards) return 0;

  const normalized = status.toUpperCase();
  return wards.reduce((acc, ward) => {
    const wardCount =
      ward.rooms?.reduce((roomAcc, room) => {
        const beds = Array.isArray(room.beds) ? room.beds : [];
        return (
          roomAcc +
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


### `countTotalBeds` — only used in tests

**Line 29**

```ts

    return acc + wardCount;
  }, 0);
}

export function countTotalBeds(wards: WardWithRooms[] | undefined): number {
  if (!wards) return 0;

  return wards.reduce((acc, ward) => {
    const wardCount =
      ward.rooms?.reduce((roomAcc, room) => {
        const beds = Array.isArray(room.beds) ? room.beds : [];
        return roomAcc + beds.length;
      }, 0) ?? 0;

    return acc + wardCount;
  }, 0);
}
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/features/ipd/rules/ipd-rules.ts` (60 lines total)


### `canAdmitPatient` — only used in tests

**Line 31**

```ts
  attendingDoctorId: string;
  diagnosis?: string;
  notes?: string;
}

export function canAdmitPatient(bed: Bed): boolean {
  return bed.status === "available";
}

export function canDischargePatient(admission: Admission): boolean {
  return admission.status === "admitted";
}

export function calculateLengthOfStay(
  admissionDate: Date,
  dischargeDate?: Date,
): number {
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `canDischargePatient` — only used in tests

**Line 35**

```ts

export function canAdmitPatient(bed: Bed): boolean {
  return bed.status === "available";
}

export function canDischargePatient(admission: Admission): boolean {
  return admission.status === "admitted";
}

export function calculateLengthOfStay(
  admissionDate: Date,
  dischargeDate?: Date,
): number {
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  const start = new Date(admissionDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `calculateLengthOfStay` — only used in tests

**Line 39**

```ts

export function canDischargePatient(admission: Admission): boolean {
  return admission.status === "admitted";
}

export function calculateLengthOfStay(
  admissionDate: Date,
  dischargeDate?: Date,
): number {
  const end = dischargeDate ? new Date(dischargeDate) : new Date();
  const start = new Date(admissionDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getBedOccupancyRate(beds: Bed[]): number {
  if (beds.length === 0) return 0;
  const occupied = beds.filter((b) => b.status === "occupied").length;
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `getBedOccupancyRate` — only used in tests

**Line 49**

```ts
  const start = new Date(admissionDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getBedOccupancyRate(beds: Bed[]): number {
  if (beds.length === 0) return 0;
  const occupied = beds.filter((b) => b.status === "occupied").length;
  return Math.round((occupied / beds.length) * 100);
}

export function getAvailableBeds(beds: Bed[], wardId?: string): Bed[] {
  return beds.filter(
    (b) => b.status === "available" && (!wardId || b.wardId === wardId),
  );
}

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `getAvailableBeds` — only used in tests

**Line 55**

```ts
  if (beds.length === 0) return 0;
  const occupied = beds.filter((b) => b.status === "occupied").length;
  return Math.round((occupied / beds.length) * 100);
}

export function getAvailableBeds(beds: Bed[], wardId?: string): Bed[] {
  return beds.filter(
    (b) => b.status === "available" && (!wardId || b.wardId === wardId),
  );
}

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/lab-tests/components/settings/lab-directory-settings.tsx` (177 lines total)


### `LabDirectorySettings` — no usage anywhere

**Line 142**

```ts
  );
}

/* ─── Main component ────────────────────────────────────────── */

export function LabDirectorySettings() {
  const hook = useLabDirectory();
  const { t } = useTranslation("LabTests");

  const columns: DataTableColumn<LabContractResponse>[] = [
    { id: "name", header: t("directory.colLab"), cell: (lab) => <LabNameCell lab={lab} /> },
    { id: "contact", header: t("directory.colContact"), hiddenOnMobile: true, cell: (lab) => (
      <span className="text-sm text-muted-foreground">{lab.phone || lab.email || "—"}</span>
    ) },
    { id: "status", header: t("directory.colStatus"), cell: (lab) => <StatusBadge status={lab.active ? "active" : "inactive"} /> },
    { id: "actions", header: t("directory.colActions"), align: "right", cell: (lab) => (
      <LabActionsCell lab={lab} toggleActive={hook.toggleActive} openEdit={hook.openEdit} />
    ) },
```

> **Action:** delete or wire into the lab-tests settings route.


## `apps/app/src/features/lab-tests/components/settings/lab-tests-catalog-settings.tsx` (311 lines total)


### `LabTestsCatalogSettings` — no usage anywhere

**Line 200**

```ts
  );
}

/* ─── Main component ─────────────────────────────────────────── */

export function LabTestsCatalogSettings() {
  const { t } = useTranslation("LabTests");
  const hook = useLabTestCatalogSettings();
  const { currency } = useLocaleCurrency();
  const formatCurrency = (amount: number, options?: { fractionDigits?: number }) =>
    formatCurrencyUtil(amount, currency, options ?? {});

  const columns: DataTableColumn<LabTest>[] = [
    {
      id: "name",
      header: t("catalogSettings.nameColumn"),
      cell: (test) => <span className="font-medium">{test.name}</span>,
    },
```

> **Action:** delete or wire into the lab-tests settings route.


## `apps/app/src/features/lab-tests/rules/lab-test-rules.ts` (58 lines total)


### `getTestResultStatus` — only used in tests

**Line 10**

```ts
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
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `formatLabValue` — only used in tests

**Line 26**

```ts
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
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `hasAbnormalResults` — only used in tests

**Line 48**

```ts
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


```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `hasCriticalResults` — only used in tests

**Line 54**

```ts
  return results.some(
    (r) => r.status === "high" || r.status === "low" || r.status === "critical",
  );
}

export function hasCriticalResults(results: LabTestResult[]): boolean {
  return results.some((r) => r.status === "critical");
}


```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `LabTestResult` — only used in tests

**Line 1**

```ts
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
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/legal/components/ConsentNoticeModal.tsx` (109 lines total)


### `ConsentNoticeModal` — no usage anywhere

**Line 28**

```ts
  onOpenChange: (open: boolean) => void;
  onConsent: (consents: Record<string, boolean>) => void;
  onDecline?: () => void;
}

export function ConsentNoticeModal({
  open,
  onOpenChange,
  onConsent,
  onDecline,
}: ConsentNoticeModalProps) {
  const [language, setLanguage] = useState("en");
  const [consents, setConsents] = useState<Record<string, boolean>>({
    medical_records: false,
    data_storage: false,
    data_sharing: false,
    whatsapp_communication: false,
  });
```

> **Action:** delete. The onboarding flow uses `compliance-legal-document-dialog.tsx`; this is leftover from an earlier design.


### `ConsentNoticeModalProps` — no usage anywhere

**Line 21**

```ts
  ConsentPurposeList,
  ConsentRightsList,
  DataProtectionContact,
} from "./ConsentNoticeModalSections";

export interface ConsentNoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (consents: Record<string, boolean>) => void;
  onDecline?: () => void;
}

export function ConsentNoticeModal({
  open,
  onOpenChange,
  onConsent,
  onDecline,
}: ConsentNoticeModalProps) {
```

> **Action:** delete. The onboarding flow uses `compliance-legal-document-dialog.tsx`; this is leftover from an earlier design.


## `apps/app/src/features/legal/components/ConsentNoticeModalSections.tsx` (90 lines total)


### `SUPPORTED_LANGUAGES` — no usage anywhere

**Line 4**

```ts
import { Globe, Mail } from "lucide-react";
import { Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
] as const;

```

> **Action:** delete. The onboarding flow uses `compliance-legal-document-dialog.tsx`; this is leftover from an earlier design.


## `apps/app/src/features/legal/components/consent-content.ts` (57 lines total)


### `ConsentContent` — no usage anywhere

**Line 3**

```ts
import { SUPPORT_EMAIL } from "@/lib/constants/support-contact";

export interface ConsentContent {
  title: string;
  description: string;
  purposes: { key: string; label: string; description: string }[];
  rights: string[];
  dpoContact: string;
  agreeButton: string;
  declineButton: string;
}

export const CONSENT_CONTENT: Record<string, ConsentContent> = {
  en: {
    title: "Data Privacy & Consent Notice",
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/features/medical-coding/rules/coding-rules.ts` (56 lines total)


### `isValidICD10Code` — only used in tests

**Line 1**

```ts
export function isValidICD10Code(code: string): boolean {
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/i;
  return icd10Pattern.test(code);
}

export function isValidCPTCode(code: string): boolean {
  const cptPattern = /^\d{5}(-\d{2})?$/;
  return cptPattern.test(code);
}

export function getICD10Category(code: string): string {
  const firstChar = code.charAt(0).toUpperCase();
  const categories: Record<string, string> = {
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `isValidCPTCode` — only used in tests

**Line 6**

```ts
export function isValidICD10Code(code: string): boolean {
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/i;
  return icd10Pattern.test(code);
}

export function isValidCPTCode(code: string): boolean {
  const cptPattern = /^\d{5}(-\d{2})?$/;
  return cptPattern.test(code);
}

export function getICD10Category(code: string): string {
  const firstChar = code.charAt(0).toUpperCase();
  const categories: Record<string, string> = {
    A: "Infectious Diseases",
    B: "Infectious Diseases",
    C: "Neoplasms",
    D: "Blood/Immune Disorders",
    E: "Endocrine/Metabolic",
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `getICD10Category` — only used in tests

**Line 11**

```ts
export function isValidCPTCode(code: string): boolean {
  const cptPattern = /^\d{5}(-\d{2})?$/;
  return cptPattern.test(code);
}

export function getICD10Category(code: string): string {
  const firstChar = code.charAt(0).toUpperCase();
  const categories: Record<string, string> = {
    A: "Infectious Diseases",
    B: "Infectious Diseases",
    C: "Neoplasms",
    D: "Blood/Immune Disorders",
    E: "Endocrine/Metabolic",
    F: "Mental/Behavioral",
    G: "Nervous System",
    H: "Eye/Ear",
    I: "Circulatory System",
    J: "Respiratory System",
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `formatDiagnosisCode` — only used in tests

**Line 43**

```ts
    Z: "Health Status/Services",
  };
  return categories[firstChar] || "Other";
}

export function formatDiagnosisCode(code: string): string {
  if (code.length > 3 && !code.includes(".")) {
    return `${code.slice(0, 3)}.${code.slice(3)}`;
  }
  return code.toUpperCase();
}

export function requiresMoreSpecificity(code: string): boolean {
  const parts = code.split(".");
  if (parts.length === 1) return true;
  return (parts[1]?.length ?? 0) < 2;
}

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `requiresMoreSpecificity` — only used in tests

**Line 50**

```ts
    return `${code.slice(0, 3)}.${code.slice(3)}`;
  }
  return code.toUpperCase();
}

export function requiresMoreSpecificity(code: string): boolean {
  const parts = code.split(".");
  if (parts.length === 1) return true;
  return (parts[1]?.length ?? 0) < 2;
}


```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/patient-portal/components/views/portal-metrics-helpers.ts` (87 lines total)


### `PortalMetricDefinition` — no usage anywhere

**Line 15**

```ts
    valueString?: string | null;
    valueBoolean?: boolean | null;
  }>;
};

export type PortalMetricDefinition = {
  id: string;
  key: string;
  label: string;
  unit?: string | null;
  valueType: string;
  isTracked: boolean;
};

export type PortalMetricCategory = {
  id: string;
  name: string;
  metricDefinitions: PortalMetricDefinition[];
```

> **Action:** delete the file (or investigate if patient-portal is a separate app entry point).


## `apps/app/src/features/patient-portal/hooks/use-patient-portal-data.ts` (54 lines total)


### `usePatientPortalData` — no usage anywhere

**Line 15**

```ts

import type { PatientPortalSnapshot } from "@/features/patient-portal/types/patient-portal-types";
import { summarizePortalSnapshot } from "@/features/patient-portal/rules/patient-portal-rules";
import { buildPatientPortalSnapshot } from "@/features/patient-portal/lib/patient-portal-snapshot";

export function usePatientPortalData(patientId?: string | null) {
  const hasPatientId = Boolean(patientId);

  const { data: patient } = usePatient(patientId || "");
  const {
    data: appointmentsResponse,
    isLoading: isAppointmentsLoading,
    error: appointmentsError,
  } = usePatientAppointments(patientId || "");

  const snapshot = useMemo<PatientPortalSnapshot>(() => {
    return buildPatientPortalSnapshot(
      appointmentsResponse?.items,
```

> **Action:** delete the file (or investigate if patient-portal is a separate app entry point).


## `apps/app/src/features/patients/rules/patient-rules.ts` (82 lines total)


### `isPatientMinor` — only used in tests

**Line 10**

```ts

type PatientDateLike = {
  dateOfBirth?: string | Date | null;
};

export const isPatientMinor = (patient: Patient): boolean => {
  if (!patient.dateOfBirth) return false;

  const age = calculateAge(patient.dateOfBirth);
  return age !== null && age < 18;
};

export const canEditPatient = (user: User): boolean => {
  return hasPermission(user.role, "editPatient");
};

const getPatientAge = (patient: PatientDateLike): number | null => {
  if (!patient.dateOfBirth) return null;
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `validatePatientData` — only used in tests

**Line 50**

```ts
  clinicCountryCode?: string | null,
): string | null => {
  return validatePhoneForCountry(phoneNumber, clinicCountryCode);
};

export const validatePatientData = (
  data: Partial<Patient>,
  clinicCountryCode?: string | null,
): string[] => {
  const errors: string[] = [];

  if (!data.firstName?.trim()) {
    errors.push("Enter the patient's first name");
  }

  if (!data.lastName?.trim()) {
    errors.push("Enter the patient's last name");
  }
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/patients/rules/vitals-rules.ts` (70 lines total)


### `isBloodPressureNormal` — only used in tests

**Line 51**

```ts
    overweight: { label: "Overweight", color: "text-warning" },
    obese: { label: "Obese", color: "text-destructive" },
  }[status];
};

export const isBloodPressureNormal = (bp: string): boolean => {
  const match = bp.match(/(\d+)\/(\d+)/);
  if (!match) return false;

  const systolic = parseInt(match[1] || "0", 10);
  const diastolic = parseInt(match[2] || "0", 10);

  return (
    systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80
  );
};

export const isPulseNormal = (pulse: number): boolean => {
```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `isPulseNormal` — only used in tests

**Line 63**

```ts
  return (
    systolic >= 90 && systolic <= 120 && diastolic >= 60 && diastolic <= 80
  );
};

export const isPulseNormal = (pulse: number): boolean => {
  return pulse >= 60 && pulse <= 100;
};

export const isTemperatureNormal = (tempF: number): boolean => {
  return tempF >= 97.8 && tempF <= 99.1;
};

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


### `isTemperatureNormal` — only used in tests

**Line 67**

```ts

export const isPulseNormal = (pulse: number): boolean => {
  return pulse >= 60 && pulse <= 100;
};

export const isTemperatureNormal = (tempF: number): boolean => {
  return tempF >= 97.8 && tempF <= 99.1;
};

```

> **Action:** delete the export and the corresponding test cases. If the rule was meant to be enforced, port it inline or to a shared `@workspace/rules` package.


## `apps/app/src/features/settings/components/doctor-profile/registration-certificate-upload.helpers.ts` (39 lines total)


### `ALLOWED_REGISTRATION_CERTIFICATE_MIMES` — only used in tests

**Line 7**

```ts
/**
 * Pure validation for the doctor registration certificate upload. Lives outside
 * the React component so it's directly testable without jsdom and so the
 * allowed-MIME / max-size policy is shared with any future bulk-uploader.
 */
export const ALLOWED_REGISTRATION_CERTIFICATE_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

export const MAX_REGISTRATION_CERTIFICATE_BYTES = 5 * 1024 * 1024;

type CertificateValidationError =
  | { code: "mime_not_allowed"; message: string }
  | { code: "file_too_large"; message: string };

```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


### `MAX_REGISTRATION_CERTIFICATE_BYTES` — only used in tests

**Line 14**

```ts
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

export const MAX_REGISTRATION_CERTIFICATE_BYTES = 5 * 1024 * 1024;

type CertificateValidationError =
  | { code: "mime_not_allowed"; message: string }
  | { code: "file_too_large"; message: string };

export function validateRegistrationCertificate(
  file: Pick<File, "type" | "size">,
): CertificateValidationError | null {
  if (!ALLOWED_REGISTRATION_CERTIFICATE_MIMES.includes(
    file.type as (typeof ALLOWED_REGISTRATION_CERTIFICATE_MIMES)[number],
  )) {
    return {
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/features/settings/components/management/doctor-availability-config.ts` (73 lines total)


### `DAYS_OF_WEEK` — no usage anywhere

**Line 3**

```ts
import { DEFAULT_SLOT_DURATION } from "@workspace/utils";

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface DaySchedule {
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/features/setup/components/onboarding/types.ts` (109 lines total)


### `PaymentDetails` — no usage anywhere

**Line 25**

```ts
  enableWhatsApp: false,
  requireConsent: true,
  slaSignatureSessionId: "",
};

export interface PaymentDetails {
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  cardNumber?: string;
  cardLast4?: string;
  autoPay?: boolean;
  skipPayment?: boolean;
}

export interface TeamMember {
  email: string;
  role: "DOCTOR" | "NURSE" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


### `PlanSelection` — no usage anywhere

**Line 46**

```ts
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

export interface PlanSelection {
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  isCoreTrial?: boolean;
  /** Full / Front Desk / Core plan mode chosen on the plan step. */
  planMode?: PlanMode;
}

/** One row per weekday for default clinic visit windows (matches onboarding API). */
export interface ClinicWeeklyHourRow {
  dayOfWeek: DayOfWeek;
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/features/upload-signature/lib/signature-upload.ts` (25 lines total)


### `MAX_SIGNATURE_UPLOAD_BYTES` — only used in tests

**Line 1**

```ts
export const MAX_SIGNATURE_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateSignatureImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file";
  }

  if (file.size > MAX_SIGNATURE_UPLOAD_BYTES) return "Use a file smaller than 5 MB";

  return null;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/i18n/locale-utils.ts` (36 lines total)


### `LOCALES` — no usage anywhere

**Line 9**

```ts
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LOCALE_STORAGE_KEY = "docita_locale";

export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.some((locale) => locale === value);
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/lib/api/api-client-core.ts` (121 lines total)


### `api` — no usage anywhere

**Line 62**

```ts

export function withAppClient<T>(run: (client: APIClient) => Promise<T>): Promise<T> {
  return run(getAppApiClient());
}

export const api: AppApiClient = {
  get: (endpoint, options) =>
    withAppClient((client) => client.get(endpoint, options)),
  post: (endpoint, body, options) =>
    withAppClient((client) => client.post(endpoint, body, options)),
  put: (endpoint, body, options) =>
    withAppClient((client) => client.put(endpoint, body, options)),
  patch: (endpoint, body, options) =>
    withAppClient((client) => client.patch(endpoint, body, options)),
  delete: (endpoint, options) =>
    withAppClient((client) => client.delete(endpoint, options)),
  validate: (endpoint, schema, options) =>
    withAppClient((client) => client.validate(endpoint, schema, options)),
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/lib/auth/e2e-session-token.ts` (20 lines total)


### `E2E_ACCESS_TOKEN_SESSION_KEY` — only used in tests

**Line 2**

```ts
/** Playwright sets this in sessionStorage via addInitScript before navigation. */
export const E2E_ACCESS_TOKEN_SESSION_KEY = "__docita_e2e_access_token";

/**
 * Consume a one-shot E2E access token injected by Playwright. Production users
 * never set this key; the helper is a no-op outside E2E runs.
 */
export function consumeE2EAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const token = sessionStorage.getItem(E2E_ACCESS_TOKEN_SESSION_KEY);
    if (!token) return null;
    sessionStorage.removeItem(E2E_ACCESS_TOKEN_SESSION_KEY);
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/lib/auth/session.ts` (34 lines total)


### `resolveAppLoginPath` — only used in tests

**Line 6**

```ts
import { createBrowserSessionManager } from "@workspace/data-access";
import { getAppApiUrl } from "@/lib/api/api-config";

export const APP_REDIRECT_AFTER_LOGIN_KEY = "redirectAfterLogin";

export const resolveAppLoginPath = (currentPath: string) => {
  if (currentPath.startsWith("/portal")) return "/portal/login";
  if (currentPath.startsWith("/lab-portal")) return "/lab-portal/login";
  return "/login";
};

export const appSession = createBrowserSessionManager({
  apiUrl: "/api/v1",
  resolveApiUrl: getAppApiUrl,
  tokenStorageKey: "docita_token",
  redirectStorageKey: APP_REDIRECT_AFTER_LOGIN_KEY,
  publicPaths: [
    "/login",
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/lib/socket/use-clinic-socket.ts` (29 lines total)


### `useClinicSocket` — no usage anywhere

**Line 12**

```ts
  intelligenceAddon?: string;
  subscriptionStatus?: string;
  subscriptionGraceUntil?: string | null;
}

export function useClinicSocket(
  clinicId: string | null,
  onUpdate: (data: ClinicUpdateData) => void,
) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !clinicId) return;

    socket.emit("subscribe:clinic", clinicId);
    socket.on("clinic:update", onUpdate);

    return () => {
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


### `ClinicUpdateData` — no usage anywhere

**Line 4**

```ts
import { useEffect } from "react";
import { useSocket } from "./socket-context";

export interface ClinicUpdateData {
  clinicId: string;
  tier?: string;
  intelligenceAddon?: string;
  subscriptionStatus?: string;
  subscriptionGraceUntil?: string | null;
}

export function useClinicSocket(
  clinicId: string | null,
  onUpdate: (data: ClinicUpdateData) => void,
) {
  const { socket, isConnected } = useSocket();
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/lib/subscription/tier-access.ts` (33 lines total)


### `PlanLimits` — no usage anywhere

**Line 25**

```ts

export type { FeatureComparisonRow } from "./tier-access-comparison-rows";
export { getFeatureComparisonData } from "./tier-access-comparison-rows";

/** @alias TierLimits */
export type PlanLimits = TierLimits;

export const PLAN_LIMITS = TIER_LIMITS;

/** @alias TierPricing */
export type PlanPricing = TierPricing;



```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


### `PlanPricing` — no usage anywhere

**Line 30**

```ts
export type PlanLimits = TierLimits;

export const PLAN_LIMITS = TIER_LIMITS;

/** @alias TierPricing */
export type PlanPricing = TierPricing;



```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/lib/types/form.ts` (10 lines total)


### `FieldError` — no usage anywhere

**Line 1**

```ts
export interface FieldError {
  message: string;
  code?: string;
}

export interface FormValidationErrors {
  [field: string]: FieldError | string;
}


```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/lib/utils/queue-token-status.ts` (20 lines total)


### `normalizeQueueTokenStatusKey` — only used in tests

**Line 5**

```ts
/**
 * Queue tokens use Prisma enum strings (WAITING, IN_PROGRESS, COMPLETED).
 * Some paths may emit kebab-case; normalize before comparing.
 */
export function normalizeQueueTokenStatusKey(status: string): string {
  return status.trim().toUpperCase().replace(/-/g, "_");
}

export function isQueueTokenWaiting(status: string): boolean {
  return normalizeQueueTokenStatusKey(status) === "WAITING";
}

export function isQueueTokenInProgress(status: string): boolean {
  return normalizeQueueTokenStatusKey(status) === "IN_PROGRESS";
}

export function isQueueTokenCompleted(status: string): boolean {
```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/test-utils/en-message-resolver.ts` (22 lines total)


### `createEnMessageResolver` — only used in tests

**Line 11**

```ts
 * real en.json for pure helper unit tests that receive `t` as a parameter.
 * Mirrors how the audit resolves `t("section.key")` against the caller's
 * bound namespace (e.g. `useTranslation("MedicalDocuments")` + `t(...)`).
 * Returns the raw key on miss.
 */
export function createEnMessageResolver(ns: string) {
  return (key: string): string => {
    let node: unknown = enMessages;
    for (const part of [ns, ...key.split(".")]) {
      if (!isMessageTree(node)) return key;
      node = node[part];
      if (node === undefined) return key;
    }
    return typeof node === "string" ? node : key;
  };
}

```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/app/src/test-utils/i18n-mock.ts` (89 lines total)


### `createI18nMock` — no usage anywhere

**Line 72**

```ts
 * `=0`/`few`/`many` plural forms, `returnObjects`) is intentionally not
 * implemented — override the mock in-file for specs that need real i18next
 * behavior. Missing keys resolve to the raw key so they stay visible in
 * assertions instead of failing silently.
 */
export function createI18nMock() {
  return {
    useTranslation: (namespace?: string) => {
      const t = (key: string, options?: Record<string, unknown>): string => {
        const value = lookup(namespace, key);
        return options ? applySyntax(value, options) : value;
      };
      return {
        t,
        i18n: { language: "en", changeLanguage: async () => undefined },
      };
    },
    initReactI18next: { type: "3rdParty", init: () => undefined },
```

> **Action:** delete after verifying the symbol isn't exported via a barrel file or used by a worker/API.


## `apps/app/src/test-utils/render-with-tooltip.tsx` (20 lines total)


### `renderWithTooltip` — only used in tests

**Line 9**

```ts

/**
 * Render with just TooltipProvider — for tests that need tooltip context
 * but don't need the MemoryRouter from the default test-utils render.
 */
export function renderWithTooltip(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider>{children}</TooltipProvider>
    ),
    ...options,
  });
}

```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.


## `apps/internal/src/lib/api/api-config.ts` (45 lines total)


### `resolveInternalApiUrl` — only used in tests

**Line 16**

```ts
 *
 * Cloudflare production must use the same-origin `/api/v1` proxy so auth
 * cookies (set on internal.docita.work) ride on every fetch. Pointing the
 * client at https://api.docita.work breaks refresh and protected routes.
 */
export const resolveInternalApiUrl = resolveApiUrl;

function resolvePublishedInternalApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (shouldUseSameOriginApiProxy(configured, hostname)) {
      return resolveInternalApiUrl("/api/v1", origin);
    }
  }

```

> **Action:** investigate — the function is tested but never imported in production. Either wire it up or delete it with the test.

---

## Tracker

- **Previous:** [`FRONTEND_DEAD_CODE_2026-08-11.md`](FRONTEND_DEAD_CODE_2026-08-11.md) (condensed)
- **Next:** [`FRONTEND_USEEFFECT_INDEX_2026-08-11.md`](FRONTEND_USEEFFECT_INDEX_2026-08-11.md) (condensed) or [`2026-08-11-backend-final-pass.md`](2026-08-11-backend-final-pass.md) (backend)
- **Related architecture:** [`../ui/UI_UX_STANDARD_2026.md`](../../ui/UI_UX_STANDARD_2026.md)
- **Related runbook:** (none)
- **Fixed in:** (not yet — full inventory)
- **Verified by:** (parent doc verification applies)
- **Open follow-ups:** Delete or wire the dead exports. See [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.14.
