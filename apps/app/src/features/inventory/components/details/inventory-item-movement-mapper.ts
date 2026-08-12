import { isRecord } from "@workspace/utils";
import type { ItemMovement } from "./InventoryItemDetailsUI";

export function toInventoryMovements(value: unknown): ItemMovement[] {
  return Array.isArray(value) ? value.flatMap(toInventoryMovement) : [];
}

function toInventoryMovement(entry: unknown): ItemMovement[] {
  if (!isValidMovementRecord(entry)) return [];
  const notes = stringField(entry.notes);
  return [
    {
      id: entry.id,
      type: entry.type,
      quantity: entry.quantity,
      createdAt: toMovementCreatedAt(entry.createdAt),
      ...(notes ? { notes } : {}),
    },
  ];
}

function isValidMovementRecord(entry: unknown): entry is Record<
  string,
  unknown
> & {
  id: string;
  type: string;
  quantity: number;
} {
  return (
    isRecord(entry) &&
    typeof entry.id === "string" &&
    typeof entry.type === "string" &&
    typeof entry.quantity === "number" &&
    toMovementCreatedAt(entry.createdAt).length > 0
  );
}

function toMovementCreatedAt(value: unknown): string {
  return dateField(value) ?? stringField(value) ?? "";
}

function dateField(value: unknown): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
