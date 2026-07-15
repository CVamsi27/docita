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

export function FeedbackFiltersCard({
  filters,
  show,
  onFiltersChange,
}: FeedbackFiltersCardProps) {
  const t = useTranslations("Feedback.status");
  if (!show) return null;

  const setFilter = (key: keyof InternalFeedbackFilters, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <Label>Status</Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) =>
                setFilter("status", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((opt) => {
                  // Phase 6.6: prefer t(labelKey) over the literal label.
                  // The local cast on t() narrows the return type to string
                  // so the `as const` tuple narrowing on STATUS_OPTIONS
                  // doesn't collapse `opt.label` to `never` inside JSX.
                  const itemLabel: string =
                    (t(opt.labelKey) as string) || opt.label;
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
            <Label>Category</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(v) =>
                setFilter("category", v === "all" ? undefined : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Min Rating</Label>
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
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any rating</SelectItem>
                {[1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}+ stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start Date</Label>
            <DatePicker
              value={filters.startDate || undefined}
              onChange={(date) =>
                setFilter(
                  "startDate",
                  date?.toISOString().slice(0, 10) ?? undefined,
                )
              }
              placeholder="Start date"
            />
          </div>
          <div>
            <Label>End Date</Label>
            <DatePicker
              value={filters.endDate || undefined}
              onChange={(date) =>
                setFilter(
                  "endDate",
                  date?.toISOString().slice(0, 10) ?? undefined,
                )
              }
              placeholder="End date"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => onFiltersChange({})}
            className="mr-2"
          >
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
