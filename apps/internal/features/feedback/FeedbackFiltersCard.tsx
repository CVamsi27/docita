"use client";

// jscpd:ignore-start
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
// jscpd:ignore-end
  filters: InternalFeedbackFilters;
  show: boolean;
  onFiltersChange: (filters: InternalFeedbackFilters) => void;
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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <Label>{t("statusLabel")}</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) =>
                setFilter("status", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {STATUS_OPTIONS.map((opt) => {
                  const itemLabel: string =
                    (tStatus(opt.labelKey) as string) || opt.label;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      {itemLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("categoryLabel")}</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(v) =>
                setFilter("category", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("minRatingLabel")}</Label>
            <Select
              value={String(filters.minRating || "all")}
              onValueChange={(v) =>
                setFilter(
                  "minRating",
                  v === "all" ? undefined : parseInt(v),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("ratingPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("anyRating")}</SelectItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {t("ratingPlus", { count: r })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
