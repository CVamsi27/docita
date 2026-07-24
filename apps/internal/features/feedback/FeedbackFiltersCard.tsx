"use client";

import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Label } from "@workspace/ui/components/form/label";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { useTranslations } from "next-intl";
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from "./feedback-helpers";
import type { InternalFeedbackFilters } from "@workspace/data-access/internal";

interface FeedbackFiltersCardProps {
  filters: InternalFeedbackFilters;
  show: boolean;
  onFiltersChange: (filters: InternalFeedbackFilters) => void;
}

interface SelectFilterOption {
  value: string;
  label: string;
}

interface SelectFilterFieldProps {
  label: string;
  /** The current selected value, or undefined for the "all" sentinel. */
  value: string | undefined;
  placeholder: string;
  allOptionLabel: string;
  options: ReadonlyArray<SelectFilterOption>;
  /**
   * Called with `undefined` when the user picks the "all" option,
   * otherwise the picked option's value.
   */
  onChange: (value: string | undefined) => void;
}

/**
 * One of the three "all + options" filter selects in the
 * feedback filters card (status, category, minRating). Pulled
 * out of the inline JSX so the three columns stop jscpd-
 * matching each other.
 */
function SelectFilterField({
  label,
  value,
  placeholder,
  allOptionLabel,
  options,
  onChange,
}: SelectFilterFieldProps) {
  const current = value ?? "all";
  return (
    <div>
      <Label>{label}</Label>
      <Select
        value={current}
        onValueChange={(v) => onChange(v === "all" ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allOptionLabel}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Phase 3 (per-feature): apps/internal Feedback > Filters
 * card. 9 literals converted to useTranslations
 * (\"Feedback.filters\") — filter labels, placeholders,
 * clear button. The status options still resolve through
 * Feedback.status (set in 6.6).
 */
export function FeedbackFiltersCard({
  filters,
  show,
  onFiltersChange,
}: FeedbackFiltersCardProps) {
  const t = useTranslations("Feedback.filters");
  const tStatus = useTranslations("Feedback.status");
  if (!show) return null;

  const setFilter = (key: keyof InternalFeedbackFilters, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const statusOptions: SelectFilterOption[] = STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: (tStatus(opt.labelKey) as string) || opt.label,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-5">
          <SelectFilterField
            label={t("statusLabel")}
            value={filters.status}
            placeholder={t("statusPlaceholder")}
            allOptionLabel={t("allStatuses")}
            options={statusOptions}
            onChange={(v) => setFilter("status", v)}
          />
          <SelectFilterField
            label={t("categoryLabel")}
            value={filters.category}
            placeholder={t("categoryPlaceholder")}
            allOptionLabel={t("allCategories")}
            options={CATEGORY_OPTIONS}
            onChange={(v) => setFilter("category", v)}
          />
          <SelectFilterField
            label={t("minRatingLabel")}
            value={
              filters.minRating !== undefined && filters.minRating !== null
                ? String(filters.minRating)
                : undefined
            }
            placeholder={t("ratingPlaceholder")}
            allOptionLabel={t("anyRating")}
            options={[1, 2, 3, 4, 5].map((r) => ({
              value: String(r),
              label: t("ratingPlus", { count: r }),
            }))}
            onChange={(v) =>
              setFilter("minRating", v === undefined ? undefined : parseInt(v))
            }
          />
          <div>
            <Label>{t("startDateLabel")}</Label>
            <DatePicker
              value={filters.startDate || undefined}
              onChange={(date) =>
                setFilter(
                  "startDate",
                  date?.toISOString().slice(0, 10) ?? undefined,
                )
              }
              placeholder={t("startDatePlaceholder")}
            />
          </div>
          <div>
            <Label>{t("endDateLabel")}</Label>
            <DatePicker
              value={filters.endDate || undefined}
              onChange={(date) =>
                setFilter(
                  "endDate",
                  date?.toISOString().slice(0, 10) ?? undefined,
                )
              }
              placeholder={t("endDatePlaceholder")}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => onFiltersChange({})}
            className="mr-2"
          >
            {t("clearFiltersButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
