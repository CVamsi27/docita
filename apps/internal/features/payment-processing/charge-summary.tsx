import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type ChargeSummaryProps = Pick<PaymentProcessingPageViewModel, 'additionalChargeForm'>;

/**
 * Phase 3 (per-feature): apps/internal Payment processing > Charge
 * summary. 7 literals converted to
 * useTranslations("InternalPaymentProcessing.chargeSummary").
 */
function useChargeSummaryTranslations() {
  return useTranslations("InternalPaymentProcessing.chargeSummary");
}

export function ChargeSummary({ additionalChargeForm }: ChargeSummaryProps) {
  const t = useChargeSummaryTranslations();
  return (
    <>
      <FormField
        control={additionalChargeForm.control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("paymentMethodLabel")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="razorpay">{t("paymentMethodRazorpay")}</SelectItem>
                <SelectItem value="stripe">{t("paymentMethodStripe")}</SelectItem>
                <SelectItem value="bank_transfer">{t("paymentMethodBank")}</SelectItem>
                <SelectItem value="manual">{t("paymentMethodManual")}</SelectItem>
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
            <FormLabel>{t("razorpayIdLabel")}</FormLabel>
            <FormControl>
              <Input placeholder={t("razorpayIdPlaceholder")} {...field} />
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
            <FormLabel>{t("notesLabel")}</FormLabel>
            <FormControl>
              <Textarea placeholder={t("notesPlaceholder")} rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
