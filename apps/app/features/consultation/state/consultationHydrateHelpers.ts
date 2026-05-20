import { parseChiefComplaintsFromAppointmentData } from "@workspace/utils";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/ChiefComplaintInput";
import type { DiagnosisItem } from "@/features/consultation/components/structured/DiagnosisInput";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import { DEFAULT_EXAMINATION } from "./consultationDraftHelpers";

export function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value));
}

function nestedSystemicNotes(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = toRecord(raw);
    if (typeof obj.notes === "string") return obj.notes;
  }
  return "";
}

function ensureString(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = toRecord(val);
    if ("notes" in obj && typeof obj.notes === "string") return obj.notes;
    return JSON.stringify(val);
  }
  if (val === null || val === undefined) return "";
  return String(val);
}

export function parseDiagnosis(raw: unknown): DiagnosisItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as DiagnosisItem[];
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DiagnosisItem[];
    if (typeof parsed === "string" && parsed.trim()) {
      return [
        {
          id: "legacy-dx",
          condition: parsed,
          type: "provisional",
          status: "active",
        },
      ];
    }
  } catch {
    if (raw.trim()) {
      return [
        {
          id: "legacy-dx",
          condition: raw,
          type: "provisional",
          status: "active",
        },
      ];
    }
  }
  return [];
}

function normalizeComplaintList(
  items: ChiefComplaintItem[] | undefined,
): ChiefComplaintItem[] {
  if (!items || items.length === 0) return [];
  return items.map((item) => ({
    ...item,
    durationValue:
      item.complaint?.trim() && (!item.durationValue || !item.durationValue.trim())
        ? "1"
        : item.durationValue,
  }));
}

export function buildChiefComplaintSeed(
  data: Record<string, unknown>,
): ChiefComplaintItem[] {
  const structured = data["chiefComplaintStructured"] as
    | ChiefComplaintItem[]
    | undefined;
  const jsonRows = parseChiefComplaintsFromAppointmentData(data);

  if (structured?.length) {
    return normalizeComplaintList(structured);
  }

  if (jsonRows.length > 0) {
    return normalizeComplaintList(
      jsonRows.map((row) => ({
        id: row.id ?? crypto.randomUUID(),
        complaint: row.complaint ?? "",
        durationValue: row.durationValue?.trim() ? row.durationValue : "1",
        durationUnit: row.durationUnit ?? "days",
        severity: row.severity || "moderate",
        notes: row.notes,
      })),
    );
  }

  const rawComplaint =
    typeof data["chiefComplaint"] === "string"
      ? (data["chiefComplaint"] as string).trim()
      : "";
  return rawComplaint
    ? [
        {
          id: "legacy",
          complaint: rawComplaint,
          durationValue: "1",
          durationUnit: "days",
          severity: "moderate",
        },
      ]
    : [];
}

export function buildExaminationSeed(
  data: Record<string, unknown>,
): ExaminationData {
  const genExam = data["generalExamination"];
  const sysExam = data["systemicExamination"];
  const sysRecord = sysExam ? toRecord(sysExam) : {};
  const mssRaw = sysRecord["mss"];
  let musculoskeletalFromMss = "";
  if (mssRaw && typeof mssRaw === "object") {
    const mss = toRecord(mssRaw);
    musculoskeletalFromMss = [
      typeof mss["jointExamination"] === "string"
        ? (mss["jointExamination"] as string)
        : "",
      typeof mss["notes"] === "string" ? (mss["notes"] as string) : "",
      typeof mss["muscleStrength"] === "string"
        ? (mss["muscleStrength"] as string)
        : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  const genRecord =
    genExam && typeof genExam === "object" ? toRecord(genExam) : {};
  const generalNotesFromApi =
    typeof genRecord["generalNotes"] === "string"
      ? genRecord["generalNotes"]
      : "";
  const generalNotesUi =
    typeof genRecord["notes"] === "string" ? genRecord["notes"] : "";
  const { generalNotes: _generalNotes, notes: _notes, ...generalRest } = genRecord;

  return {
    general: genExam
      ? {
          ...DEFAULT_EXAMINATION.general,
          ...(generalRest as object),
          notes: generalNotesUi || generalNotesFromApi,
        }
      : DEFAULT_EXAMINATION.general,
    systemic: sysExam
      ? {
          cvs: nestedSystemicNotes(sysRecord["cvs"]),
          rs: nestedSystemicNotes(sysRecord["rs"]),
          pa: nestedSystemicNotes(sysRecord["pa"]),
          cns: nestedSystemicNotes(sysRecord["cns"]),
          musculoskeletal:
            musculoskeletalFromMss ||
            (typeof sysRecord["musculoskeletal"] === "string"
              ? sysRecord["musculoskeletal"]
              : ""),
          notes: ensureString(sysRecord["additionalNotes"]),
        }
      : DEFAULT_EXAMINATION.systemic,
  };
}
