// Facade that re-exports the public surface from the per-concern parsers
// folder. Consumers can either keep importing from this module (preserves
// the previous surface) or import directly from:
//   - parsers/excel-cell-parsers (getCell, sanitizeCellValue, isRowEmpty, toHeaderString)
//   - parsers/excel-row-parsers  (mapDataRows, trimTrailingEmptyCells, extractNormalizedRow)
export {
  type ExcelCellValue,
  getCell,
  sanitizeCellValue,
  isRowEmpty,
  toHeaderString,
} from './parsers/excel-cell-parsers';
export {
  mapDataRows,
  trimTrailingEmptyCells,
  extractNormalizedRow,
} from './parsers/excel-row-parsers';
