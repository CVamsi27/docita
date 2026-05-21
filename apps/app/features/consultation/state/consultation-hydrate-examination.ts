import { examinationDraftSchema } from "@workspace/types";
import type { ExaminationData } from "@/features/consultation/components/structured/ExaminationInput";
import { DEFAULT_EXAMINATION } from "./consultationDraftHelpers";
import { parseZodField, toRecord } from "./consultation-hydrate-utils";

function nestedSystemicNotes(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = toRecord(raw);
    if (typeof obj.notes === "string") return obj.notes;
  }
  return "";
}

function readRecordString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
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
      readRecordString(mss, "jointExamination"),
      readRecordString(mss, "notes"),
      readRecordString(mss, "muscleStrength"),
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
  const parsedGeneral = {
    ...DEFAULT_EXAMINATION.general,
    ...parseZodField(
      examinationDraftSchema.shape.general,
      genExam,
      DEFAULT_EXAMINATION.general,
    ),
  };

  return {
    general: genExam
      ? {
          pallor: parsedGeneral.pallor === true,
          icterus: parsedGeneral.icterus === true,
          cyanosis: parsedGeneral.cyanosis === true,
          clubbing: parsedGeneral.clubbing === true,
          lymphadenopathy: parsedGeneral.lymphadenopathy === true,
          edema: parsedGeneral.edema === true,
          notes:
            generalNotesUi || generalNotesFromApi || parsedGeneral.notes || "",
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
