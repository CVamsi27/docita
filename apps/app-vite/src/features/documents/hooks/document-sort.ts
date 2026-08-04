import type { Document } from "@workspace/types";
import type { SortConfig, SortDirection, SortKey } from "./document-sort-types";

function lowerText(...values: Array<string | undefined>): string {
  return values.find((value) => value && value.length > 0)?.toLowerCase() ?? "";
}

const sortValueReaders: Record<SortKey, (document: Document) => string | number> = {
  date: (document) => new Date(document.createdAt).getTime(),
  patient: (document) => lowerText(document.patient?.name, document.patient?.firstName),
  type: (document) => lowerText(document.type),
  filename: (document) => lowerText(document.name, document.filename, document.title),
};

function compareSortValues(
  aValue: string | number,
  bValue: string | number,
  direction: SortDirection,
): number {
  const comparison = Number(aValue > bValue) - Number(aValue < bValue);
  return direction === "asc" ? comparison : -comparison;
}

export function sortDocuments(
  documents: Document[],
  sortConfig: SortConfig,
): Document[] {
  const readSortValue = sortValueReaders[sortConfig.key];
  return [...documents].sort((a, b) => {
    return compareSortValues(
      readSortValue(a),
      readSortValue(b),
      sortConfig.direction,
    );
  });
}
