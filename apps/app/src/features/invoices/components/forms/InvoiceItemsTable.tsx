import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { InvoiceItemCard, type InvoiceItem } from "./InvoiceItemsTableSections";
import { InvoiceItemRemoveButton } from "./invoice-item-remove-button";

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onUpdateItem: (index: number, field: string, value: string | number) => void;
  onRemoveItem: (index: number) => void;
  formatCurrency: (amount: number) => string;
}

export function InvoiceItemsTable({
  items,
  onUpdateItem,
  onRemoveItem,
  formatCurrency,
}: InvoiceItemsTableProps) {
  const { t } = useTranslation("Invoices");
  if (items.length === 0)
    return (
      <div className="rounded-md border px-4 py-8 text-center text-muted-foreground">
        {t("itemsTable.emptyMessage")}
      </div>
    );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((item, index) => (
          <InvoiceItemCard
            key={item.id}
            item={item}
            index={index}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain rounded-md border md:block">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-72">
                {t("itemsTable.colDescription")}
              </TableHead>
              <TableHead className="w-24">{t("itemsTable.colQty")}</TableHead>
              <TableHead className="w-32">
                {t("itemsTable.colUnitPrice")}
              </TableHead>
              <TableHead className="w-48">{t("itemsTable.colTax")}</TableHead>
              <TableHead className="w-28">
                {t("itemsTable.colGstPercent")}
              </TableHead>
              <TableHead className="w-32">
                {t("itemsTable.colHsnSac")}
              </TableHead>
              <TableHead className="w-32">{t("itemsTable.colTotal")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    value={item.description}
                    aria-label={t("itemsTable.colDescription")}
                    onChange={(e) =>
                      onUpdateItem(index, "description", e.target.value)
                    }
                    placeholder={t("itemsTable.itemDescriptionPlaceholder")}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    aria-label={t("itemsTable.colQty")}
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateItem(
                        index,
                        "quantity",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    aria-label={t("itemsTable.colUnitPrice")}
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      onUpdateItem(
                        index,
                        "unitPrice",
                        parseFloat(e.target.value),
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={item.taxTreatment}
                    onValueChange={(value) =>
                      onUpdateItem(index, "taxTreatment", value)
                    }
                  >
                    <SelectTrigger aria-label={t("itemsTable.colTax")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXEMPT_HEALTHCARE">
                        {t("itemsTable.taxHealthcareExempt")}
                      </SelectItem>
                      <SelectItem value="TAXABLE">
                        {t("itemsTable.taxTaxable")}
                      </SelectItem>
                      <SelectItem value="EXEMPT">
                        {t("itemsTable.taxExempt")}
                      </SelectItem>
                      <SelectItem value="NON_GST">
                        {t("itemsTable.taxNonGst")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    aria-label={t("itemsTable.colGstPercent")}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={item.taxTreatment !== "TAXABLE"}
                    value={item.taxRate}
                    onChange={(e) =>
                      onUpdateItem(index, "taxRate", parseFloat(e.target.value))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.hsnCode || item.sacCode || ""}
                    aria-label={t("itemsTable.colHsnSac")}
                    onChange={(e) =>
                      onUpdateItem(index, "hsnCode", e.target.value)
                    }
                    placeholder={t("itemsTable.hsnCodePlaceholder")}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(item.total)}
                </TableCell>
                <TableCell>
                  <InvoiceItemRemoveButton
                    description={item.description}
                    onClick={() => onRemoveItem(index)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
