"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
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
import { Textarea } from "@workspace/ui/components/form/textarea";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { guidedSetupPresetAmount } from "@/features/payment-processing/payment-processing-helpers";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentProcessingAdditionalChargeDialogProps = Pick<PaymentProcessingPageViewModel, 'showAdditionalChargeDialog' | 'setShowAdditionalChargeDialog' | 'additionalChargeClinic' | 'setAdditionalChargeClinic' | 'additionalChargeForm' | 'onSubmitAdditionalCharge' | 'recordAdditionalChargeMutation'>;

export function PaymentProcessingAdditionalChargeDialog(props: PaymentProcessingAdditionalChargeDialogProps) {
  const { showAdditionalChargeDialog, setShowAdditionalChargeDialog, additionalChargeClinic, setAdditionalChargeClinic, additionalChargeForm, onSubmitAdditionalCharge, recordAdditionalChargeMutation } = props;
  return (
    <Dialog
        open={showAdditionalChargeDialog}
        onOpenChange={(open) => {
          setShowAdditionalChargeDialog(open);
          if (!open) {
            setAdditionalChargeClinic(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add-on charge — {additionalChargeClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Records a paid one-off charge (for example guided setup) in
              billing history. This does not change the clinic subscription
              tier.
            </DialogDescription>
          </DialogHeader>

          <Form {...additionalChargeForm}>
            <form
              onSubmit={additionalChargeForm.handleSubmit(
                onSubmitAdditionalCharge,
              )}
              noValidate
              className="space-y-4"
            >
              <FormField
                control={additionalChargeForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "GUIDED_SETUP") {
                          additionalChargeForm.setValue(
                            "amount",
                            guidedSetupPresetAmount(
                              additionalChargeClinic?.currency,
                            ),
                          );
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GUIDED_SETUP">
                          Guided setup
                        </SelectItem>
                        <SelectItem value="DATA_MIGRATION">
                          Data migration
                        </SelectItem>
                        <SelectItem value="CUSTOM_TRAINING">
                          Custom training
                        </SelectItem>
                        <SelectItem value="INTEGRATION">Integration</SelectItem>
                        <SelectItem value="COMMERCIAL_DISCOUNT">
                          Commercial discount / adjustment
                        </SelectItem>
                        <SelectItem value="OTHER">Other service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Guided setup is separate from the software subscription.
                      Default amount follows the list price for the
                      clinic&apos;s currency; adjust to match your invoice.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Amount (
                      {additionalChargeClinic?.currency || DEFAULT_CURRENCY})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        placeholder="Enter amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank transfer
                        </SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="razorpayPaymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razorpay payment ID (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Razorpay payment id"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Scope, invoice reference, or internal note"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdditionalChargeDialog(false)}
                  disabled={recordAdditionalChargeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordAdditionalChargeMutation.isPending}
                >
                  {recordAdditionalChargeMutation.isPending && (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  )}
                  {recordAdditionalChargeMutation.isPending
                    ? "Saving…"
                    : "Record charge"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}
