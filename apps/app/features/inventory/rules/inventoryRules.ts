/**
 * Inventory Business Rules
 */

export const isLowStock = (quantity: number, minQuantity: number): boolean => {
  return quantity <= minQuantity;
};

export const isCriticalStock = (
  quantity: number,
  minQuantity: number,
): boolean => {
  return quantity < minQuantity * 0.5;
};

export const calculateReorderQuantity = (
  current: number,
  min: number,
  max: number,
): number => {
  return max - current;
};

export const canFulfillOrder = (
  available: number,
  requested: number,
): boolean => {
  return available >= requested;
};
