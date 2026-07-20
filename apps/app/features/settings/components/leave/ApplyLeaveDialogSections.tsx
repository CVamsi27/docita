"use client";

// jscpd:ignore-start
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/form/button";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import {
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import type { User } from "@workspace/types";
import type { z } from "zod";
import { createLeaveRequestSchema } from "@workspace/types";
import { useTranslations } from "next-intl";
import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";
import { labelMapKeys } from "@workspace/utils";

type ApplyLeaveFormValues = z.infer<typeof createLeaveRequestSchema>;

/**
 * Phase 3 (per-feature): apps/app Settings > Apply leave dialog
 * sections. 6 literals converted to
 * useTranslations("Settings.applyLeaveDialog").
 */
function useApplyLeaveTranslations() {
  return useTranslations("Settings.applyLeaveDialog");
}

interface ApplyLeaveStaffFieldProps {
  form: UseFormReturn<ApplyLeaveFormValues>;
  staffMembers: Pick<User, "id" | "name">[];
}

export function ApplyLeaveStaffField({
  form,
  staffMembers,
}: ApplyLeaveStaffFieldProps) {
  const t = useApplyLeaveTranslations();
  return (
    <FormField
      control={form.control}
      name="staffId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("onBehalfOfLabel")}</FormLabel>
          <Select
            value={field.value || "self"}
            onValueChange={(v) =>
              field.onChange(v === "self" ? undefined : v)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t("staffMemberPlaceholder")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="self">{t("myselfOption")}</SelectItem>
              {staffMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ApplyLeaveFormFieldsProps {
  form: UseFormReturn<ApplyLeaveFormValues>;
}

export function ApplyLeaveFormFields({ form }: ApplyLeaveFormFieldsProps) {
  const t = useApplyLeaveTranslations();
  return (
    <>
      <FormField
        control={form.control}
        name="leaveType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("leaveTypeLabel")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("leaveTypePlaceholder")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {labelMapKeys(LEAVE_TYPE_LABELS).map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {LEAVE_TYPE_LABELS[lt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("startDateLabel")}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value || undefined}
                  onChange={(date) => {
                    const next = date?.toISOString().slice(0, 10) ?? "";
                    field.onChange(next);
                    const end = form.getValues("endDate");
                    if (end && date && new Date(end) < new Date(next)) {
                      form.setValue("endDate", "");
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("endDateLabel")}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value || undefined}
                  minDate={
                    form.watch("startDate")
                      ? new Date(form.watch("startDate"))
                      : undefined
                  }
                  onChange={(date) =>
                    field.onChange(date?.toISOString().slice(0, 10) ?? "")
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="reason"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("reasonLabel")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("reasonPlaceholder")}
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

interface ApplyLeaveDialogFooterProps {
  onCancel: () => void;
  isPending: boolean;
}

export function ApplyLeaveDialogFooter({
  onCancel,
  isPending,
}: ApplyLeaveDialogFooterProps) {
  const t = useApplyLeaveTranslations();
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        {t("cancelButton")}
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending && (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
        )}
        {t("submitButton")}
{/* jscpd:ignore-end */}
      </Button>
    </DialogFooter>
  );
}
