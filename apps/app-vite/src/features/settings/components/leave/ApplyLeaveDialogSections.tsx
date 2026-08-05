import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Textarea } from "@workspace/ui/components/form/form-primitives";
import { DatePicker, FormDialogFooter, FormSelectField } from "@workspace/ui/components";
import type { User } from "@workspace/types";
import type { z } from "zod";
import { createLeaveRequestSchema, leaveTypeSchema } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";

type ApplyLeaveFormValues = z.infer<typeof createLeaveRequestSchema>;

/**
 * Phase 3 (per-feature): apps/app Settings > Apply leave dialog
 * sections. 6 literals converted to
 * useTranslation("Settings.applyLeaveDialog").
 */
function useApplyLeaveTranslations() {
  return useTranslation("Settings.applyLeaveDialog");
}

interface ApplyLeaveStaffFieldProps {
  form: UseFormReturn<ApplyLeaveFormValues>;
  staffMembers: Pick<User, "id" | "name">[];
}

export function ApplyLeaveStaffField({
  form,
  staffMembers,
}: ApplyLeaveStaffFieldProps) {
  const { t } = useApplyLeaveTranslations();
  return (
    <FormSelectField
      control={form.control}
      name="staffId"
      label={t("onBehalfOfLabel")}
      placeholder={t("staffMemberPlaceholder")}
      unsetValue="self"
      unsetLabel={t("myselfOption")}
      options={staffMembers.map((m) => ({ value: m.id, label: m.name }))}
    />
  );
}

interface ApplyLeaveFormFieldsProps {
  form: UseFormReturn<ApplyLeaveFormValues>;
}

export function ApplyLeaveFormFields({ form }: ApplyLeaveFormFieldsProps) {
  const { t } = useApplyLeaveTranslations();
  return (
    <>
      <FormSelectField
        control={form.control}
        name="leaveType"
        label={t("leaveTypeLabel")}
        placeholder={t("leaveTypePlaceholder")}
        options={leaveTypeSchema.options.map((lt) => ({
          value: lt,
          label: LEAVE_TYPE_LABELS[lt],
        }))}
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
  const { t } = useApplyLeaveTranslations();
  return (
    <FormDialogFooter
      isLoading={isPending}
      submitLabel={t("submitButton")}
      cancelLabel={t("cancelButton")}
      onCancel={onCancel}
    />
  );
}
