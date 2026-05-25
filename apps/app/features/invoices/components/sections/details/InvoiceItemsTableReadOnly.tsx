import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceItemsTableReadOnlyProps {
  items: InvoiceItem[];
  formatCurrency: (amount: number) => string;
}

export function InvoiceItemsTableReadOnly({
  items,
  formatCurrency,
}: InvoiceItemsTableReadOnlyProps) {
  const rows = items ?? [];

  return (
    <div className="rounded-lg border overflow-hidden mb-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Description</TableHead>
            <TableHead className="text-center w-24">Qty</TableHead>
            <TableHead className="text-right w-32">Price</TableHead>
            <TableHead className="text-right w-32">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.description}</TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.price)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.quantity * item.price)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
