import type { FieldValues, Path } from "react-hook-form";
import type {
  CreateInvoiceFormValues,
  InvoiceEditFormValues,
} from "@workspace/types";

/** Dynamic invoice line-item field paths for react-hook-form `setValue`. */
export function invoiceItemFieldPath<TForm extends FieldValues>(
  index: number,
  fieldName: string,
): Path<TForm> {
  return `items.${index}.${fieldName}` as Path<TForm>;
}

export function createInvoiceItemFieldPath(
  index: number,
  fieldName: string,
): Path<CreateInvoiceFormValues> {
  return invoiceItemFieldPath<CreateInvoiceFormValues>(index, fieldName);
}

export function editInvoiceItemFieldPath(
  index: number,
  fieldName: string,
): Path<InvoiceEditFormValues> {
  return invoiceItemFieldPath<InvoiceEditFormValues>(index, fieldName);
}
