/** Pure OCR field-mapping helpers — no React hooks. */
import type { ParsedMedicalFields } from "@workspace/types";
import { importInvoiceDraftSchema, type OcrImportCommitRequest } from "@workspace/types";
import { isRecord, parseStringEnumMember } from "@workspace/utils";
import type { OCRFormData, OCRInvoiceForm } from "@/features/ocr/types";

export function emptyOcrInvoiceForm(): OCRInvoiceForm {
  return { saveAsPending: false, grandTotal: "", subtotal: "", taxTotal: "", items: [] };
}

export function parseMoneyInput(raw: string): number {
  const t = raw.replace(/,/g, "").trim();
  if (t.length === 0) return Number.NaN;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function mapOcrFieldsToInvoiceForm(fields: unknown): OCRInvoiceForm {
  const empty = emptyOcrInvoiceForm();
  if (!isRecord(fields)) return empty;
  const invUnknown = fields.invoice;
  if (!isRecord(invUnknown)) return empty;
  const inv = invUnknown;
  const itemsRaw = inv.items;
  const items: OCRInvoiceForm["items"] = [];
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      if (!isRecord(row)) continue;
      const r = row;
      const description = typeof r.description === "string" ? r.description : String(r.description ?? "");
      const quantity = typeof r.quantity === "number" && Number.isFinite(r.quantity) ? String(r.quantity) : String(r.quantity ?? "");
      const unitPrice = typeof r.unitPrice === "number" && Number.isFinite(r.unitPrice) ? String(r.unitPrice) : String(r.unitPrice ?? "");
      const total = typeof r.total === "number" && Number.isFinite(r.total) ? String(r.total) : String(r.total ?? "");
      items.push({ description, quantity, unitPrice, total });
    }
  }
  const numStr = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? String(v) : "";
  let grandTotal = numStr(inv.total);
  if (!grandTotal && items.length > 0) {
    let sum = 0; let any = false;
    for (const it of items) {
      const t = parseMoneyInput(it.total);
      if (Number.isFinite(t)) { sum += t; any = true; }
    }
    if (any) grandTotal = String(sum);
  }
  return { saveAsPending: false, grandTotal, subtotal: numStr(inv.subtotal), taxTotal: numStr(inv.tax), items };
}

export function buildOcrFormData(
  fields: ParsedMedicalFields | undefined,
  resultFirstName: string | undefined,
  resultLastName: string | undefined,
  resultAge: string | undefined,
  resultGender: string | undefined,
  resultDiagnosis: string | undefined,
  resultPhoneNumber: string | undefined,
): OCRFormData {
  const invoiceFromScan = mapOcrFieldsToInvoiceForm(fields);
  return {
    firstName: fields?.firstName || resultFirstName || "",
    lastName: fields?.lastName || resultLastName || "",
    age: fields?.age || resultAge || "",
    gender: fields?.gender || resultGender || "MALE",
    phoneNumber: fields?.phoneNumber || resultPhoneNumber || "",
    email: fields?.email || "",
    dateOfBirth: "",
    address: "",
    bloodType: fields?.bloodType || "",
    diagnosis: fields?.diagnosis || resultDiagnosis || "",
    symptoms: fields?.symptoms || [],
    allergies: fields?.allergies || [],
    medicalHistory: fields?.medicalHistory || [],
    medications: fields?.medications || [],
    vitals: {
      bp: fields?.vitals?.bp || "",
      temp: fields?.vitals?.temp || "",
      pulse: fields?.vitals?.pulse || "",
      respiratoryRate: fields?.vitals?.respiratoryRate || "",
      spO2: fields?.vitals?.spO2 || "",
      glucose: fields?.vitals?.glucose || "",
    },
    labValues: { glucose: "", hemoglobin: "", creatinine: "" },
    invoice: invoiceFromScan,
  };
}

export function buildOcrVitalsPayload(formVitals: OCRFormData["vitals"]): Record<string, number | undefined> {
  const bpParts = formVitals.bp ? formVitals.bp.split("/") : [];
  const payload: Record<string, number | undefined> = {};
  if (bpParts[0]) payload.systolicBP = parseInt(bpParts[0], 10);
  if (bpParts[1]) payload.diastolicBP = parseInt(bpParts[1], 10);
  if (formVitals.temp.trim()) payload.temperature = parseFloat(formVitals.temp);
  if (formVitals.pulse.trim()) payload.pulse = parseInt(formVitals.pulse, 10);
  return payload;
}

export function buildOcrSavePayload(
  formData: OCRFormData,
  clinicId: string,
  userId: string,
  needsReviewAcknowledgement: boolean,
  reviewAcknowledged: boolean,
): OcrImportCommitRequest {
  const dobDate = formData.dateOfBirth.trim()
    ? new Date(formData.dateOfBirth)
    : new Date(new Date().getFullYear() - (parseInt(formData.age, 10) || 0), 0, 1);
  const dobIso = dobDate.toISOString();
  const vitalsPayload = buildOcrVitalsPayload(formData.vitals);
  const hasVitals = Object.values(vitalsPayload).some((v) => v !== undefined);
  const medications = formData.medications.length > 0
    ? formData.medications.map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim() || "—",
        frequency: m.frequency.trim() || "—",
        route: "PO" as const,
        duration: "",
      }))
    : undefined;
  const invoiceDraft = buildInvoiceDraftForCommit(formData.invoice);

  return {
    clinicId,
    doctorId: userId,
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    phoneNumber: formData.phoneNumber.trim(),
    gender: parseStringEnumMember(["MALE", "FEMALE", "OTHER"] as const, formData.gender) ?? "OTHER",
    dateOfBirth: dobIso,
    address: formData.address.trim() || undefined,
    diagnosis: formData.diagnosis.trim() || undefined,
    allergies: formData.allergies.length > 0 ? formData.allergies : undefined,
    medications,
    vitals: hasVitals ? vitalsPayload as OcrImportCommitRequest["vitals"] : undefined,
    consultationNotes: formData.diagnosis.trim() || undefined,
    acknowledgeReview: needsReviewAcknowledgement ? reviewAcknowledged : undefined,
    invoiceDraft,
  };
}

export function buildInvoiceDraftForCommit(
  invoice: OCRInvoiceForm,
): OcrImportCommitRequest["invoiceDraft"] | undefined {
  if (!invoice.saveAsPending) return undefined;
  const parsedItems = invoice.items
    .map((row) => {
      const description = row.description.trim();
      if (description.length === 0) return null;
      const quantity = parseMoneyInput(row.quantity);
      const unitPrice = parseMoneyInput(row.unitPrice);
      let total = parseMoneyInput(row.total);
      if (!Number.isFinite(total) && Number.isFinite(quantity) && Number.isFinite(unitPrice)) {
        total = quantity * unitPrice;
      }
      if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(total) || total < 0) {
        return null;
      }
      return { description, quantity, unitPrice, total };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const grandTotal = parseMoneyInput(invoice.grandTotal);
  const subtotalRaw = parseMoneyInput(invoice.subtotal);
  const taxRaw = parseMoneyInput(invoice.taxTotal);
  const draft = {
    grandTotal,
    subtotal: Number.isFinite(subtotalRaw) ? subtotalRaw : undefined,
    taxTotal: Number.isFinite(taxRaw) ? taxRaw : undefined,
    items: parsedItems,
  };
  const parsed = importInvoiceDraftSchema.safeParse(draft);
  if (!parsed.success) return undefined;
  return parsed.data;
}
