import { Receipt } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";

import { InvoiceItem } from "@workspace/types";

interface InvoiceData {
  items?: InvoiceItem[];
  total?: number;
  status: string;
}

export function HistoryInvoice({ invoice }: { invoice: InvoiceData }) {
  if (!invoice) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Receipt className="h-4 w-4 text-orange-600" />
        Invoice
      </div>
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Total Amount</p>
            <p className="text-xs text-muted-foreground">
              {invoice.items?.length || 0} items
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">₹{invoice.total?.toFixed(2)}</p>
            <Badge
              variant={invoice.status === "paid" ? "default" : "secondary"}
            >
              {invoice.status}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
