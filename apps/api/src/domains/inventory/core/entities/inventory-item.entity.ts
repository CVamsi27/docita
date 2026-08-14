export interface InventoryItem {
  id: string;
  clinicId: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  minQuantity: number;
  unit: string;
  purchasePrice: number | null;
  sellingPrice: number | null;
  expiryDate: Date | null;
  batchNumber: string | null;
  supplier: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
