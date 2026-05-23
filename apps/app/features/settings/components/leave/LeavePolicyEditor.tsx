"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Plus } from "lucide-react";
import { useCreateLeavePlan, useLeavePlans } from "@workspace/data-access";
import { LeavePlan } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  leavePlanDialogFormSchema,
  type LeavePlanDialogFormValues,
} from "@workspace/types";
import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";
import { useState } from "react";
import { labelMapKeys } from "@workspace/utils";

const DEFAULT_VALUES: LeavePlanDialogFormValues = {
  leaveType: "CASUAL",
  annualQuota: 12,
};

export function LeavePolicyEditor() {
  const { data: plans = [] } = useLeavePlans();
  const createPlanMutation = useCreateLeavePlan();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const form = useForm<LeavePlanDialogFormValues>({
    resolver: zodResolver(leavePlanDialogFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const submitLeavePlan = form.handleSubmit(async (data) => {
    try {
      await createPlanMutation.mutateAsync({
        leaveType: data.leaveType,
        annualQuota: data.annualQuota,
        carryForward: false,
        maxCarryForward: 0,
        isActive: true,
      });
      toast.success("Leave plan saved");
      setPlanDialogOpen(false);
      form.reset(DEFAULT_VALUES);
    } catch {
      showUserFacingErrorToast(
        "We could not save this leave plan. Please try again.",
      );
    }
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Leave plans</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              form.reset(DEFAULT_VALUES);
              setPlanDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Configure plan
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leave plans configured. Create plans to set annual quotas.
            </p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan: LeavePlan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {LEAVE_TYPE_LABELS[plan.leaveType]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.annualQuota} days/year
                      {plan.carryForward &&
                        ` • Carry forward: up to ${plan.maxCarryForward} days`}
                    </p>
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure leave plan</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={submitLeavePlan} className="space-y-4 py-2">
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
              <FormField
                control={form.control}
                name="annualQuota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual Quota (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? NaN
                              : Number(e.target.value),
                          )
                        }
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
                  onClick={() => setPlanDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPlanMutation.isPending}>
                  {createPlanMutation.isPending && (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  )}
                  Save Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
