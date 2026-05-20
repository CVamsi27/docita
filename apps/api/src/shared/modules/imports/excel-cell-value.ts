export type ExcelCellObject = {
  result?: unknown;
  text?: unknown;
  richText?: Array<{ text?: string }>;
};

function isExcelCellObject(value: object): value is ExcelCellObject {
  return 'result' in value || 'text' in value || 'richText' in value;
}

export function extractWorksheetRowCells(values: unknown): unknown[] {
  if (Array.isArray(values)) {
    return values.slice(1);
  }

  if (values && typeof values === 'object') {
    return Object.values(values);
  }

  return [];
}

export function readExcelCellObject(value: object): ExcelCellObject | null {
  return isExcelCellObject(value) ? value : null;
}
