import type {
  OphthalmologyExamData,
  RefractionEyeData,
  VisualAcuityEyeData,
} from "@workspace/types";

export type VisionEyeKey = "OD" | "OS";
export type VisionExamFieldKey =
  | "sph"
  | "cyl"
  | "axis"
  | "add"
  | "va"
  | "vaNear";
type RefractionNumericField = "sphere" | "cylinder" | "axis" | "add";

export const VISION_EXAM_FIELDS: Array<{
  key: VisionExamFieldKey;
  label: string;
  placeholder: string;
}> = [
  { key: "sph", label: "Sphere (Sph)", placeholder: "Sphere" },
  { key: "cyl", label: "Cylinder (Cyl)", placeholder: "Cylinder" },
  { key: "axis", label: "Axis", placeholder: "Axis" },
  { key: "add", label: "Add", placeholder: "Add" },
  { key: "va", label: "VA (Dist)", placeholder: "Visual acuity" },
  { key: "vaNear", label: "VA (Near)", placeholder: "Near visual acuity" },
];

export function getVisionExamFieldValue(
  value: OphthalmologyExamData,
  eye: VisionEyeKey,
  fieldKey: VisionExamFieldKey,
): string {
  const eyeKey = toSchemaEyeKey(eye);
  const readers: Record<VisionExamFieldKey, () => string> = {
    sph: () => value.refraction?.[eyeKey]?.sphere?.toString() ?? "",
    cyl: () => value.refraction?.[eyeKey]?.cylinder?.toString() ?? "",
    axis: () => value.refraction?.[eyeKey]?.axis?.toString() ?? "",
    add: () => value.refraction?.[eyeKey]?.add?.toString() ?? "",
    va: () => value.visualAcuity?.[eyeKey]?.uncorrected ?? "",
    vaNear: () => value.visualAcuity?.[eyeKey]?.corrected ?? "",
  };
  return readers[fieldKey]();
}

export function updateVisionExamField(
  value: OphthalmologyExamData,
  eye: VisionEyeKey,
  field: VisionExamFieldKey,
  fieldValue: string,
): OphthalmologyExamData {
  return refractionFieldUpdaters[field]
    ? updateRefractionField(value, eye, field, fieldValue)
    : updateVisualAcuityField(value, eye, field, fieldValue);
}

const refractionFieldUpdaters: Partial<Record<VisionExamFieldKey, true>> = {
  sph: true,
  cyl: true,
  axis: true,
  add: true,
};
const refractionPropertyByField: Partial<
  Record<VisionExamFieldKey, RefractionNumericField>
> = {
  sph: "sphere",
  cyl: "cylinder",
  axis: "axis",
  add: "add",
};
const visualAcuityPropertyByField: Partial<
  Record<VisionExamFieldKey, keyof VisualAcuityEyeData>
> = {
  va: "uncorrected",
  vaNear: "corrected",
};

function updateRefractionField(
  value: OphthalmologyExamData,
  eye: VisionEyeKey,
  field: VisionExamFieldKey,
  fieldValue: string,
): OphthalmologyExamData {
  const eyeKey = toSchemaEyeKey(eye);
  const property = refractionPropertyByField[field];
  if (!property) return value;
  const nextEye: RefractionEyeData = { ...(value.refraction?.[eyeKey] ?? {}) };
  if (fieldValue) {
    nextEye[property] = parseFloat(fieldValue);
  } else {
    delete nextEye[property];
  }
  return {
    ...value,
    refraction: {
      ...value.refraction,
      [eyeKey]: nextEye,
    },
  };
}

function updateVisualAcuityField(
  value: OphthalmologyExamData,
  eye: VisionEyeKey,
  field: VisionExamFieldKey,
  fieldValue: string,
): OphthalmologyExamData {
  const eyeKey = toSchemaEyeKey(eye);
  const property = visualAcuityPropertyByField[field];
  if (!property) return value;
  const nextEye = { ...(value.visualAcuity?.[eyeKey] ?? {}) };
  nextEye[property] = fieldValue;
  return {
    ...value,
    visualAcuity: {
      ...value.visualAcuity,
      [eyeKey]: nextEye,
    },
  };
}

function toSchemaEyeKey(eye: VisionEyeKey): "od" | "os" {
  return eye === "OD" ? "od" : "os";
}
