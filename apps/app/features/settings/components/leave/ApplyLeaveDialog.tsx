"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/form/button";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Form,
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
import { useApplyLeave } from "@workspace/data-access";
import { createLeaveRequestSchema } from "@workspace/types";
import type { User } from "@workspace/types";
import type { z } from "zod";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";
import { labelMapKeys } from "@workspace/utils";

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
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>On behalf of (optional)</FormLabel>
                    <Select
                      value={field.value || "self"}
                      onValueChange={(v) =>
                        field.onChange(v === "self" ? undefined : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="self">Myself</SelectItem>
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
            )}
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Leave type" />
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
                    <FormLabel>Start Date</FormLabel>
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
                    <FormLabel>End Date</FormLabel>
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
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for leave"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={applyLeaveMutation.isPending}>
                {applyLeaveMutation.isPending && (
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_APPLY_VALUES };
