import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Textarea } from "@workspace/ui/components/form/form-primitives";
import { DatePicker, FormDialogFooter, FormSelectField } from "@workspace/ui/components";
import type { User } from "@workspace/types";
import type { z } from "zod";
import { createLeaveRequestSchema, leaveTypeSchema } from "@workspace/types";
import { useTranslation } from "react-i18next";
import { leaveTypeLabel } from "./leave-type-helpers";

type ApplyLeaveFormValues = z.infer<typeof createLeaveRequestSchema>;

/**
 * Phase 3 (per-feature): apps/app Settings > Apply leave dialog
 * sections. Keys resolve against the parent Settings namespace as
 * applyLeaveDialog.* (single binding per file keeps the audit traceable).
 */
function useApplyLeaveTranslations() {
  return useTranslation("Settings");
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
      label={t("applyLeaveDialog.onBehalfOfLabel")}
      placeholder={t("applyLeaveDialog.staffMemberPlaceholder")}
      unsetValue="self"
      unsetLabel={t("applyLeaveDialog.myselfOption")}
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
        label={t("applyLeaveDialog.leaveTypeLabel")}
        placeholder={t("applyLeaveDialog.leaveTypePlaceholder")}
        options={leaveTypeSchema.options.map((lt) => ({
          value: lt,
          label: leaveTypeLabel(lt, t),
        }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("applyLeaveDialog.startDateLabel")}</FormLabel>
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
              <FormLabel>{t("applyLeaveDialog.endDateLabel")}</FormLabel>
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
            <FormLabel>{t("applyLeaveDialog.reasonLabel")}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t("applyLeaveDialog.reasonPlaceholder")}
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
      submitLabel={t("applyLeaveDialog.submitButton")}
      cancelLabel={t("applyLeaveDialog.cancelButton")}
      onCancel={onCancel}
    />
  );
}
