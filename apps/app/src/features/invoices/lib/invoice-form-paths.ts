import type { Path } from "react-hook-form";
import type {
  CreateInvoiceFormValues,
  InvoiceEditFormValues,
} from "@workspace/types";
import { dynamicInvoiceItemPath } from "@/features/invoices/lib/invoice-form-paths.boundary";

/** Dynamic invoice line-item field paths for react-hook-form `setValue`. */
function invoiceItemFieldPath<TForm extends CreateInvoiceFormValues | InvoiceEditFormValues>(
  index: number,
  fieldName: string,
): Path<TForm> {
  return dynamicInvoiceItemPath<TForm>(index, fieldName);
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
