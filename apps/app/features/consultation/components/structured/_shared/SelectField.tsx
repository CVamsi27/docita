"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/select";

export interface SelectFieldOption {
  value: string;
  labelKey: string;
}

interface SelectFieldProps {
  value: string;
  placeholderKey: string;
  options: ReadonlyArray<SelectFieldOption>;
  readOnly: boolean;
  onChange: (value: string) => void;
  t: (key: string) => string;
  /** Optional extra class on the SelectTrigger. Defaults to "h-11 bg-background". */
  triggerClassName?: string;
  /** Optional extra class on the SelectContent. */
  contentClassName?: string;
}

/**
 * Shared select-field wrapper used by structured consultation
 * rows (complaint, diagnosis). The trigger placeholder and
 * option labels resolve through the caller's `t`, so the
 * wrapper is i18n-namespace agnostic.
 */
export function SelectField({
  value,
  placeholderKey,
  options,
  readOnly,
  onChange,
  t,
  triggerClassName = "h-11 bg-background",
}: SelectFieldProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={readOnly}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={t(placeholderKey)} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
