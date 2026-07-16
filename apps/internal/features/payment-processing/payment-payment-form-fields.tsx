// jscpd:ignore-start
import { useTranslations } from "next-intl";
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

/**
 * Phase 3 (per-feature): apps/internal Payment Processing
 * form fields — the per-clinic payment / upgrade tier form
 * used by the internal sales team. 10 literals converted
 * to useTranslations("InternalPaymentProcessing.formFields").
 */
function usePaymentFormFieldsTranslations() {
  return useTranslations("InternalPaymentProcessing.formFields");
}

export function PaymentFormFields({ selectedClinic, selectedTierPricing, tierPricing, form }: PaymentFormFieldsProps) {
  const t = usePaymentFormFieldsTranslations();
  return (
    <>
      <FormField
        control={form.control}
        name="newTier"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("tierLabel")}</FormLabel>
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
            <FormDescription>{t("tierDescription")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("amountLabel", { currency: selectedClinic?.currency || DEFAULT_CURRENCY })}</FormLabel>
            <FormControl>
              <Input type="number" placeholder={t("amountPlaceholder")} {...field} disabled />
            </FormControl>
            <FormDescription>{t("amountDescription")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("paymentMethodLabel")}</FormLabel>
            <Select value={field.value ?? "razorpay"} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="razorpay">{t("paymentMethodRazorpay")}</SelectItem>
                <SelectItem value="stripe">{t("paymentMethodStripe")}</SelectItem>
                <SelectItem value="bank_transfer">{t("paymentMethodBankTransfer")}</SelectItem>
                <SelectItem value="manual">{t("paymentMethodManual")}</SelectItem>
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
            <FormLabel>{t("paymentNotesLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("paymentNotesPlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
// jscpd:ignore-end
