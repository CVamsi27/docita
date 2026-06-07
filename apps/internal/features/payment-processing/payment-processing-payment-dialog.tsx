"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
// jscpd:ignore-start
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
// jscpd:ignore-end
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  formatInternalTierSelectLabel,
} from "@workspace/utils";
import { getInternalTierBadgeClass } from "@/lib/tier-display";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentProcessingPaymentDialogProps = Pick<PaymentProcessingPageViewModel, 'showPaymentDialog' | 'setShowPaymentDialog' | 'selectedClinic' | 'tierInfo' | 'selectedTierPricing' | 'tierPricing' | 'form' | 'onSubmit' | 'processPaymentMutation'>;

export function PaymentProcessingPaymentDialog(props: PaymentProcessingPaymentDialogProps) {
  const { showPaymentDialog, setShowPaymentDialog, selectedClinic, tierInfo, selectedTierPricing, tierPricing, form, onSubmit, processPaymentMutation } = props;
  return (
    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payment Processing - {selectedClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Process payment and update clinic tier
            </DialogDescription>
          </DialogHeader>

          {tierInfo && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Tier
                    </p>
                    <Badge
                      className={getInternalTierBadgeClass(tierInfo.currentTier)}
                    >
                      {tierInfo.currentTier}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Price
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        selectedTierPricing.find(
                          (t) => t.tier === tierInfo.currentTier,
                        )?.price ?? tierInfo.pricing,
                        {
                          currency:
                            selectedClinic?.currency || DEFAULT_CURRENCY,
                          fractionDigits: 0,
                        },
                      )}
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="newTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upgrade to Tier</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const tierData = (
                            selectedTierPricing.length > 0
                              ? selectedTierPricing
                              : tierPricing
                          ).find((t) => t.tier === value);
                          if (tierData) {
                            form.setValue("amount", tierData.price.toString());
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(selectedTierPricing.length > 0
                            ? selectedTierPricing
                            : tierPricing
                          ).map((tier) => (
                            <SelectItem key={tier.tier} value={tier.tier}>
                              {formatInternalTierSelectLabel(tier.tier, {
                                displayName: tier.displayName,
                                price: tier.priceIsCustom ? null : tier.price,
                                billingCycle: tier.billingCycle,
                                formatMoney: (amount: number) =>
                                  formatCurrency(amount, {
                                    currency:
                                      selectedClinic?.currency ||
                                      DEFAULT_CURRENCY,
                                    fractionDigits: 0,
                                  }),
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the new tier for this facility
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount ({selectedClinic?.currency || DEFAULT_CURRENCY})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Amount"
                          {...field}
                          disabled
                        />
                      </FormControl>
                      <FormDescription>
                        Amount will be auto-calculated based on selected tier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        value={field.value ?? "razorpay"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="razorpay">Razorpay</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="bank_transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Payment notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentDialog(false)}
                    disabled={processPaymentMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processPaymentMutation.isPending}
                  >
                    {processPaymentMutation.isPending && (
                      <DocitaLoadingIndicator
                        variant="inline"
                        decorative
                        className="mr-2"
                      />
                    )}
                    {processPaymentMutation.isPending
                      ? "Processing…"
                      : "Process Payment"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
  );
}
