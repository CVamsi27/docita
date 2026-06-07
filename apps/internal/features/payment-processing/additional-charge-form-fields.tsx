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
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { guidedSetupPresetAmount } from "@/features/payment-processing/payment-processing-helpers";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type AdditionalChargeFormFieldsProps = Pick<PaymentProcessingPageViewModel, 'additionalChargeClinic' | 'additionalChargeForm'>;

export function AdditionalChargeFormFields({ additionalChargeClinic, additionalChargeForm }: AdditionalChargeFormFieldsProps) {
  return (
    <>
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
                <SelectItem value="GUIDED_SETUP">Guided setup</SelectItem>
                <SelectItem value="DATA_MIGRATION">Data migration</SelectItem>
                <SelectItem value="CUSTOM_TRAINING">Custom training</SelectItem>
                <SelectItem value="INTEGRATION">Integration</SelectItem>
                <SelectItem value="COMMERCIAL_DISCOUNT">Commercial discount / adjustment</SelectItem>
                <SelectItem value="OTHER">Other service</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Guided setup is separate from the software subscription. Default amount follows the list price for the clinic&apos;s currency; adjust to match your invoice.
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
            <FormLabel>Amount ({additionalChargeClinic?.currency || DEFAULT_CURRENCY})</FormLabel>
            <FormControl>
              <Input type="number" inputMode="decimal" min={0} step="1" placeholder="Enter amount" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
// jscpd:ignore-end
