import type { ReactNode } from "react";
import { Label, Textarea } from "@workspace/ui/components";

/**
 * Shared field primitives for the specialty exam sections (Gynecology,
 * Psychiatry, Dermatology, Cardiology, ...). Every specialty renders the same
 * "labeled textarea in a `space-y-2` wrapper" and "two-column field grid"
 * shells — only the field ids, labels, min-heights, placeholders, and bound
 * values differ — so those shells live here once and each section just
 * supplies its specialty-specific data and copy.
 */

interface ExamTextareaFieldProps {
  id: string;
  label: string;
  /** Tailwind min-height class for the textarea, e.g. `"min-h-[100px]"`. */
  minHeightClassName: string;
  readOnly?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function ExamTextareaField({
  id,
  label,
  minHeightClassName,
  readOnly,
  placeholder,
  value,
  onChange,
}: ExamTextareaFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      <Textarea
        id={id}
        className={minHeightClassName}
        readOnly={readOnly}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface ExamFieldGridProps {
  children: ReactNode;
}

/** Two-column responsive grid shared by every specialty exam section. */
export function ExamFieldGrid({ children }: ExamFieldGridProps) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

interface ExamAssessmentPlanFieldsProps {
  /** Prefixes each field id, e.g. `"gyn"` produces `"gyn-assessment"` / `"gyn-plan"`. */
  idPrefix: string;
  readOnly?: boolean;
  /** Placeholder text shown in both fields; omit for sections that don't use one. */
  withPlaceholders?: boolean;
  assessmentMinHeightClassName?: string;
  planMinHeightClassName?: string;
  clinicalAssessment: string;
  plan: string;
  onClinicalAssessmentChange: (value: string) => void;
  onPlanChange: (value: string) => void;
}

/**
 * The "Clinical assessment" + "Plan" two-column field pair appears, in some
 * form, in every specialty exam section. Centralising it here removes the
 * largest single source of duplication between the sections.
 */
export function ExamAssessmentPlanFields({
  idPrefix,
  readOnly,
  withPlaceholders,
  assessmentMinHeightClassName = "min-h-[100px]",
  planMinHeightClassName = "min-h-[100px]",
  clinicalAssessment,
  plan,
  onClinicalAssessmentChange,
  onPlanChange,
}: ExamAssessmentPlanFieldsProps) {
  return (
    <ExamFieldGrid>
      <ExamTextareaField
        id={`${idPrefix}-assessment`}
        label="Clinical assessment"
        minHeightClassName={assessmentMinHeightClassName}
        readOnly={readOnly}
        placeholder={withPlaceholders ? "Clinical assessment" : undefined}
        value={clinicalAssessment}
        onChange={onClinicalAssessmentChange}
      />
      <ExamTextareaField
        id={`${idPrefix}-plan`}
        label="Plan"
        minHeightClassName={planMinHeightClassName}
        readOnly={readOnly}
        placeholder={withPlaceholders ? "Plan" : undefined}
        value={plan}
        onChange={onPlanChange}
      />
    </ExamFieldGrid>
  );
}
