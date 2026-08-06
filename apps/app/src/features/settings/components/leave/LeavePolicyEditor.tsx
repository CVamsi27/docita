import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Form } from "@workspace/ui/components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { Plus } from "lucide-react";
import { useCreateLeavePlan, useLeavePlans } from "@workspace/data-access";
import type { LeavePlan } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  leavePlanDialogFormSchema,
  leaveTypeSchema,
  type LeavePlanDialogFormValues,
} from "@workspace/types";
import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";

const DEFAULT_VALUES: LeavePlanDialogFormValues = {
  leaveType: "CASUAL",
  annualQuota: 12,
};

export function LeavePolicyEditor() {
  const { t } = useTranslation("Settings.leavePolicy");
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
      toast.success(t("savedToast"));
      setPlanDialogOpen(false);
      form.reset(DEFAULT_VALUES);
    } catch {
      showUserFacingErrorToast(t("saveError"));
    }
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-5">
          <CardTitle>{t("title")}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              form.reset(DEFAULT_VALUES);
              setPlanDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("configurePlan")}
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("emptyDescription")}
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
                      {t("daysPerYear", { count: plan.annualQuota })}
                      {plan.carryForward &&
                        ` • ${t("carryForward", { count: plan.maxCarryForward })}`}
                    </p>
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? t("active") : t("inactive")}
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
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={submitLeavePlan} className="space-y-4 py-2">
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
                        {leaveTypeSchema.options.map((lt) => (
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
                    <FormLabel>{t("annualQuotaLabel")}</FormLabel>
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
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={createPlanMutation.isPending}>
                  {createPlanMutation.isPending && (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  )}
                  {t("savePlan")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
