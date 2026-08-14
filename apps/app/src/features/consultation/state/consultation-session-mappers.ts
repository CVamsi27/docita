import { z } from "zod";
import {
  chiefComplaintDraftItemSchema,
  examinationDraftSchema,
  type ChiefComplaintDraftItem,
  type DiagnosisDraftItem,
  type ExaminationDraft,
} from "@workspace/types";
import type { ChiefComplaintItem } from "@/features/consultation/components/structured/chief-complaint.types";
import type { DiagnosisItem } from "@/features/consultation/components/structured/diagnosis-input-types";
import type { ExaminationData } from "@/features/consultation/components/structured/examination-input.types";

const chiefComplaintStructuredSchema = z.array(chiefComplaintDraftItemSchema);

function mapDraftChiefComplaintItem(
  item: ChiefComplaintDraftItem,
): ChiefComplaintItem {
  const duration = item.duration?.trim() ?? "";
  const [durationValue = "1", durationUnit = "days"] = duration.split(/\s+/, 2);
  return {
    id: item.id,
    complaint: item.complaint,
    durationValue: durationValue || "1",
    durationUnit: durationUnit || "days",
    severity:
      item.severity === "mild" ||
      item.severity === "moderate" ||
      item.severity === "severe"
        ? item.severity
        : "moderate",
    notes: item.notes,
  };
}

export function mapSessionChiefComplaints(
  items: ChiefComplaintDraftItem[],
): ChiefComplaintItem[] {
  return items.map(mapDraftChiefComplaintItem);
}

export function mapSessionExamination(exam: ExaminationDraft): ExaminationData {
  const parsed = examinationDraftSchema.parse(exam);
  return {
    general: {
      pallor: parsed.general.pallor === true,
      icterus: parsed.general.icterus === true,
      cyanosis: parsed.general.cyanosis === true,
      clubbing: parsed.general.clubbing === true,
      lymphadenopathy: parsed.general.lymphadenopathy === true,
      edema: parsed.general.edema === true,
      notes: parsed.general.notes,
    },
    systemic: {
      cvs: parsed.systemic.cvs ?? "",
      rs: parsed.systemic.rs ?? "",
      pa: parsed.systemic.pa ?? "",
      cns: parsed.systemic.cns ?? "",
      musculoskeletal: parsed.systemic.musculoskeletal,
      notes: parsed.systemic.notes,
    },
  };
}

function mapDiagnosisStatus(
  status: DiagnosisDraftItem["status"],
): DiagnosisItem["status"] {
  if (status === "ruled-out") return "resolved";
  if (status === "active" || status === "resolved") return status;
  return "active";
}

function mapDiagnosisType(
  type: DiagnosisDraftItem["type"],
): DiagnosisItem["type"] {
  if (type === "working" || type === "differential") return "provisional";
  if (type === "provisional" || type === "final") return type;
  return "provisional";
}

function mapDraftDiagnosisItem(item: DiagnosisDraftItem): DiagnosisItem {
  return {
    id: item.id,
    condition: item.condition,
    type: mapDiagnosisType(item.type),
    status: mapDiagnosisStatus(item.status),
    notes: item.notes,
    icdCode:
      item.icdCodeId && item.icdCode
        ? {
            id: item.icdCodeId,
            code: item.icdCode,
            description: item.icdCode,
          }
        : undefined,
  };
}

export function mapSessionDiagnosis(
  items: DiagnosisDraftItem[],
): DiagnosisItem[] {
  return items.map(mapDraftDiagnosisItem);
}

export function parseStructuredChiefComplaints(
  raw: unknown,
): ChiefComplaintItem[] | undefined {
  const parsed = chiefComplaintStructuredSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return mapSessionChiefComplaints(parsed.data);
}
