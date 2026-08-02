import { PageMeta } from "@/components/layout/page-meta";
import { InventoryPageUI } from "@/features/inventory/components/InventoryPageUI";

export function InventoryPage() {
  return (
    <>
      <PageMeta title="Inventory" description="Track clinic inventory and supplies" />
      <InventoryPageUI />
    </>
  );
}
