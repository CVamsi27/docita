import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";

interface InvoiceSubtotalProps<T extends FieldValues & { discount: number }> {
  control: Control<T>;
  totalAmount: number;
  formatCurrency: (amount: number) => string;
}

export function InvoiceSubtotal<T extends FieldValues & { discount: number }>({
  control,
  totalAmount,
  formatCurrency,
}: InvoiceSubtotalProps<T>) {
  return (
    <div className="flex flex-col items-end gap-4 mt-6">
      <div className="w-full max-w-[300px] space-y-4">
        <FormField
          control={control}
          name={"discount" as Path<T>}
          render={({ field }) => (
            <FormItem className="flex items-center justify-between space-y-0 gap-4">
              <FormLabel className="shrink-0">Discount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-[120px] text-right"
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="font-bold text-lg">Total Amount</span>
          <span className="font-bold text-lg text-primary">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
