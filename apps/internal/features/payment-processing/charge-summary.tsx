// jscpd:ignore-start
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
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type ChargeSummaryProps = Pick<PaymentProcessingPageViewModel, 'additionalChargeForm'>;

export function ChargeSummary({ additionalChargeForm }: ChargeSummaryProps) {
  return (
    <>
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
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
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
              <Input placeholder="Enter Razorpay payment id" {...field} />
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
              <Textarea placeholder="Scope, invoice reference, or internal note" rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
// jscpd:ignore-end
