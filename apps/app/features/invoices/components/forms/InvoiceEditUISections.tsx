"use client";

import type { Control } from "react-hook-form";
import type { InvoiceEditFormValues } from "@workspace/types";
import { InvoiceDetailsCard, InvoiceStatusField } from "./invoice-form-sections-shared";

export function InvoiceEditDetailsSection({
  control,
}: {
  control: Control<InvoiceEditFormValues>;
}) {
  return (
    <InvoiceDetailsCard>
      <InvoiceStatusField control={control} />
    </InvoiceDetailsCard>
  );
}
