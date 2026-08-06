import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/data-display/table-essentials";
import { Input, Label } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import type { OphthalmologyExamData } from "@workspace/types";
import { getVisionExamFieldValue, VISION_EXAM_FIELDS, type VisionExamFieldKey, type VisionEyeKey } from "./vision-exam-fields";

export interface VisionEyeMeta {
  key: VisionEyeKey;
  label: string;
  color: string;
}

interface VisionAcuityViewProps {
  eyes: VisionEyeMeta[];
  value: OphthalmologyExamData;
  onFieldChange: (
    eye: VisionEyeKey,
    field: VisionExamFieldKey,
    val: string,
  ) => void;
  readOnly?: boolean;
}

/** Small-screen card-per-eye layout — split out so the orchestrator isn't carrying both the mobile and desktop renders of the same eyes × fields data. */
export function VisionAcuityMobileCards({
  eyes,
  value,
  onFieldChange,
  readOnly,
}: VisionAcuityViewProps) {
  return (
    <div className="space-y-4 md:hidden">
      {eyes.map((eye) => (
        <div key={eye.key} className="ui-card-surface space-y-3 p-4">
          <p className={cn("text-sm font-semibold", eye.color)}>{eye.label}</p>
          <div className="grid grid-cols-2 gap-3">
            {VISION_EXAM_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  value={getVisionExamFieldValue(value, eye.key, field.key)}
                  onChange={(e) =>
                    onFieldChange(eye.key, field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Wide-screen eyes × fields table — the desktop counterpart to `VisionAcuityMobileCards`, split out for the same reason (and so each layout can be reasoned about independently of the other). */
export function VisionAcuityTable({
  eyes,
  value,
  onFieldChange,
  readOnly,
}: VisionAcuityViewProps) {
  const { t } = useTranslation("Consultation.visionExam");
  return (
    <div className="hidden overflow-x-auto overscroll-x-contain md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">{t("eyeHeader")}</TableHead>
            {VISION_EXAM_FIELDS.map((field) => (
              <TableHead key={field.key}>{field.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {eyes.map((eye) => (
            <TableRow key={eye.key}>
              <TableCell className={cn("font-semibold", eye.color)}>
                {eye.key}
              </TableCell>
              {VISION_EXAM_FIELDS.map((field) => (
                <TableCell key={`${eye.key}-${field.key}`}>
                  <Input
                    value={getVisionExamFieldValue(value, eye.key, field.key)}
                    onChange={(e) =>
                      onFieldChange(eye.key, field.key, e.target.value)
                    }
                    placeholder={field.placeholder}
                    className="h-8 w-24"
                    readOnly={readOnly}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface VisionMeasurementFieldsProps {
  value: OphthalmologyExamData;
  onChange: (value: OphthalmologyExamData) => void;
  readOnly?: boolean;
}

/** PD (pupillary distance) + notes pair — split out as its own self-contained measurement group, independent of the IOP group beside it. */
export function VisionPupillaryDistanceFields({
  value,
  onChange,
  readOnly,
}: VisionMeasurementFieldsProps) {
  const { t } = useTranslation("Consultation.visionExam");
  return (
    <div className="space-y-2">
      <Label>{t("pdLabel")}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder={t("pdPlaceholder")}
          value={value?.refraction?.pupillaryDistance?.toString() || ""}
          onChange={(e) =>
            onChange({
              ...value,
              refraction: {
                ...value.refraction,
                pupillaryDistance: e.target.value
                  ? parseFloat(e.target.value)
                  : undefined,
              },
            })
          }
          readOnly={readOnly}
        />
        <Input
          value={value?.refraction?.notes || ""}
          placeholder={t("notesPlaceholder")}
          onChange={(e) =>
            onChange({
              ...value,
              refraction: { ...value.refraction, notes: e.target.value },
            })
          }
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

interface VisionIopFieldProps extends VisionMeasurementFieldsProps {
  eyeKey: "od" | "os";
  label: string;
  colorClass: string;
}

/** One eye's IOP input with its overlaid OD/OS label badge — the OD and OS blocks were near-identical copies of this same render (differing only in key, label, and color), so the shared shape is named once and parameterized by eye instead of duplicated. */
function VisionIopField({
  eyeKey,
  label,
  colorClass,
  value,
  onChange,
  readOnly,
}: VisionIopFieldProps) {
  const { t } = useTranslation("Consultation.visionExam");
  return (
    <div className="relative w-full">
      <span
        className={cn("absolute left-3 top-2 text-xs font-bold", colorClass)}
      >
        {label}
      </span>
      <Input
        className="pl-8"
        placeholder={t("iopPlaceholder")}
        value={value?.iop?.[eyeKey]?.toString() || ""}
        onChange={(e) =>
          onChange({
            ...value,
            iop: {
              ...value.iop,
              [eyeKey]: e.target.value ? parseFloat(e.target.value) : undefined,
            },
          })
        }
        readOnly={readOnly}
      />
    </div>
  );
}

/** IOP (intraocular pressure) pair — split out as its own self-contained measurement group, composed from the shared, eye-parameterized `VisionIopField`. */
export function VisionIntraocularPressureFields({
  value,
  onChange,
  readOnly,
}: VisionMeasurementFieldsProps) {
  const { t } = useTranslation("Consultation.visionExam");
  return (
    <div className="space-y-2">
      <Label>{t("iopLabel")}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <VisionIopField
          eyeKey="od"
          label="OD"
          colorClass="text-info"
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
        <VisionIopField
          eyeKey="os"
          label="OS"
          colorClass="text-success"
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
