import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { useTranslations } from "next-intl";
import { guidedSetupPresetAmount } from "@/features/payment-processing/payment-processing-helpers";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type AdditionalChargeFormFieldsProps = Pick<PaymentProcessingPageViewModel, 'additionalChargeClinic' | 'additionalChargeForm'>;

/**
 * Phase 3 (per-feature): apps/internal Payment processing > Additional
 * charge form fields. 8 literals converted to
 * useTranslations("InternalPaymentProcessing.additionalCharge").
 */
function useAdditionalChargeTranslations() {
  return useTranslations("InternalPaymentProcessing.additionalCharge");
}

export function AdditionalChargeFormFields({ additionalChargeClinic, additionalChargeForm }: AdditionalChargeFormFieldsProps) {
  const t = useAdditionalChargeTranslations();
  return (
    <>
      <FormField
        control={additionalChargeForm.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("categoryLabel")}</FormLabel>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                if (value === "GUIDED_SETUP") {
                  additionalChargeForm.setValue("amount", guidedSetupPresetAmount(additionalChargeClinic?.currency));
                }
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="GUIDED_SETUP">{t("categoryGuidedSetup")}</SelectItem>
                <SelectItem value="DATA_MIGRATION">{t("categoryDataMigration")}</SelectItem>
                <SelectItem value="CUSTOM_TRAINING">{t("categoryCustomTraining")}</SelectItem>
                <SelectItem value="INTEGRATION">{t("categoryIntegration")}</SelectItem>
                <SelectItem value="COMMERCIAL_DISCOUNT">{t("categoryCommercialDiscount")}</SelectItem>
                <SelectItem value="OTHER">{t("categoryOther")}</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              {t("categoryDescription")}
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
            <FormLabel>{t("amountLabel", { currency: additionalChargeClinic?.currency || DEFAULT_CURRENCY })}</FormLabel>
            <FormControl>
              <Input type="number" inputMode="decimal" min={0} step="1" placeholder={t("amountPlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
