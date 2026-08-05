import type { FieldValues, Path } from "react-hook-form";
import { rhfPath } from "@workspace/ui/lib/rhf-path";

export function dynamicInvoiceItemPath<TForm extends FieldValues>(
  index: number,
  fieldName: string,
): Path<TForm> {
  return rhfPath<TForm>(`items.${index}.${fieldName}`);
}

export function invoiceDiscountFieldPath<
  TForm extends FieldValues & { discount: unknown },
>(): Path<TForm> {
  return rhfPath<TForm>("discount");
}
