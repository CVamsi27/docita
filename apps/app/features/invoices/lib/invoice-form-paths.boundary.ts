// check-as-cast-density: allow-file — react-hook-form Path cannot be built from dynamic segment strings without assertion
import type { FieldValues, Path } from "react-hook-form";

export function dynamicInvoiceItemPath<TForm extends FieldValues>(
  index: number,
  fieldName: string,
): Path<TForm> {
  return `items.${index}.${fieldName}` as Path<TForm>;
}

export function invoiceDiscountFieldPath<
  TForm extends FieldValues & { discount: unknown },
>(): Path<TForm> {
  return "discount" as Path<TForm>;
}
