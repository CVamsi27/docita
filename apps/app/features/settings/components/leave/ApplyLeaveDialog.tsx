"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Form } from "@workspace/ui/components/form/form";
import { useApplyLeave } from "@workspace/data-access";
import { createLeaveRequestSchema } from "@workspace/types";
import type { User } from "@workspace/types";
import type { z } from "zod";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  ApplyLeaveStaffField,
  ApplyLeaveFormFields,
  ApplyLeaveDialogFooter,
} from "./ApplyLeaveDialogSections";

type ApplyLeaveFormValues = z.infer<typeof createLeaveRequestSchema>;

const DEFAULT_APPLY_VALUES: ApplyLeaveFormValues = {
  leaveType: "CASUAL",
  startDate: "",
  endDate: "",
  reason: "",
  staffId: undefined,
};

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  userIsAdmin,
  staffMembers,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userIsAdmin: boolean;
  staffMembers: Pick<User, "id" | "name">[];
  onSuccess: () => void;
}) {
  const applyLeaveMutation = useApplyLeave();
  const form = useForm<ApplyLeaveFormValues>({
    resolver: zodResolver(createLeaveRequestSchema),
    defaultValues: DEFAULT_APPLY_VALUES,
  });
  const submitApplyLeave = form.handleSubmit(async (data) => {
    try {
      await applyLeaveMutation.mutateAsync({
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason?.trim() || undefined,
        staffId:
          userIsAdmin && data.staffId?.trim() ? data.staffId.trim() : undefined,
      });
      toast.success("Leave request submitted");
      onOpenChange(false);
      form.reset(DEFAULT_APPLY_VALUES);
      onSuccess();
    } catch {
      showUserFacingErrorToast(
        "We could not submit this leave request. Please try again.",
      );
    }
  });
  function handleOpenChange(value: boolean) {
    if (!value) form.reset(DEFAULT_APPLY_VALUES);
    onOpenChange(value);
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submitApplyLeave} className="space-y-4 py-2">
            {userIsAdmin && staffMembers.length > 0 && (
              <ApplyLeaveStaffField form={form} staffMembers={staffMembers} />
            )}
            <ApplyLeaveFormFields form={form} />
            <ApplyLeaveDialogFooter
              onCancel={() => handleOpenChange(false)}
              isPending={applyLeaveMutation.isPending}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_APPLY_VALUES };
