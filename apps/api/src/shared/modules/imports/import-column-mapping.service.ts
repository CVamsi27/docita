import { Injectable } from '@nestjs/common';
import { PATIENT_FIELD_MAPPINGS } from '@workspace/utils';
import type { ExcelRow, MappedPatientData } from './import-types';
import type { TabularRow } from './import-file-parser.service';
import { ImportFileParserService } from './import-file-parser.service';

@Injectable()
export class ImportColumnMappingService {
  constructor(private readonly fileParser: ImportFileParserService) {}

  suggestFieldMapping(
    header: string,
  ): keyof typeof PATIENT_FIELD_MAPPINGS | null {
    const normalized = header.toLowerCase().trim();

    for (const [field, aliases] of Object.entries(PATIENT_FIELD_MAPPINGS)) {
      if (
        aliases.some(
          (alias) => normalized.includes(alias) || alias.includes(normalized),
        )
      ) {
        return field as keyof typeof PATIENT_FIELD_MAPPINGS;
      }
    }

    return null;
  }

  applyColumnMapping(
    row: ExcelRow,
    mapping: Record<string, string>,
  ): MappedPatientData {
    const result: MappedPatientData = {};

    for (const [excelCol, dbField] of Object.entries(mapping)) {
      if (row[excelCol] !== undefined && dbField) {
        (result as Record<string, string | number | Date | undefined>)[
          dbField
        ] = row[excelCol];
      }
    }

    return result;
  }

  mapDataRows(headers: string[], dataRows: TabularRow[]): ExcelRow[] {
    return this.fileParser.mapDataRows(headers, dataRows);
  }

  toHeaderString(value: string | number | Date | undefined): string {
    return this.fileParser.toHeaderString(value);
  }
}
