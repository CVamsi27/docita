"use client";

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
  return (
    <div className="rounded-lg border overflow-hidden mb-6">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="py-3 px-4 text-left font-medium text-muted-foreground">
              Description
            </th>
            <th className="py-3 px-4 text-center font-medium text-muted-foreground w-24">
              Qty
            </th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground w-32">
              Price
            </th>
            <th className="py-3 px-4 text-right font-medium text-muted-foreground w-32">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(items || []).map((item, index: number) => (
            <tr key={index}>
              <td className="py-3 px-4">{item.description}</td>
              <td className="py-3 px-4 text-center">{item.quantity}</td>
              <td className="py-3 px-4 text-right">
                {formatCurrency(item.price)}
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatCurrency(item.quantity * item.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
