import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import type { InvoiceItem } from "@workspace/types";
import type { EditableInvoiceItemField } from "./edit-invoice-dialog-state";
import { InvoiceStatusSection } from "./InvoiceStatusSection";
import { InvoiceItemsSection } from "./InvoiceItemsSection";

export interface EditInvoiceDialogUIProps {
  open: boolean;
  patientName: string;
  items: InvoiceItem[];
  status: string;
  loading: boolean;
  statusOptions: Array<{ value: string; label: string }>;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (
    index: number,
    field: EditableInvoiceItemField,
    value: string | number,
  ) => void;
  onSubmit: () => void;
}

export function EditInvoiceDialogUI({
  open,
  patientName,
  items,
  status,
  loading,
  statusOptions,
  onOpenChange,
  onStatusChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onSubmit,
}: EditInvoiceDialogUIProps) {
  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit invoice"
      description={`Update invoice details for ${patientName}`}
      isLoading={loading}
      onSubmit={onSubmit}
      submitLabel={loading ? "Saving…" : "Save changes"}
      contentClassName="max-w-6xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-4">
        <InvoiceStatusSection
          status={status}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
        />
        <InvoiceItemsSection
          items={items}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
        />
      </div>
    </CRUDDialog>
  );
}
