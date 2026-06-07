// jscpd:ignore-start
import {
  FormControl,
  FormDescription,
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
import { DEFAULT_CURRENCY, formatCurrency, formatInternalTierSelectLabel } from "@workspace/utils";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentFormFieldsProps = Pick<PaymentProcessingPageViewModel, 'selectedClinic' | 'selectedTierPricing' | 'tierPricing' | 'form'>;

export function PaymentFormFields({ selectedClinic, selectedTierPricing, tierPricing, form }: PaymentFormFieldsProps) {
  return (
    <>
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
                const tierData = (selectedTierPricing.length > 0 ? selectedTierPricing : tierPricing).find((t) => t.tier === value);
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
                {(selectedTierPricing.length > 0 ? selectedTierPricing : tierPricing).map((tier) => (
                  <SelectItem key={tier.tier} value={tier.tier}>
                    {formatInternalTierSelectLabel(tier.tier, {
                      displayName: tier.displayName,
                      price: tier.priceIsCustom ? null : tier.price,
                      billingCycle: tier.billingCycle,
                      formatMoney: (amount: number) =>
                        formatCurrency(amount, { currency: selectedClinic?.currency || DEFAULT_CURRENCY, fractionDigits: 0 }),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Select the new tier for this facility</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount ({selectedClinic?.currency || DEFAULT_CURRENCY})</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Amount" {...field} disabled />
            </FormControl>
            <FormDescription>Amount will be auto-calculated based on selected tier</FormDescription>
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
            <Select value={field.value ?? "razorpay"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
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
    </>
  );
}
// jscpd:ignore-end
