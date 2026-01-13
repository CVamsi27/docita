import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Invoice } from "@workspace/types";

interface InvoiceHeaderProps {
  invoice: Invoice;
  formatDate: (date: Date | string) => string;
}

export function InvoiceHeader({ invoice, formatDate }: InvoiceHeaderProps) {
  return (
    <CardHeader className="flex flex-row justify-between items-start border-b pb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            D
          </div>
          <CardTitle className="text-xl">Docita Clinic</CardTitle>
        </div>
        <CardDescription className="mt-2 text-sm max-w-[250px]">
          123 Medical Center Dr.
          <br />
          Health City, HC 54321
          <br />
          Phone: +91 98765 43210
          <br />
          Email: billing@docita.com
        </CardDescription>
      </div>
      <div className="text-right">
        <h2 className="text-2xl font-bold text-primary mb-1">INVOICE</h2>
        <p className="text-sm font-medium text-muted-foreground">
          #{invoice.id}
        </p>
        <div className="mt-4 text-sm">
          <div className="flex justify-end gap-4">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">
              {invoice.createdAt ? formatDate(invoice.createdAt) : "N/A"}
            </span>
          </div>
          <div className="flex justify-end gap-4 mt-1">
            <span className="text-muted-foreground">Due Date:</span>
            <span className="font-medium">
              {invoice.updatedAt ? formatDate(invoice.updatedAt) : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
